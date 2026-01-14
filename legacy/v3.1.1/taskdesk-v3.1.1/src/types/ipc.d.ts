import type {
  Activity,
  ActivityFilters,
  ActivityInput,
  ActivityEvent,
  ActivitiesChangeEvent,
  Client,
  ClientFilters,
  ClientInput,
  ClientsChangeEvent,
  DailySnapshot,
  MonthlySummary,
  NotificationPayload,
  ThemeState,
} from '../types';

type Unsubscribe = () => void;

interface TaskDeskAPI {
  activities: {
    list(params?: ActivityFilters): Promise<Activity[]>;
    get(id: string): Promise<Activity | null>;
    create(input: ActivityInput): Promise<Activity>;
    update(id: string, input: Partial<ActivityInput>): Promise<Activity>;
    remove(id: string): Promise<{ id: string }>;
    events(id: string): Promise<ActivityEvent[]>;
    onChanged(callback: (event: ActivitiesChangeEvent) => void): Unsubscribe;
  };
  clients: {
    list(params?: ClientFilters): Promise<Client[]>;
    get(id: string): Promise<Client | null>;
    create(input: ClientInput): Promise<Client>;
    update(id: string, input: Partial<ClientInput>): Promise<Client>;
    remove(id: string): Promise<{ id: string }>;
    autocomplete(term: string): Promise<Array<{ id: string; name: string }>>;
    importCSV(filePath?: string): Promise<{ imported: number; skipped: number; total: number } | null>;
    exportCSV(filePath?: string): Promise<string | null>;
    onChanged(callback: (event: ClientsChangeEvent) => void): Unsubscribe;
  };
  summaries: {
    daily(date: string): Promise<DailySnapshot>;
    monthly(month: string): Promise<MonthlySummary>;
  };
  exports: {
    excel(payload: { month: string; targetPath?: string }): Promise<string | null>;
    pdf(payload: { month: string; targetPath?: string }): Promise<string | null>;
  };
  backup: {
    create(targetDirectory?: string): Promise<string>;
    restore(sourcePath: string): Promise<string>;
  };
  system: {
    theme(): Promise<ThemeState>;
    setTheme(theme: 'light' | 'dark' | 'system'): Promise<ThemeState>;
    notify(options: NotificationPayload): Promise<boolean | void>;
    onThemeChange(callback: (theme: 'light' | 'dark') => void): Unsubscribe;
  };
  window: {
    openQuickAdd(preset?: Partial<ActivityInput>): Promise<void>;
    closeQuickAdd(): Promise<void>;
    onQuickAddPreset(callback: (preset: Partial<ActivityInput>) => void): Unsubscribe;
  };
  commands: {
    onExportExcel(callback: () => void): Unsubscribe;
    onExportPdf(callback: () => void): Unsubscribe;
  };
}

declare global {
  interface Window {
    api: TaskDeskAPI;
  }
}

export {};
