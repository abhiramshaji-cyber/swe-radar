import { dedupeKey } from "../../dedupe";
import { classifier } from "../../jev";
import { placeKey, reacher } from "../../jev/reach";
import { errorText, failKind, limit, paced } from "../../http";
import { keep } from "../../keep";
import { loadStore, pruneStore, saveStore } from "../../store";
import type {
  Posting,
  RefreshResult,
  Source,
  SourceStatus,
} from "../../types";
import type { Hooks, Options } from "../index";
import { countJobs, halted, lookup, rowsOf, storeJobs } from "../rows";
import { PACE, dueAt, slower } from "../pace";
import { type Run, SOURCES, failLabel } from "../sources";
import { LAST, TIER_MS, tracker } from "../tiers";
import { checkpoint } from "./checkpoint";
import { describeTop } from "./fetch";
import { classifyQueue, scoredBare } from "./classify";

const LANES = 2;
const ROWS_EVERY = 400;
const WINDOW = TIER_MS[LAST];

export async function collect(
  file: string,
  on: Required<Hooks>,
  { settings, apiKey, now = Date.now(), sources: all = SOURCES, signal, resume, launched, described }: Options,
): Promise<RefreshResult> {
  const store = pruneStore(loadStore(file), now);
  const due = (s: Source) => launched === undefined || dueAt(store, s, launched) <= now;
  const sources = all.filter(([s]) => due(s));
  const hit = new Set<Source>();
  const cached = lookup(store, settings);
  const scope = placeKey(settings, "");
  store.places = Object.fromEntries(Object.entries(store.places).filter(([k]) => k.startsWith(scope)));
  const statuses = new Map<string, SourceStatus>();
  const { saved, done, started, persist, snapshot, ctxFor, from } = checkpoint(file, store, statuses, { settings, now, resume, signal, described });
  const set = (s: SourceStatus) => {
    statuses.set(s.source, s);
    on.status(s);
  };

  // rows
  const rowsNow = () => rowsOf(store, [...statuses.values()], settings);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  const push = () => {
    timer ??= setTimeout(() => {
      timer = undefined;
      if (dirty) saveStore(file, store);
      dirty = false;
      on.rows(rowsNow());
    }, ROWS_EVERY);
  };
  const tiers = tracker(sources.length, (t) => {
    on.rows(rowsNow());
    on.tiers(t);
  });

  // classify
  const jev = classifier(
    apiKey,
    settings,
    store.companies,
    (o) => {
      on.classifying({ done: o.done, total: o.total });
      on.classified(o);
      if (!o.extraction) return;
      store.extractions[o.posting.key] = o.extraction;
      dirty = true;
      push();
    },
    signal,
  );
  const { classify, rescore, settled } = classifyQueue(jev, tiers, cached, store.seen, now);

  // stream
  const collected = new Set<string>();
  const found = new Map([...saved.values()].map((s) => [s.source, s.count]));
  const places = reacher(apiKey, settings, store.places, signal);
  const admitting: Promise<void>[] = [];
  const admit = (reachable: Posting[]) => {
    const upgraded = scoredBare(store, reachable, cached);
    const inside = storeJobs(store, reachable, now, WINDOW);
    for (const p of inside) if (upgraded.has(dedupeKey(p))) delete store.extractions[p.key];
    rescore(upgraded);
    for (const p of inside)
      if (!collected.has(p.key))
        found.set(p.source, (found.get(p.source) ?? 0) + 1);
    for (const p of inside) collected.add(p.key);
    if (inside.length) persist();
    classify(inside);
    push();
  };
  const add = (postings: Posting[]) => {
    const job = places.within(postings).then(admit);
    admitting.push(job);
    return job;
  };
  const admitted = () => Promise.all(admitting);
  const fits = (p: Posting) => {
    const x = cached(p.key);
    return !!x && keep(x, settings);
  };

  // sources
  const mark = (source: string, cutoff: number) => {
    const span = store.scanned[source];
    if (!span || span.to >= cutoff) store.scanned[source] = { from: Math.min(span?.from ?? cutoff, cutoff), to: now };
  };
  let offline = false;
  const lanes = limit(LANES);
  const failures = new Map<string, SourceStatus>();
  const notes = new Map<string, Pick<SourceStatus, "label" | "note">>();
  const pull = async (source: Source, run: Run, t: number) => {
    const warnings: string[] = [];
    let label: string | undefined;
    const count = () => found.get(source) ?? 0;
    const paused = () => set({ source, state: "paused", count: count() });
    const running = (note?: string) =>
      failures.get(source) ??
      set({ source, state: "running", count: count(), note });
    tiers.start(t);
    running();
    let failed = false;
    let gap = false;
    try {
      const ctx = ctxFor(t, source);
      const postings = await paced.run(
        { gap: PACE[source].gap, jitter: PACE[source].jitter, limited: () => hit.add(source) },
        () =>
          run(ctx, {
            progress: running,
            warn: (w) => warnings.push(w),
            label: (short) => (label = short),
            found: add,
            partial: () => (gap = true),
          }),
      );
      await add(postings);
      if (signal?.aborted) return paused();
      const note = warnings.join("; ") || undefined;
      if (label || note) notes.set(source, { label, note });
      set({
        ...(failures.get(source) ?? {
          source,
          state: "ok",
          ...notes.get(source),
        }),
        count: count(),
      });
      if (!gap) mark(source, ctx.cutoff);
      ctx.finish(source);
    } catch (e) {
      if (signal?.aborted) return paused();
      failed = true;
      offline ||= failKind(e) === "offline";
      if (!failures.has(source)) {
        const kept = countJobs(store, source, fits);
        failures.set(source, {
          source,
          state: "error",
          count: 0,
          label: failLabel(e, kept),
          note: errorText(e),
        });
      }
      set({ ...failures.get(source)!, count: count() });
    } finally {
      tiers.fetched(t, failed);
    }
  };
  for (const [source] of all)
    if (!due(source))
      set({
        ...(store.last?.statuses.find((s) => s.source === source) ?? { source, state: "ok", count: 0 }),
        label: "Not due",
      });
  for (const [source] of sources) store.tried[source] = now;
  for (const [source] of sources)
    set(
      {
        source,
        state: "running",
        count: saved.get(source)?.count ?? 0,
        note: "queued",
      },
    );
  persist();
  tiers.send();
  classify(Object.values(store.jobs));
  const chains = sources.map(([source, make]) => ({
    source,
    run: make(),
    from: from(source),
    last: Promise.resolve(),
  }));
  const covered = (start: number, t: number) => t > 0 && now - TIER_MS[t - 1] <= start;
  for (let t = 0; t <= LAST; t++)
    for (const c of chains)
      c.last = c.last.then(() =>
        signal?.aborted || done.has(t + ":" + c.source) || covered(c.from, t)
          ? tiers.fetched(t, false)
          : lanes(() => pull(c.source, c.run, t), t),
      );
  await Promise.all(chains.map((c) => c.last));

  // describe
  await admitted();
  await settled();
  if (!signal?.aborted) {
    const fetched = await describeTop(store, rowsNow(), started, (s) => hit.add(s), signal);
    if (fetched.length) await add(fetched);
  }

  // backoff
  for (const [source] of sources)
    if (hit.has(source)) store.slow[source] = slower(store, source);
    else if (!failures.has(source) && !signal?.aborted) delete store.slow[source];

  // finish
  await admitted();
  await settled();
  clearTimeout(timer);
  const { error, cost: classified } = jev.finish();
  const cost = classified + places.cost();
  const resumable = !!signal?.aborted || offline;
  const final = [...statuses.values()].map(
    resumable ? halted : (s: SourceStatus) => s,
  );
  const result: RefreshResult = {
    at: now,
    window: WINDOW,
    rows: rowsNow(),
    statuses: final,
    classifyError: error,
    cost,
    resume: resumable,
  };
  saveStore(file, {
    ...store,
    scan: resumable ? snapshot() : null,
    last: { ...result, rows: [] },
    spent: store.spent + cost,
  });
  return result;
}
