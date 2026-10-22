import type { Ctx, Posting, Row } from "./types";

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const WINDOW_HOURS = [3, 6, 12, 24, 48, 120] as const;
export const KEEP = Math.max(...WINDOW_HOURS) * HOUR;

const UNIT: Record<string, number> = {
  second: 1000,
  minute: 60_000,
  hour: HOUR,
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
  year: 365 * DAY,
};

export function parseRelative(text: string, now: number): number | null {
  const t = text.toLowerCase();
  if (/\bjust now\b/.test(t)) return now;
  const m = t.match(
    /(\d+|an?|one)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
  );
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
  return now - n * UNIT[m[2]];
}

export const byNewest = (a: Row, b: Row) => b.effectiveAt - a.effectiveAt;

export const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

export const effectiveAt = (p: Posting, firstSeen: number) =>
  p.precision === "exact" ? p.postedAt : firstSeen;

const dayFloor = (now: number, cutoff: number) =>
  Math.min(startOfDay(now) - DAY, startOfDay(cutoff));

export function inWindow(p: Posting, firstSeen: number, now: number, window: number) {
  const cutoff = now - window;
  if (p.precision === "exact")
    return p.postedAt >= cutoff && p.postedAt <= now + HOUR;
  return firstSeen >= cutoff && p.postedAt >= dayFloor(now, cutoff);
}

export const sourceDayOk = (postedAt: number, ctx: Ctx) =>
  postedAt >= dayFloor(ctx.now, ctx.cutoff);
