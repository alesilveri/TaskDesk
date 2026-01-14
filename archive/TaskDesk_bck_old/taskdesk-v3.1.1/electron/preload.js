const { contextBridge, ipcRenderer } = require('electron');

function fromIpc(channel, callback) {
  const listener = (_, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('api', {
  activities: {
    list: (params) => ipcRenderer.invoke('activities:list', params),
    get: (id) => ipcRenderer.invoke('activities:get', id),
    create: (input) => ipcRenderer.invoke('activities:create', input),
    update: (id, input) => ipcRenderer.invoke('activities:update', id, input),
    remove: (id) => ipcRenderer.invoke('activities:remove', id),
    events: (id) => ipcRenderer.invoke('activities:events', id),
    onChanged: (callback) => fromIpc('activities:changed', callback),
  },
  clients: {
    list: (params) => ipcRenderer.invoke('clients:list', params),
    get: (id) => ipcRenderer.invoke('clients:get', id),
    create: (input) => ipcRenderer.invoke('clients:create', input),
    update: (id, input) => ipcRenderer.invoke('clients:update', id, input),
    remove: (id) => ipcRenderer.invoke('clients:remove', id),
    autocomplete: (term) => ipcRenderer.invoke('clients:autocomplete', term),
    importCSV: (filePath) => ipcRenderer.invoke('clients:import-csv', filePath),
    exportCSV: (filePath) => ipcRenderer.invoke('clients:export-csv', filePath),
    onChanged: (callback) => fromIpc('clients:changed', callback),
  },
  summaries: {
    daily: (date) => ipcRenderer.invoke('summaries:daily', date),
    monthly: (month) => ipcRenderer.invoke('summaries:monthly', month),
  },
  exports: {
    excel: (payload) => ipcRenderer.invoke('exports:excel', payload),
    pdf: (payload) => ipcRenderer.invoke('exports:pdf', payload),
  },
  backup: {
    create: (targetDirectory) => ipcRenderer.invoke('backup:create', targetDirectory),
    restore: (sourcePath) => ipcRenderer.invoke('backup:restore', sourcePath),
  },
  system: {
    theme: () => ipcRenderer.invoke('system:theme'),
    setTheme: (theme) => ipcRenderer.invoke('system:set-theme', theme),
    notify: (options) => ipcRenderer.invoke('system:notify', options),
    onThemeChange: (callback) => fromIpc('system:theme-changed', callback),
  },
  window: {
    openQuickAdd: (preset) => ipcRenderer.invoke('window:openQuickAdd', preset),
    closeQuickAdd: () => ipcRenderer.invoke('window:closeQuickAdd'),
    onQuickAddPreset: (callback) => fromIpc('quick-add:preset', callback),
  },
  commands: {
    onExportExcel: (callback) => fromIpc('command:export-excel', callback),
    onExportPdf: (callback) => fromIpc('command:export-pdf', callback),
  },
});

