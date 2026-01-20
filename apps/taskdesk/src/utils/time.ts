import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns';

export const DEFAULT_TARGET_MINUTES = 8 * 60;
export const MIN_ACTIVITY_MINUTES = 5;
export const MAX_ACTIVITY_MINUTES = 12 * 60;
export const MINUTE_SUGGESTIONS = [15, 20, 30, 45];
export const SMART_SLOT_CANDIDATES = [10, 15, 20, 25];
export const HIGH_DURATION_WARNING_MINUTES = 240;

export function isWorkingDay(date: Date, workingDaysPerWeek = 5) {
  const day = date.getDay();
  if (workingDaysPerWeek >= 7) return true;
  if (workingDaysPerWeek === 6) return day !== 0;
  return day !== 0 && day !== 6;
}

export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes}m`;
}

export function countWorkingDays(start: string, end: string, workingDaysPerWeek = 5) {
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  return days.filter((day) => isWorkingDay(day, workingDaysPerWeek)).length;
}

export function buildSmartSlots(gapMinutes: number, patterns: number[]) {
  if (gapMinutes <= 0) return [];
  const ordered = SMART_SLOT_CANDIDATES.slice().sort((a, b) => {
    const aScore = patterns.indexOf(a);
    const bScore = patterns.indexOf(b);
    if (aScore === -1 && bScore === -1) return b - a;
    if (aScore === -1) return 1;
    if (bScore === -1) return -1;
    return aScore - bScore;
  });

  const slots: number[] = [];
  let remaining = gapMinutes;
  while (remaining >= 10) {
    const candidate = ordered.find((value) => value <= Math.min(25, remaining)) ?? 10;
    slots.push(candidate);
    remaining -= candidate;
    if (slots.length > 8) break;
  }
  return slots;
}
