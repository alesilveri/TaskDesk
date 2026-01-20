import { app, BrowserWindow, Menu, Tray, nativeTheme, ipcMain, Notification, shell, globalShortcut, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import {
  openDb,
  createActivity,
  deleteActivity,
  listActivitiesByDate,
  updateActivity,
  listClients,
  searchClients,
  upsertClient,
  listRecentClients,
  listActivityHistory,
  searchActivities,
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
  getDurationPatterns,
  getSettings,
  setSettings,
  listTemplates,
  createTemplate,
  deleteTemplate,
  useTemplate,
} from './db';
import { exportMonthlyXlsx, exportMonthlyCopy } from './export';
import { createBackup, listBackups, restoreBackup } from './backup';
import { inspectCsv, importClientsFromCsv } from './csv';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: ReturnType<typeof openDb>;

const isDev = !app.isPackaged;
const devPort = Number(process.env.TASKDESK_DEV_SERVER_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? 5173);
let lastGapReminderDate: string | null = null;
const allowedExternalHosts = new Set(['github.com', 'www.github.com']);
const allowedDevOrigins = new Set([`http://127.0.0.1:${devPort}`, 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']);

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveBackupDir() {
  const settings = getSettings(db);
  return settings.backupDir ?? undefined;
}

async function loadRenderer() {
  if (!mainWindow) return;
  if (isDev) {
    const ports = Array.from(new Set([devPort, 5174, 5173]));
    for (const port of ports) {
      const url = `http://127.0.0.1:${port}`;
      try {
        await mainWindow.loadURL(url);
        console.log('[taskdesk:dev] loading renderer', url);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        return;
      } catch (error) {
        console.warn('[taskdesk:dev] load failed', { url, error });
      }
    }
    console.error('[taskdesk:dev] unable to load renderer');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function isAllowedNavigation(url: string) {
  if (url.startsWith('file://')) return true;
  try {
    const parsed = new URL(url);
    if (isDev && allowedDevOrigins.has(parsed.origin)) return true;
  } catch {
    return false;
  }
  return false;
}

function isAllowedExternalUrl(raw: string) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return false;
    return allowedExternalHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function setupNavigationGuards(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn('[taskdesk:security] blocked window.open', url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (isAllowedNavigation(url)) return;
    event.preventDefault();
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn('[taskdesk:security] blocked navigation', url);
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'TaskDesk',
    backgroundColor: '#0B0F14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  loadRenderer();
  setupNavigationGuards(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/tray.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostra/Nascondi',
      click: () => {
        if (!mainWindow) {
          createMainWindow();
          return;
        }
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Apri oggi',
      click: () => sendToRenderer('ui:navigate', 'day'),
    },
    {
      label: 'Nuova attivita',
      click: () => sendToRenderer('ui:quick-add'),
    },
    {
      label: 'Export mese',
      click: () => sendToRenderer('ui:export'),
    },
    { type: 'separator' },
    {
      label: 'Esci',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('TaskDesk');
  tray.setContextMenu(contextMenu);
}

function sendToRenderer(channel: string, payload?: unknown) {
  if (!mainWindow) createMainWindow();
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.webContents.send(channel, payload);
}

function createAppMenu() {
  const devViewItems: Electron.MenuItemConstructorOptions[] = isDev ? [{ role: 'reload' }, { role: 'toggleDevTools' }] : [];

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova attivita',
          accelerator: 'CommandOrControl+N',
          click: () => sendToRenderer('ui:quick-add'),
        },
        {
          label: 'Importa clienti',
          click: () => sendToRenderer('ui:navigate', 'clients'),
        },
        {
          label: 'Esporta mese (XLSX)',
          accelerator: 'CommandOrControl+E',
          click: () => sendToRenderer('ui:export'),
        },
        {
          label: 'Copia formato Gestore',
          accelerator: 'CommandOrControl+Shift+C',
          click: () => sendToRenderer('ui:copy-gestore'),
        },
        { type: 'separator' },
        {
          label: 'Backup e ripristino',
          click: () => sendToRenderer('ui:navigate', 'settings'),
        },
        {
          label: 'Preferenze',
          accelerator: 'CommandOrControl+,',
          click: () => sendToRenderer('ui:navigate', 'settings'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Oggi', click: () => sendToRenderer('ui:navigate', 'day') },
        { label: 'Settimana', click: () => sendToRenderer('ui:navigate', 'week') },
        { label: 'Mese', click: () => sendToRenderer('ui:navigate', 'month') },
        { label: 'Ricerca', click: () => sendToRenderer('ui:navigate', 'search') },
        { label: 'Clienti', click: () => sendToRenderer('ui:navigate', 'clients') },
        { label: 'Impostazioni', click: () => sendToRenderer('ui:navigate', 'settings') },
        { type: 'separator' },
        ...devViewItems,
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Reset filtri',
          click: () => sendToRenderer('ui:reset-filters'),
        },
        { type: 'separator' },
        {
          label: 'Apri cartella backup',
          click: () => {
            const target = resolveBackupDir() ?? path.join(app.getPath('userData'), 'backups');
            shell.openPath(target);
          },
        },
        {
          label: 'Apri cartella log',
          click: () => {
            shell.openPath(app.getPath('logs'));
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check aggiornamenti',
          click: () => handleCheckForUpdates(),
        },
        { role: 'about' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function handleCheckForUpdates() {
  if (!app.isPackaged) {
    dialog.showMessageBox({
      type: 'info',
      message: 'Check aggiornamenti disponibile solo nelle build rilasciate.',
    });
    return;
  }
  autoUpdater.checkForUpdatesAndNotify();
}

function scheduleGapReminder() {
  const check = () => {
    if (!db) return;
    const settings = getSettings(db);
    if (settings.gapReminderMinutes <= 0) return;
    const now = new Date();
    if (now.getHours() < 18) return;
    const key = formatDateKey(now);
    if (lastGapReminderDate === key) return;
    const summary = getDailySummary(db, key);
    const gap = Math.max(settings.dailyTargetMinutes - summary.totalMinutes, 0);
    if (gap >= settings.gapReminderMinutes) {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Gap attivita da chiudere',
          body: `Ti mancano ${Math.round(gap)} minuti per il target di oggi.`,
        }).show();
      }
      lastGapReminderDate = key;
    }
  };

  setInterval(check, 30 * 60 * 1000);
  check();
}

function applyAutoStartSetting(enabled: boolean) {
  app.setLoginItemSettings({ openAtLogin: enabled });
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify();
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    sendToRenderer('ui:quick-add');
  });
}

function registerIpc() {
  ipcMain.handle('activities:list', (_event, date: string) => listActivitiesByDate(db, date));
  ipcMain.handle('activities:search', (_event, filters) => searchActivities(db, filters));
  ipcMain.handle('activities:history', (_event, id: string) => listActivityHistory(db, id));
  ipcMain.handle('activities:create', (_event, input) => createActivity(db, input));
  ipcMain.handle('activities:update', (_event, id: string, input) => updateActivity(db, id, input));
  ipcMain.handle('activities:remove', (_event, id: string) => deleteActivity(db, id));

  ipcMain.handle('clients:list', () => listClients(db));
  ipcMain.handle('clients:recent', () => listRecentClients(db));
  ipcMain.handle('clients:search', (_event, term: string) => searchClients(db, term));
  ipcMain.handle('clients:upsert', (_event, name: string) => upsertClient(db, name));
  ipcMain.handle('clients:inspectCsv', async (_event, filePath: string) => inspectCsv(filePath));
  ipcMain.handle('clients:importCsv', async (_event, filePath: string, column: string) => importClientsFromCsv(db, filePath, column));

  ipcMain.handle('templates:list', () => listTemplates(db));
  ipcMain.handle('templates:create', (_event, input) => createTemplate(db, input));
  ipcMain.handle('templates:remove', (_event, id: string) => deleteTemplate(db, id));
  ipcMain.handle('templates:use', (_event, id: string) => useTemplate(db, id));

  ipcMain.handle('summaries:daily', (_event, date: string) => getDailySummary(db, date));
  ipcMain.handle('summaries:weekly', (_event, startDate: string, endDate: string) => getWeeklySummary(db, startDate, endDate));
  ipcMain.handle('summaries:monthly', (_event, month: string) => getMonthlySummary(db, month));
  ipcMain.handle('summaries:patterns', (_event, days: number) => getDurationPatterns(db, days));

  ipcMain.handle('exports:monthly', async (_event, month: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Esporta mese',
      defaultPath: `TaskDesk-${month}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;
    return exportMonthlyXlsx(db, month, filePath);
  });
  ipcMain.handle('exports:monthlyCopy', (_event, month: string) => exportMonthlyCopy(db, month));

  ipcMain.handle('backup:create', (_event, targetDir?: string) => createBackup(targetDir ?? resolveBackupDir()));
  ipcMain.handle('backup:list', () => listBackups(resolveBackupDir()));
  ipcMain.handle('backup:pick', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Ripristina backup',
      properties: ['openFile'],
      filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
  });
  ipcMain.handle('backup:restore', (_event, backupPath: string) => {
    if (db) db.close();
    const restored = restoreBackup(backupPath);
    db = openDb();
    return restored;
  });
  ipcMain.handle('backup:getDir', () => getSettings(db).backupDir ?? null);
  ipcMain.handle('backup:setDir', (_event, dir: string | null) => {
    setSettings(db, { backupDir: dir });
  });
  ipcMain.handle('backup:chooseDir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Seleziona cartella backup',
      properties: ['openDirectory'],
    });
    if (canceled || filePaths.length === 0) return null;
    const selected = filePaths[0];
    setSettings(db, { backupDir: selected });
    return selected;
  });
  ipcMain.handle('backup:openDir', () => {
    const target = resolveBackupDir() ?? path.join(app.getPath('userData'), 'backups');
    shell.openPath(target);
  });

  ipcMain.handle('settings:get', () => getSettings(db));
  ipcMain.handle('settings:set', (_event, partial) => {
    const updated = setSettings(db, partial);
    if (typeof partial?.autoStart === 'boolean') {
      applyAutoStartSetting(updated.autoStart);
    }
    return updated;
  });

  ipcMain.handle('system:theme', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));
  ipcMain.handle('system:notify', (_event, options) => {
    if (Notification.isSupported()) {
      new Notification(options).show();
    }
  });

  ipcMain.handle('system:openExternal', (_event, url: string) => {
    if (!isAllowedExternalUrl(url)) {
      console.warn('[taskdesk:security] blocked openExternal', url);
      return false;
    }
    return shell.openExternal(url);
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.taskdesk.app');
  db = openDb();
  applyAutoStartSetting(getSettings(db).autoStart);
  createMainWindow();
  createTray();
  createAppMenu();
  registerShortcuts();
  registerIpc();
  scheduleGapReminder();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
