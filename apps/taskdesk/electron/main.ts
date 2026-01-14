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
} from './db';
import { exportMonthlyXlsx, exportMonthlyCsv } from './export';
import { createBackup, listBackups, restoreBackup } from './backup';
import { inspectCsv, importClientsFromCsv } from './csv';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: ReturnType<typeof openDb>;

const isDev = !app.isPackaged;
const devPort = Number(process.env.TASKDESK_DEV_SERVER_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? 5173);
let lastGapReminderDate: string | null = null;

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
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'TaskDesk',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Impostazioni',
          click: () => sendToRenderer('ui:navigate', 'settings'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova attivita',
          accelerator: 'CommandOrControl+N',
          click: () => sendToRenderer('ui:quick-add'),
        },
        {
          label: 'Export mese',
          accelerator: 'CommandOrControl+E',
          click: () => sendToRenderer('ui:export'),
        },
        {
          label: 'Backup',
          click: () => sendToRenderer('ui:navigate', 'settings'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Vai a',
      submenu: [
        { label: 'Oggi', click: () => sendToRenderer('ui:navigate', 'day') },
        { label: 'Settimana', click: () => sendToRenderer('ui:navigate', 'week') },
        { label: 'Mese', click: () => sendToRenderer('ui:navigate', 'month') },
        { label: 'Clienti', click: () => sendToRenderer('ui:navigate', 'clients') },
      ],
    },
    {
      label: 'Strumenti',
      submenu: [
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
        { type: 'separator' },
        {
          label: 'Reset filtri',
          click: () => sendToRenderer('ui:reset-filters'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
  ipcMain.handle('exports:monthlyCsv', async (_event, month: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Esporta CSV mese',
      defaultPath: `TaskDesk-${month}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return null;
    return exportMonthlyCsv(db, month, filePath);
  });

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

  ipcMain.handle('system:openExternal', (_event, url: string) => shell.openExternal(url));
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
