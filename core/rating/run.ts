import { lastResult } from "../refresh/rows";
import type { Settings } from "../settings";
import { type Store, loadStore, saveStore } from "../store";
import type { Posting, Rated } from "../types";
import { type Ask, lookupRatings } from "./ask";
import { expireRatings, hits } from "./expiry";
import { dueCompanies } from "./queue";

const BATCH = 6;

export type Deps = {
  settings: Settings;
  idle: () => Promise<unknown> | null | undefined;
  saved?: (ratings: Record<string, Rated>) => void;
  ask?: Ask;
  now?: () => number;
};

const byPriority = (file: string, s: Store, settings: Settings, now: number): Posting[] => [
  ...(lastResult(file, settings, now)?.rows ?? []).sort((a, b) => Number(b.kept === true) - Number(a.kept === true) || b.score - a.score),
  ...Object.values(s.jobs),
];

async function settle(idle: Deps["idle"]) {
  for (let p = idle(); p; p = idle()) await p.catch(() => {});
}

async function loop(file: string, { settings, idle, saved, ask, now = Date.now }: Deps) {
  for (;;) {
    const s = loadStore(file);
    const batch = dueCompanies(byPriority(file, s, settings, now()), expireRatings(s.ratings, now())).slice(0, BATCH);
    if (!batch.length) return;
    const found = await lookupRatings(batch, now(), ask);

    // keep settle, load and save free of awaits or a scan can overwrite this write
    await settle(idle);
    const fresh = loadStore(file);
    const ratings = { ...fresh.ratings, ...found };
    saveStore(file, { ...fresh, ratings });
    saved?.(hits(expireRatings(ratings, now())));

    if (Object.values(found).every((r) => "failed" in r)) return;
  }
}

let active: Promise<void> | null = null;

export const rateCompanies = (file: string, deps: Deps) =>
  (active ??= loop(file, deps)
    .catch(() => {})
    .finally(() => (active = null)));
