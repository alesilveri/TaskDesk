import { contextBridge, ipcRenderer } from 'electron';

const api = {
  activities: {
    list: (date: string) => ipcRenderer.invoke('activities:list', date),
    search: (filters: Record<string, unknown>) => ipcRenderer.invoke('activities:search', filters),
    history: (id: string) => ipcRenderer.invoke('activities:history', id),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('activities:create', input),
    update: (id: string, input: Record<string, unknown>) => ipcRenderer.invoke('activities:update', id, input),
    remove: (id: string) => ipcRenderer.invoke('activities:remove', id),
  },
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    recent: () => ipcRenderer.invoke('clients:recent'),
    search: (term: string) => ipcRenderer.invoke('clients:search', term),
    upsert: (name: string) => ipcRenderer.invoke('clients:upsert', name),
    inspectCsv: (filePath: string) => ipcRenderer.invoke('clients:inspectCsv', filePath),
    importCsv: (filePath: string, column: string) => ipcRenderer.invoke('clients:importCsv', filePath, column),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('templates:create', input),
    remove: (id: string) => ipcRenderer.invoke('templates:remove', id),
    use: (id: string) => ipcRenderer.invoke('templates:use', id),
  },
  summaries: {
    daily: (date: string) => ipcRenderer.invoke('summaries:daily', date),
    weekly: (startDate: string, endDate: string) => ipcRenderer.invoke('summaries:weekly', startDate, endDate),
    monthly: (month: string) => ipcRenderer.invoke('summaries:monthly', month),
    patterns: (days: number) => ipcRenderer.invoke('summaries:patterns', days),
  },
  exports: {
    monthly: (month: string) => ipcRenderer.invoke('exports:monthly', month),
    monthlyCopy: (month: string) => ipcRenderer.invoke('exports:monthlyCopy', month),
  },
  backup: {
    create: (targetDir?: string) => ipcRenderer.invoke('backup:create', targetDir),
    list: () => ipcRenderer.invoke('backup:list'),
    pick: () => ipcRenderer.invoke('backup:pick'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    getDir: () => ipcRenderer.invoke('backup:getDir'),
    setDir: (dir: string | null) => ipcRenderer.invoke('backup:setDir', dir),
    openDir: () => ipcRenderer.invoke('backup:openDir'),
    chooseDir: () => ipcRenderer.invoke('backup:chooseDir'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:set', settings),
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
    onCopyGestore: (callback: () => void) => ipcRenderer.on('ui:copy-gestore', () => callback()),
    onResetFilters: (callback: () => void) => ipcRenderer.on('ui:reset-filters', () => callback()),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type TaskDeskAPI = typeof api;
