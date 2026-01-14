import { contextBridge, ipcRenderer } from 'electron';

const api = {
  activities: {
    list: (date: string) => ipcRenderer.invoke('activities:list', date),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('activities:create', input),
    update: (id: string, input: Record<string, unknown>) => ipcRenderer.invoke('activities:update', id, input),
    remove: (id: string) => ipcRenderer.invoke('activities:remove', id),
  },
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    search: (term: string) => ipcRenderer.invoke('clients:search', term),
    upsert: (name: string) => ipcRenderer.invoke('clients:upsert', name),
  },
  summaries: {
    daily: (date: string) => ipcRenderer.invoke('summaries:daily', date),
    weekly: (startDate: string, endDate: string) => ipcRenderer.invoke('summaries:weekly', startDate, endDate),
    monthly: (month: string) => ipcRenderer.invoke('summaries:monthly', month),
  },
  exports: {
    monthly: (month: string) => ipcRenderer.invoke('exports:monthly', month),
  },
  backup: {
    create: (targetDir?: string) => ipcRenderer.invoke('backup:create', targetDir),
    list: () => ipcRenderer.invoke('backup:list'),
    pick: () => ipcRenderer.invoke('backup:pick'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
  },
  system: {
    theme: () => ipcRenderer.invoke('system:theme'),
    notify: (options: { title: string; body: string }) => ipcRenderer.invoke('system:notify', options),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  },
  ui: {
    onNavigate: (callback: (view: string) => void) => ipcRenderer.on('ui:navigate', (_event, view) => callback(view)),
    onQuickAdd: (callback: () => void) => ipcRenderer.on('ui:quick-add', () => callback()),
    onExport: (callback: () => void) => ipcRenderer.on('ui:export', () => callback()),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type TaskDeskAPI = typeof api;
