import type { Activity, ActivityInput, DailySummary, WeeklySummary, MonthlySummary, Client, BackupInfo } from './types';

declare global {
  interface Window {
    api: {
      activities: {
        list: (date: string) => Promise<Activity[]>;
        create: (input: ActivityInput) => Promise<Activity>;
        update: (id: string, input: Partial<ActivityInput>) => Promise<Activity | null>;
        remove: (id: string) => Promise<boolean>;
      };
      clients: {
        list: () => Promise<Client[]>;
        search: (term: string) => Promise<Client[]>;
        upsert: (name: string) => Promise<Client>;
      };
      summaries: {
        daily: (date: string) => Promise<DailySummary>;
        weekly: (startDate: string, endDate: string) => Promise<WeeklySummary>;
        monthly: (month: string) => Promise<MonthlySummary>;
      };
      exports: {
        monthly: (month: string) => Promise<string | null>;
      };
      backup: {
        create: (targetDir?: string) => Promise<string>;
        list: () => Promise<BackupInfo[]>;
        pick: () => Promise<string | null>;
        restore: (backupPath: string) => Promise<string>;
      };
      system: {
        theme: () => Promise<'light' | 'dark'>;
        notify: (options: { title: string; body: string }) => Promise<void>;
        openExternal: (url: string) => Promise<void>;
      };
      ui: {
        onNavigate: (callback: (view: string) => void) => void;
        onQuickAdd: (callback: () => void) => void;
        onExport: (callback: () => void) => void;
      };
    };
  }
}

export {};
