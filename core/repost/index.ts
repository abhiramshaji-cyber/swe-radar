import { DAY } from "../time";
import type { Posting, Repost, Sighting } from "../types";
import { aged } from "./age";
import { dated, originalOf, roleOf } from "./match";

export { GAP, sameArea } from "./match";

const MEMORY = 30 * DAY;

type Marked = {
  jobs: Record<string, Posting>;
  seen: Record<string, number>;
  sightings: Record<string, Sighting>;
};

const KEPT: Repost["signal"][] = ["board", "history", "bumped"];

const kept = (r: Repost | undefined) =>
  !!r && KEPT.includes(r.signal) && typeof r.of === "string";

export function sight(
  sightings: Record<string, Sighting>,
  postings: Posting[],
  seen: Record<string, number>,
  now: number,
): Record<string, Sighting> {
  const next = { ...sightings };
  for (const p of postings) {
    const at = Math.min(
      ...[next[p.key]?.at, p.postedAt, seen[p.key]].filter(dated),
    );
    if (!dated(at)) continue;
    next[p.key] = { role: roleOf(p), at, last: now, location: p.location };
  }
  return next;
}

export const forget = (sightings: Record<string, Sighting>, now: number) =>
  Object.fromEntries(
    Object.entries(sightings).filter(([, s]) => now - s.last < MEMORY),
  );

export function relisted(list: Posting[]): Posting[] {
  const byRole = Map.groupBy(list, roleOf);
  return list.map((p) => {
    const others = byRole
      .get(roleOf(p))!
      .filter((o) => o.key !== p.key)
      .map((o): [string, Sighting] => [
        o.key,
        { role: "", at: o.postedAt, last: 0, location: o.location },
      ]);
    const found = originalOf(p, others);
    return found ? { ...p, repost: { ...found, signal: "board" } } : p;
  });
}

export function markReposts<S extends Marked>(store: S, now: number): S {
  const sightings = sight(
    store.sightings,
    Object.values(store.jobs),
    store.seen,
    now,
  );
  const byRole = Map.groupBy(Object.entries(sightings), ([, s]) => s.role);
  const old = aged(store.seen);
  const jobs = Object.fromEntries(
    Object.entries(store.jobs).map(([k, p]) => {
      const { repost: _, ...bare } = p;
      const repost = kept(p.repost)
        ? p.repost
        : (originalOf(p, byRole.get(roleOf(p)) ?? []) ?? old(p));
      return [k, repost ? { ...bare, repost } : bare];
    }),
  );
  return { ...store, sightings, jobs };
}
