/**
 * Date helpers — ported line-for-line from converge_frontend/lib/dateUtils.ts
 * so business-day math (planned dates, delay/overdue detection, achievement
 * detection) produces byte-identical results whether computed here (at
 * write time / seed time) or client-side (at live-recompute time). All
 * arithmetic is UTC-consistent (see the frontend file's own comment for
 * why local-time parsing + UTC serialization is a classic off-by-one bug).
 */
import type { WeekDay } from "./types";

export const toISO = (d: Date): string => d.toISOString().slice(0, 10);

export const parseISO = (isoDate: string): Date => new Date(isoDate + "T00:00:00Z");

export const addDays = (isoDate: string, days: number): string => {
  const d = parseISO(isoDate);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return toISO(d);
};

export const diffDays = (a: string, b: string): number => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);

// Server-side "today" — UTC calendar date. (The frontend's todayISO()
// deliberately uses the *browser's* local date instead; the backend has
// no such notion, so UTC is the only sensible source of truth here.)
export const todayISO = (): string => toISO(new Date());

export const DEFAULT_WEEK_OFF: WeekDay[] = [0, 6]; // Sunday + Saturday

export function isWeekend(isoDate: string, weekOff: WeekDay[] = DEFAULT_WEEK_OFF): boolean {
  const day = parseISO(isoDate).getUTCDay() as WeekDay;
  return weekOff.includes(day);
}

// Advance `isoDate` by `count` working days (count may be 0). Landing on
// an off-day is never a valid result — this always lands on a working day.
export function addWorkingDays(isoDate: string, count: number, weekOff: WeekDay[] = DEFAULT_WEEK_OFF): string {
  const d = parseISO(isoDate);
  let remaining = Math.trunc(Number(count) || 0);
  const step = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + step);
    if (!weekOff.includes(d.getUTCDay() as WeekDay)) remaining--;
  }
  while (weekOff.includes(d.getUTCDay() as WeekDay)) d.setUTCDate(d.getUTCDate() + (step || 1));
  return toISO(d);
}

// Count working days strictly between two ISO dates (a - b), signed.
export function businessDaysBetween(a: string, b: string, weekOff: WeekDay[] = DEFAULT_WEEK_OFF): number {
  if (a === b) return 0;
  const sign = parseISO(a) > parseISO(b) ? 1 : -1;
  const [start, end] = sign === 1 ? [b, a] : [a, b];
  const d = parseISO(start);
  const endD = parseISO(end);
  let count = 0;
  while (d < endD) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!weekOff.includes(d.getUTCDay() as WeekDay)) count++;
  }
  return count * sign;
}
