import { app, BrowserWindow, Menu, Tray, nativeTheme, ipcMain, Notification, shell, globalShortcut, dialog } from 'electron';
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
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
} from './db';
import { exportMonthlyXlsx } from './export';
import { createBackup, listBackups, restoreBackup } from './backup';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: ReturnType<typeof openDb>;

const isDev = !app.isPackaged;
const devPort = Number(process.env.TASKDESK_DEV_SERVER_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? 5173);
const rendererUrl = `http://localhost:${devPort}`;

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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/tray.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Apri oggi',
      click: () => {
        if (!mainWindow) createMainWindow();
        mainWindow?.show();
        mainWindow?.webContents.send('ui:navigate', 'day');
      },
    },
    {
      label: 'Nuova attivita',
      click: () => {
        if (!mainWindow) createMainWindow();
        mainWindow?.show();
        mainWindow?.webContents.send('ui:quick-add');
      },
    },
    {
      label: 'Export mese',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('ui:export');
      },
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

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (!mainWindow) createMainWindow();
    mainWindow?.show();
    mainWindow?.webContents.send('ui:quick-add');
  });
}

function registerIpc() {
  ipcMain.handle('activities:list', (_event, date: string) => listActivitiesByDate(db, date));
  ipcMain.handle('activities:create', (_event, input) => createActivity(db, input));
  ipcMain.handle('activities:update', (_event, id: string, input) => updateActivity(db, id, input));
  ipcMain.handle('activities:remove', (_event, id: string) => deleteActivity(db, id));

  ipcMain.handle('clients:list', () => listClients(db));
  ipcMain.handle('clients:search', (_event, term: string) => searchClients(db, term));
  ipcMain.handle('clients:upsert', (_event, name: string) => upsertClient(db, name));

  ipcMain.handle('summaries:daily', (_event, date: string) => getDailySummary(db, date));
  ipcMain.handle('summaries:weekly', (_event, startDate: string, endDate: string) => getWeeklySummary(db, startDate, endDate));
  ipcMain.handle('summaries:monthly', (_event, month: string) => getMonthlySummary(db, month));

  ipcMain.handle('exports:monthly', async (_event, month: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Esporta mese',
      defaultPath: `TaskDesk-${month}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;
    return exportMonthlyXlsx(db, month, filePath);
  });

  ipcMain.handle('backup:create', (_event, targetDir?: string) => createBackup(targetDir));
  ipcMain.handle('backup:list', () => listBackups());
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
  createMainWindow();
  createTray();
  registerShortcuts();
  registerIpc();

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
