import fs from "node:fs";
import { blocked, blockedSource } from "./blocked";
import { toPosting } from "./refresh/rows";
import { expireRatings, readRatings } from "./rating/expiry";
import { forget } from "./repost";
import { DAY, KEEP, effectiveAt } from "./time";
import type { Extraction, Posting, Rating, RefreshResult, Row, Scan, Sighting, SourceStatus, Span } from "./types";

export type Store = {
  seen: Record<string, number>;
  extractions: Record<string, Extraction>;
  descriptions: Record<string, string>;
  jobs: Record<string, Posting>;
  scan: Scan | null;
  last: RefreshResult | null;
  spent: number;
  companies: Record<string, number>;
  ratings: Record<string, Rating>;
  applied: string[];
  dead: Record<string, number>;
  scanned: Record<string, Span>;
  tried: Record<string, number>;
  slow: Record<string, number>;
  sightings: Record<string, Sighting>;
  places: Record<string, boolean>;
};

const RETAIN = KEEP + DAY;
const RECHECK = 7 * DAY;

const stamps = (v: unknown): Record<string, number> =>
  v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).filter(([, t]) => Number.isFinite(t)))
    : {};

const isMap = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

const spans = (v: Record<string, any>): Record<string, Span> =>
  Object.fromEntries(
    Object.entries(v).filter(([, x]) => Number.isFinite(x?.from) && Number.isFinite(x?.to) && x.from <= x.to),
  );

const sightings = (v: unknown): Record<string, Sighting> =>
  isMap(v)
    ? Object.fromEntries(
        Object.entries(v).filter(
          ([, s]) =>
            typeof s?.role === "string" &&
            typeof s.location === "string" &&
            Number.isFinite(s.at) &&
            Number.isFinite(s.last),
        ),
      )
    : {};

const covered = (m: Record<string, Span>, now: number) =>
  Object.fromEntries(
    Object.entries(m)
      .filter(([, x]) => now - x.to < KEEP)
      .map(([k, x]) => [k, { from: Math.max(x.from, now - KEEP), to: x.to }]),
  );

const legacyJobs = (last: RefreshResult | null): Record<string, Posting> =>
  Object.fromEntries((last?.rows ?? []).map((r: Row) => [r.key, toPosting(r)]));

const shown = (v: unknown): SourceStatus[] => (Array.isArray(v) ? v.filter((x) => !blockedSource(x?.source)) : []);

const readScan = (v: any): Scan | null =>
  isMap(v) && Array.isArray(v.done) && Array.isArray(v.statuses)
    ? {
        done: v.done.filter((d: unknown) => typeof d === "string"),
        statuses: shown(v.statuses),
        ...(Number.isFinite(v.started) && { started: v.started }),
      }
    : null;

const allowed = (jobs: Record<string, Posting>) =>
  Object.fromEntries(Object.entries(jobs).filter(([, p]) => !blocked(p)));

const readLast = (v: unknown): RefreshResult | null => (isMap(v) ? ({ ...v, statuses: shown(v.statuses) } as RefreshResult) : null);

const empty = (): Store => ({
  seen: {},
  extractions: {},
  descriptions: {},
  jobs: {},
  scan: null,
  last: null,
  spent: 0,
  companies: {},
  ratings: {},
  applied: [],
  dead: {},
  scanned: {},
  tried: {},
  slow: {},
  sightings: {},
  places: {},
});

export function loadStore(file: string): Store {
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...s,
      seen: s?.seen ?? {},
      extractions: s?.extractions ?? {},
      descriptions: s?.descriptions ?? {},
      jobs: allowed(isMap(s?.jobs) ? s.jobs : legacyJobs(s?.last ?? null)),
      scan: readScan(s?.scan),
      last: readLast(s?.last),
      spent: Number.isFinite(s?.spent) ? s.spent : 0,
      companies: s?.companies && typeof s.companies === "object" ? s.companies : {},
      ratings: readRatings(s?.ratings),
      applied: Array.isArray(s?.applied) ? s.applied.filter((k: unknown) => typeof k === "string") : [],
      dead: stamps(s?.dead),
      scanned: isMap(s?.scanned) ? spans(s.scanned) : {},
      tried: stamps(s?.tried),
      slow: stamps(s?.slow),
      sightings: sightings(s?.sightings),
      places: isMap(s?.places) ? Object.fromEntries(Object.entries(s.places).filter(([, v]) => typeof v === "boolean")) : {},
    };
  } catch {
    if (fs.existsSync(file)) fs.copyFileSync(file, file + ".unreadable-" + Date.now());
    return empty();
  }
}

export function pruneStore(s: Store, now: number): Store {
  const seen = Object.fromEntries(
    Object.entries(s.seen).filter(([, t]) => now - t < RETAIN),
  );
  const fresh = <T>(m: Record<string, T>) =>
    Object.fromEntries(Object.entries(m).filter(([k]) => k in seen));
  const jobs = Object.fromEntries(
    Object.entries(s.jobs).filter(([k, p]) => now - effectiveAt(p, s.seen[k] ?? p.postedAt) < KEEP),
  );
  return {
    ...s,
    seen,
    jobs,
    extractions: fresh(s.extractions),
    descriptions: fresh(s.descriptions),
    dead: Object.fromEntries(Object.entries(s.dead).filter(([, t]) => now - t < RECHECK)),
    ratings: expireRatings(s.ratings, now),
    scanned: covered(s.scanned, now),
    sightings: forget(s.sightings, now),
  };
}

export function saveStore(file: string, s: Store) {
  fs.writeFileSync(file + ".tmp", JSON.stringify(s), { flush: true });
  fs.renameSync(file + ".tmp", file);
}

export function learnDescription(s: Store, key: string, description: string): Store {
  const { [key]: _, ...extractions } = s.extractions;
  const job = s.jobs[key];
  return {
    ...s,
    extractions,
    descriptions: { ...s.descriptions, [key]: description },
    jobs: job ? { ...s.jobs, [key]: { ...job, description } } : s.jobs,
  };
}
