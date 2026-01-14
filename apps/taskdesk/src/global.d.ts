import type {
  Activity,
  ActivityInput,
  DailySummary,
  WeeklySummary,
  MonthlySummary,
  Client,
  BackupInfo,
  ActivityHistory,
  AppSettings,
  ActivityStatus,
} from './types';

declare global {
  interface Window {
    api: {
      activities: {
        list: (date: string) => Promise<Activity[]>;
        search: (filters: {
          text?: string;
          client?: string;
          status?: ActivityStatus | 'all';
          startDate?: string;
          endDate?: string;
          onlyNotInserted?: boolean;
        }) => Promise<Activity[]>;
        history: (id: string) => Promise<ActivityHistory[]>;
        create: (input: ActivityInput) => Promise<Activity>;
        update: (id: string, input: Partial<ActivityInput>) => Promise<Activity | null>;
        remove: (id: string) => Promise<boolean>;
      };
      clients: {
        list: () => Promise<Client[]>;
        recent: () => Promise<Client[]>;
        search: (term: string) => Promise<Client[]>;
        upsert: (name: string) => Promise<Client>;
        inspectCsv: (filePath: string) => Promise<{ headers: string[]; sample: Record<string, string>[] }>;
        importCsv: (filePath: string, column: string) => Promise<{ inserted: number; skipped: number }>;
      };
      summaries: {
        daily: (date: string) => Promise<DailySummary>;
        weekly: (startDate: string, endDate: string) => Promise<WeeklySummary>;
        monthly: (month: string) => Promise<MonthlySummary>;
        patterns: (days: number) => Promise<number[]>;
      };
      exports: {
        monthly: (month: string) => Promise<string | null>;
        monthlyCsv: (month: string) => Promise<string | null>;
      };
      backup: {
        create: (targetDir?: string) => Promise<string>;
        list: () => Promise<BackupInfo[]>;
        pick: () => Promise<string | null>;
        restore: (backupPath: string) => Promise<string>;
        getDir: () => Promise<string | null>;
        setDir: (dir: string | null) => Promise<void>;
        openDir: () => Promise<void>;
        chooseDir: () => Promise<string | null>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
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
        onResetFilters: (callback: () => void) => void;
      };
    };
  }
}

export {};
