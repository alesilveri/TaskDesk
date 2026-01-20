import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { isWorkingDay } from './time';

export type MonthDay = {
  date: string;
  label: string;
  isCurrentMonth: boolean;
  isWorkingDay: boolean;
  isToday: boolean;
  totalMinutes: number;
  totalEntries: number;
  gapMinutes: number;
};

export function buildMonthGrid(
  monthKey: string,
  rows: { date: string; totalMinutes: number; totalEntries: number }[],
  targetMinutes: number,
  workingDaysPerWeek = 5
) {
  const base = new Date(`${monthKey}-01T00:00:00`);
  const start = startOfWeek(startOfMonth(base), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(base), { weekStartsOn: 1 });
  const lookup = new Map(rows.map((row) => [row.date, row]));
  const today = new Date();

  const days = eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const summary = lookup.get(key);
    const totalMinutes = summary?.totalMinutes ?? 0;
    return {
      date: key,
      label: format(day, 'd'),
      isCurrentMonth: isSameMonth(day, base),
      isWorkingDay: isWorkingDay(day, workingDaysPerWeek),
      isToday: isSameDay(day, today),
      totalMinutes,
      totalEntries: summary?.totalEntries ?? 0,
      gapMinutes: Math.max(targetMinutes - totalMinutes, 0),
    } satisfies MonthDay;
  });

  const weeks: MonthDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}
