import type { Pace } from "../http";
import { HOUR } from "../time";
import type { Store } from "../store";
import type { Source } from "../types";
import { SOURCES } from "./sources";

type Plan = Omit<Pace, "limited"> & { every: number; drift?: number; overlap?: number };

const MINUTE = 60_000;
const SLOWEST = 12 * HOUR;

export const PACE: Record<Source, Plan> = {
  ashby: { every: HOUR },
  greenhouse: { every: HOUR },
  lever: { every: HOUR },
  recruitee: { every: HOUR },
  smartrecruiters: { every: HOUR },
  microsoft: { every: HOUR },
  amazon: { every: HOUR, gap: 1000 },
  linkedin: { every: 3 * HOUR, drift: 15 * MINUTE, overlap: 30 * MINUTE, gap: 1500, jitter: [500, 1000] },
};

export const every = (store: Store, s: Source) => Math.max(PACE[s].every, store.slow[s] ?? 0);

export const slower = (store: Store, s: Source) => Math.min(SLOWEST, every(store, s) * 2);

export function dueAt(store: Store, s: Source, launched: number) {
  const wait = every(store, s);
  const last = store.tried[s];
  const drift = PACE[s].drift ?? 0;
  const shift = drift && last !== undefined ? (last % (2 * drift)) - drift : 0;
  return Math.max(launched + wait, last === undefined ? 0 : last + wait + shift);
}

export const soonest = (store: Store, launched: number) =>
  Math.min(...SOURCES.map(([s]) => dueAt(store, s, launched)));
