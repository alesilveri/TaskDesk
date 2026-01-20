import { format, parseISO, addMonths, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, pattern, { locale: it });
}

export function formatDayName(value: string | Date) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'EEEE d MMMM', { locale: it });
}

export function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return format(date, 'MMMM yyyy', { locale: it });
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!minutes) return '0h';
  if (!mins) {
    return `${hours}h`;
  }
  if (!hours) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

export function formatMinutesDecimal(minutes: number) {
  return (Math.round((minutes / 60) * 100) / 100).toFixed(2);
}

export function currentDateKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonthKey() {
  return format(new Date(), 'yyyy-MM');
}

export function monthOffset(month: string, offset: number) {
  const [year, monthValue] = month.split('-').map(Number);
  const base = new Date(year, (monthValue || 1) - 1, 1);
  const next = addMonths(base, offset);
  return format(next, 'yyyy-MM');
}

export function monthRange(month: string) {
  const [year, monthValue] = month.split('-').map(Number);
  const base = startOfMonth(new Date(year, (monthValue || 1) - 1, 1));
  const lastDay = new Date(year, (monthValue || 1), 0);
  return {
    start: format(base, 'yyyy-MM-dd'),
    end: format(lastDay, 'yyyy-MM-dd'),
  };
}
