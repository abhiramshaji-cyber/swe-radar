import { blocked } from "../blocked";
import { dedupe, dedupeKey } from "../dedupe";
import { keep } from "../keep";
import { markReposts, sight } from "../repost";
import { jobScore } from "../rank/score";
import { byNewest, effectiveAt, inWindow } from "../time";
import { classifier } from "../jev";
import type { Settings } from "../settings";
import { schemaOf } from "../settings/file";
import { type Store, loadStore, pruneStore, saveStore } from "../store";
import type { Extraction, Posting, RefreshResult, Row, SourceStatus } from "../types";
import type { Hooks } from "./index";

export type Lookup = (key: string) => Extraction | null;

export const toPosting = ({
  effectiveAt: _a,
  extraction: _x,
  kept: _k,
  stale: _s,
  salary: _p,
  estimated: _e,
  score: _c,
  ...p
}: Row): Posting => p;

function toRow(p: Posting, x: Extraction | null, firstSeen: number, stale: boolean, s: Settings): Row {
  const posted = p.pay?.currency === s.currency ? p.pay : null;
  const salary = posted ?? x?.pay ?? null;
  return {
    ...p,
    effectiveAt: effectiveAt(p, firstSeen),
    extraction: x,
    kept: x ? keep(x, s) : null,
    salary,
    estimated: !posted && !!salary,
    score: jobScore(x?.companyScore, salary, posted ? 1 : (x?.payConfidence ?? 0), s),
    ...(stale && { stale: true }),
  };
}

export function buildRows(
  postings: Posting[],
  cached: Lookup,
  seen: Record<string, number>,
  stale: Set<string>,
  s: Settings,
): Row[] {
  const byGroup = new Map<string, Extraction>();
  for (const p of postings) {
    const x = cached(p.key);
    if (x) byGroup.set(dedupeKey(p), x);
  }
  return dedupe(postings)
    .map((p) =>
      toRow(p, cached(p.key) ?? byGroup.get(dedupeKey(p)) ?? null, seen[p.key] ?? p.postedAt, stale.has(p.key), s),
    )
    .sort(byNewest);
}

export const lookup = (store: Store, s: Settings): Lookup => {
  const version = schemaOf(s);
  return (k: string) => (store.extractions[k]?.version === version ? store.extractions[k] : null);
};

export function rowsOf(store: Store, statuses: SourceStatus[], s: Settings) {
  const failed = new Set(statuses.filter((s) => s.state === "error").map((s) => s.source));
  const jobs = Object.values(store.jobs);
  const stale = new Set(jobs.filter((p) => failed.has(p.source)).map((p) => p.key));
  return buildRows(jobs, lookup(store, s), store.seen, stale, s);
}

export function storeJobs(store: Store, postings: Posting[], now: number, win: number) {
  for (const p of postings) store.seen[p.key] ??= now;
  store.sightings = sight(store.sightings, postings, store.seen, now);
  const inside = postings.filter((p) => !blocked(p) && inWindow(p, store.seen[p.key], now, win));
  for (const p of inside) {
    const repost = p.repost ?? store.jobs[p.key]?.repost;
    store.jobs[p.key] = { ...p, description: p.description || store.jobs[p.key]?.description || "", ...(repost && { repost }) };
  }
  Object.assign(store, markReposts(store, now));
  return inside;
}

export const countJobs = (store: Store, source: string, fits: (p: Posting) => boolean) =>
  Object.values(store.jobs).filter((p) => p.source === source && fits(p)).length;

export const halted = (s: SourceStatus): SourceStatus =>
  s.state === "running" ? { source: s.source, state: "paused", count: s.count } : s;

function resultOf(store: Store, now: number, s: Settings): RefreshResult | null {
  const { last, scan } = store;
  if (!last && !scan && !Object.keys(store.jobs).length) return null;
  const statuses = scan ? scan.statuses.map(halted) : (last?.statuses ?? []).filter((s) => s.source !== "jev");
  return {
    at: last?.at ?? now,
    window: last?.window,
    rows: rowsOf(store, statuses, s),
    statuses,
    classifyError: last?.classifyError ?? null,
    cost: last?.cost ?? 0,
    resume: !!scan,
  };
}

export const lastResult = (file: string, s: Settings, now = Date.now()) => resultOf(pruneStore(loadStore(file), now), now, s);

export async function rescore(file: string, on: Hooks, s: Settings, apiKey?: string): Promise<RefreshResult | null> {
  const now = Date.now();
  const store = pruneStore(loadStore(file), now);
  const last = resultOf(store, now, s);
  if (!last) return null;
  const rowsNow = () => rowsOf(store, last.statuses, s);
  const jev = classifier(apiKey, s, store.companies, (o) => {
    on.classifying?.({ done: o.done, total: o.total });
    on.classified?.(o);
    if (!o.extraction) return;
    store.extractions[o.posting.key] = o.extraction;
    saveStore(file, store);
    on.rows?.(rowsNow());
  });
  const cached = lookup(store, s);
  await jev.add(dedupe(Object.values(store.jobs).filter((p) => !cached(p.key))));
  const { error, cost } = jev.finish();
  saveStore(file, {
    ...store,
    last: store.last && { ...store.last, classifyError: error, cost },
    spent: store.spent + cost,
  });
  return { ...last, rows: rowsNow(), classifyError: error, cost };
}
