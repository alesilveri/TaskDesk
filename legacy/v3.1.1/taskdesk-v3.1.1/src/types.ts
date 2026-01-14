export interface Activity {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  status: string;
  type: string;
  billable: boolean;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInput {
  clientId?: string | null;
  title: string;
  description?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number;
  status?: string;
  type?: string;
  billable?: boolean;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface ActivityFilters {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  status?: string[];
  search?: string;
  limit?: number;
}

export interface ActivityEvent {
  id: number;
  activityId: string;
  event: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  category: string;
  vatNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInput {
  name: string;
  category?: string | null;
  vatNumber?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface ClientFilters {
  search?: string;
  active?: boolean | 'all';
  category?: string;
}

export interface DailySnapshot {
  date: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalActivities: number;
  uniqueClients: number;
  activities: Activity[];
}

export interface SummaryBucket {
  date: string;
  totalMinutes: number;
  billableMinutes: number;
  activityCount: number;
}

export interface SummaryTypeBucket {
  type: string;
  totalMinutes: number;
  count: number;
}

export interface SummaryTagBucket {
  tag: string;
  totalMinutes: number;
  count: number;
}

export interface SummaryClientBucket {
  clientId: string;
  clientName: string | null;
  totalMinutes: number;
  count: number;
}

export interface MonthlySummary {
  month: string;
  range: { start: string; end: string };
  totals: {
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
    totalActivities: number;
    uniqueClients: number;
    activeDays: number;
    averageDailyMinutes: number;
  };
  perDay: SummaryBucket[];
  byType: SummaryTypeBucket[];
  byTag: SummaryTagBucket[];
  topClients: SummaryClientBucket[];
  activities: Activity[];
}

export interface NotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
}

export interface ActivitiesChangeEvent {
  type: 'created' | 'updated' | 'removed' | 'refresh';
  payload?: unknown;
}

export interface ClientsChangeEvent {
  type: 'created' | 'updated' | 'removed' | 'refresh';
  payload?: unknown;
}

export interface ThemeState {
  current: 'light' | 'dark';
  preference: 'light' | 'dark' | 'system';
}
