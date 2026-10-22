import { dedupeKey, squash, words } from "../dedupe";
import { DAY } from "../time";
import type { Posting, Repost, Sighting } from "../types";

export const GAP = 2 * DAY;
const JITTER = DAY;

export const roleOf = (p: Posting) => p.source + "|" + dedupeKey(p);

export const dated = (t: unknown): t is number =>
  typeof t === "number" && Number.isFinite(t) && t > 0;

const places = (location: string) =>
  new Set(
    location
      .split(";")
      .map((l) =>
        squash(words(l.replace(/\(.*?\)|\[.*?\]/g, "").split(",")[0])),
      )
      .filter(Boolean),
  );

export function sameArea(a: string, b: string) {
  const x = places(a);
  const y = places(b);
  return !x.size || !y.size || [...x].some((p) => y.has(p));
}

export function originalOf(
  p: Posting,
  others: [string, Sighting][],
): Repost | null {
  if (!dated(p.postedAt)) return null;
  const prior = others.filter(
    ([key, s]) =>
      dated(s.at) &&
      p.postedAt - s.at > (key === p.key ? JITTER : GAP) &&
      sameArea(p.location, s.location),
  );
  if (!prior.length) return null;
  const [of, s] = prior.reduce((a, b) => (b[1].at < a[1].at ? b : a));
  return { signal: of === p.key ? "bumped" : "history", of, at: s.at };
}
