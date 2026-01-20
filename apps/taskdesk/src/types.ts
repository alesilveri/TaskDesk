export type ActivityStatus = 'bozza' | 'inserita';

export type Activity = {
  id: string;
  date: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  minutes: number;
  referenceVerbale: string | null;
  resourceIcon: string | null;
  tags: string[];
  status: ActivityStatus;
  inGestore: boolean;
  verbaleDone: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActivityInput = {
  date: string;
  clientName?: string;
  title: string;
  description?: string;
  minutes: number;
  referenceVerbale?: string;
  resourceIcon?: string;
  tags?: string[];
  status?: ActivityStatus;
  inGestore?: boolean;
  verbaleDone?: boolean;
};

export type ActivityTemplate = {
  id: string;
  title: string;
  clientName: string | null;
  description: string | null;
  minutes: number;
  referenceVerbale: string | null;
  resourceIcon: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  lastUsedAt: string | null;
};

export type DailySummary = {
  date: string;
  totalMinutes: number;
  totalEntries: number;
};

export type WeeklySummary = {
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalEntries: number;
  byDay: SummaryByDate[];
  byClient: SummaryByClient[];
  groups: SummaryGrouping[];
};

export type MonthlySummary = {
  month: string;
  totalMinutes: number;
  totalEntries: number;
  byDay: SummaryByDate[];
  byClient: SummaryByClient[];
  groups: SummaryGrouping[];
};

export type Client = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type BackupInfo = {
  path: string;
  name: string;
  createdAt: string;
};

export type ActivityHistory = {
  id: string;
  activityId: string;
  summary: string;
  changedAt: string;
};

export type AppSettings = {
  dailyTargetMinutes: number;
  workingDaysPerWeek: 5 | 6 | 7;
  theme: 'light' | 'dark' | 'system';
  gapReminderMinutes: number;
  backupDir: string | null;
  autoStart: boolean;
  trayEnabled: boolean;
  hotkeyEnabled: boolean;
};

export type SummaryByDate = {
  date: string;
  totalMinutes: number;
  totalEntries: number;
};

export type SummaryByClient = {
  clientName: string;
  totalMinutes: number;
  totalEntries: number;
};

export type SummaryGrouping = {
  clientName: string;
  label: string;
  totalMinutes: number;
  totalEntries: number;
};
