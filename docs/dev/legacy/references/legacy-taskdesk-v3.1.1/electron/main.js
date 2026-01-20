const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeTheme,
  dialog,
  globalShortcut,
} = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const db = require('./db');
const { exportMonthToExcel, exportMonthToPdf } = require('./services/exporters');
const { createBackup, restoreBackup } = require('./services/backup');
const { importClientsFromCSV, exportClientsToCSV } = require('./services/csv');
const { showNotification } = require('./services/notifications');

const isDev = !app.isPackaged;

let mainWindow;
let quickAddWindow;
let tray;
let pendingQuickAddPreset = null;

function resolveURL(hashPath = '') {
  const suffix = hashPath ? `#/${hashPath}` : '';
  if (isDev) {
    return `http://localhost:5173/${suffix}`;
  }
  const indexPath = path.join(__dirname, '../dist-web/index.html');
  return `${pathToFileURL(indexPath).toString()}${suffix}`;
}

function getIcon() {
  if (process.platform === 'win32') {
    return path.join(__dirname, '../build/icon.ico');
  }
  if (process.platform === 'darwin') {
    return path.join(__dirname, '../build/icon.icns');
  }
  return path.join(__dirname, '../build/icon.png');
}

function createMainWindow() {
  const windowOptions = {
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    title: 'TaskDesk',
    icon: getIcon(),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1115' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  };
  if (process.platform === 'darwin') {
    windowOptions.trafficLightPosition = { x: 16, y: 18 };
    windowOptions.titleBarStyle = 'hiddenInset';
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadURL(resolveURL('dashboard'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickAddWindow(preset) {
  if (quickAddWindow) {
    pendingQuickAddPreset = preset || null;
    quickAddWindow.focus();
    if (pendingQuickAddPreset) {
      quickAddWindow.webContents.send('quick-add:preset', pendingQuickAddPreset);
    }
    return;
  }
  pendingQuickAddPreset = preset || null;

  const windowOptions = {
    width: 480,
    height: 560,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: process.platform !== 'darwin',
    show: false,
    icon: getIcon(),
    parent: mainWindow || undefined,
    modal: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1115' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  };
  if (process.platform === 'darwin') {
    windowOptions.trafficLightPosition = { x: 12, y: 12 };
    windowOptions.titleBarStyle = 'hiddenInset';
  }

  quickAddWindow = new BrowserWindow(windowOptions);

  quickAddWindow.loadURL(resolveURL('quick-add'));
  quickAddWindow.once('ready-to-show', () => {
    quickAddWindow.show();
    if (pendingQuickAddPreset) {
      quickAddWindow.webContents.send('quick-add:preset', pendingQuickAddPreset);
    }
  });
  quickAddWindow.on('closed', () => {
    quickAddWindow = null;
    pendingQuickAddPreset = null;
  });
}

function closeQuickAddWindow() {
  if (quickAddWindow) {
    quickAddWindow.close();
  }
}

function setApplicationMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'quit' }],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova attività',
          accelerator: 'CommandOrControl+N',
          click: () => openQuickAdd(),
        },
        { type: 'separator' },
        {
          label: 'Esporta mese corrente (Excel)',
          click: () => mainWindow?.webContents.send('command:export-excel'),
        },
        {
          label: 'Esporta mese corrente (PDF)',
          click: () => mainWindow?.webContents.send('command:export-pdf'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Visualizza',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }],
    },
    {
      label: 'Finestra',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'close' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  tray = new Tray(getIcon());
  tray.setToolTip('TaskDesk');
  tray.on('double-click', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Apri TaskDesk',
      click: () => {
        if (!mainWindow) {
          createMainWindow();
        } else {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Nuova attività',
      click: () => openQuickAdd(),
    },
    {
      label: 'Backup rapido',
      click: async () => {
        try {
          const filePath = createBackup(db.databasePath());
          showNotification({ title: 'Backup completato', body: `Backup salvato in ${filePath}` });
        } catch (err) {
          showNotification({ title: 'Backup non riuscito', body: err.message });
        }
      },
    },
    { type: 'separator' },
    { label: 'Esporta mese corrente (Excel)', click: () => mainWindow?.webContents.send('command:export-excel') },
    { label: 'Esporta mese corrente (PDF)', click: () => mainWindow?.webContents.send('command:export-pdf') },
    { type: 'separator' },
    { label: 'Esci', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+N', () => openQuickAdd());
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

function broadcast(channel, payload) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, payload);
  }
  if (quickAddWindow) {
    quickAddWindow.webContents.send(channel, payload);
  }
}

function openQuickAdd(preset = null) {
  createQuickAddWindow(preset);
}

function getThemePreference() {
  const stored = db.getSetting('theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  if (stored === 'system' || !stored) {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function getThemeState() {
  const preference = db.getSetting('theme') || 'system';
  const current = getThemePreference();
  return { current, preference };
}

function applyThemePreference() {
  const stored = db.getSetting('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    nativeTheme.themeSource = stored;
  } else {
    nativeTheme.themeSource = 'system';
  }
}

function setupThemeBroadcast() {
  const notify = () => broadcast('system:theme-changed', getThemePreference());
  notify();
  nativeTheme.on('updated', () => {
    if (db.getSetting('theme') === 'system' || !db.getSetting('theme')) {
      notify();
    }
  });
}

async function ensureTargetPath(extension, defaultFileName, providedPath) {
  if (providedPath) {
    return providedPath;
  }
  const parent = BrowserWindow.getFocusedWindow() || mainWindow;
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: defaultFileName,
    filters: [
      {
        name: extension.toUpperCase(),
        extensions: [extension],
      },
    ],
  });
  if (canceled || !filePath) {
    return null;
  }
  return filePath;
}

function registerIpcHandlers() {
  ipcMain.handle('activities:list', (_, params) => db.listActivities(params));
  ipcMain.handle('activities:get', (_, id) => db.getActivity(id));
  ipcMain.handle('activities:create', (_, input) => {
    const activity = db.createActivity(input);
    broadcast('activities:changed', { type: 'created', payload: activity });
    return activity;
  });
  ipcMain.handle('activities:update', (_, id, input) => {
    const activity = db.updateActivity(id, input);
    broadcast('activities:changed', { type: 'updated', payload: activity });
    return activity;
  });
  ipcMain.handle('activities:remove', (_, id) => {
    db.removeActivity(id);
    broadcast('activities:changed', { type: 'removed', payload: { id } });
    return { id };
  });
  ipcMain.handle('activities:events', (_, id) => db.listActivityEvents(id));

  ipcMain.handle('clients:list', (_, params) => db.listClients(params));
  ipcMain.handle('clients:get', (_, id) => db.getClient(id));
  ipcMain.handle('clients:create', (_, input) => {
    const client = db.createClient(input);
    broadcast('clients:changed', { type: 'created', payload: client });
    return client;
  });
  ipcMain.handle('clients:update', (_, id, input) => {
    const client = db.updateClient(id, input);
    broadcast('clients:changed', { type: 'updated', payload: client });
    return client;
  });
  ipcMain.handle('clients:remove', (_, id) => {
    db.removeClient(id);
    broadcast('clients:changed', { type: 'removed', payload: { id } });
    return { id };
  });
  ipcMain.handle('clients:autocomplete', (_, term) => db.autocompleteClients(term));

  ipcMain.handle('clients:import-csv', async (_, filePath) => {
    let targetPath = filePath;
    if (!targetPath) {
      const parent = BrowserWindow.getFocusedWindow() || mainWindow;
      const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
        title: 'Importa clienti da CSV',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        properties: ['openFile'],
      });
      if (canceled || !filePaths?.length) {
        return null;
      }
      targetPath = filePaths[0];
    }
    return importClientsFromCSV(targetPath, {
      findByName: (name) => db.getClientByName(name),
      createClient: (data) => db.createClient(data),
    });
  });

  ipcMain.handle('clients:export-csv', async (_, filePath) => {
    const targets = db.listClients({ active: 'all' });
    const finalPath = await ensureTargetPath('csv', 'taskdesk-clienti.csv', filePath);
    if (!finalPath) {
      return null;
    }
    exportClientsToCSV(finalPath, targets);
    return finalPath;
  });

  ipcMain.handle('summaries:daily', (_, date) => db.getDailySnapshot(date));
  ipcMain.handle('summaries:monthly', (_, month) => db.getMonthlySummary(month));

  ipcMain.handle('exports:excel', async (_, { month, targetPath }) => {
    const summary = db.getMonthlySummary(month);
    const filePath = await ensureTargetPath('xlsx', `taskdesk-${month}.xlsx`, targetPath);
    if (!filePath) {
      return null;
    }
    await exportMonthToExcel({ month, summary, activities: summary.activities, filePath });
    showNotification({ title: 'Esportazione completata', body: `File Excel salvato in ${filePath}` });
    return filePath;
  });

  ipcMain.handle('exports:pdf', async (_, { month, targetPath }) => {
    const summary = db.getMonthlySummary(month);
    const filePath = await ensureTargetPath('pdf', `taskdesk-${month}.pdf`, targetPath);
    if (!filePath) {
      return null;
    }
    await exportMonthToPdf({ month, summary, activities: summary.activities, filePath });
    showNotification({ title: 'Esportazione completata', body: `File PDF salvato in ${filePath}` });
    return filePath;
  });

  ipcMain.handle('backup:create', async (_, targetDirectory) => {
    const destination = createBackup(db.databasePath(), targetDirectory);
    showNotification({ title: 'Backup completato', body: destination });
    return destination;
  });
  ipcMain.handle('backup:restore', async (_, sourcePath) => {
    const destination = restoreBackup(sourcePath, db.databasePath());
    broadcast('activities:changed', { type: 'refresh' });
    broadcast('clients:changed', { type: 'refresh' });
    showNotification({ title: 'Backup ripristinato', body: destination });
    return destination;
  });

  ipcMain.handle('system:theme', () => getThemeState());
  ipcMain.handle('system:set-theme', (_, theme) => {
    const valid = ['light', 'dark', 'system'];
    const nextTheme = valid.includes(theme) ? theme : 'system';
    db.setSetting('theme', nextTheme);
    nativeTheme.themeSource = nextTheme;
    const state = getThemeState();
    broadcast('system:theme-changed', state.current);
    return state;
  });
  ipcMain.handle('system:notify', (_, options) => showNotification(options));

  ipcMain.handle('window:openQuickAdd', (_, preset) => {
    openQuickAdd(preset);
  });
  ipcMain.handle('window:closeQuickAdd', () => closeQuickAddWindow());
}

app.on('ready', () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.sileri.taskdesk');
  }
  db.init();
  applyThemePreference();
  createMainWindow();
  setApplicationMenu();
  createTray();
  registerIpcHandlers();
  registerGlobalShortcuts();
  setupThemeBroadcast();
});

app.on('browser-window-focus', () => {
  nativeTheme.themeSource = db.getSetting('theme') || 'system';
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  unregisterShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
