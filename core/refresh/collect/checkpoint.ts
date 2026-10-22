import type { Settings } from "../../settings";
import { type Store, saveStore } from "../../store";
import type { Ctx, Source, SourceStatus } from "../../types";
import { halted } from "../rows";
import { PACE } from "../pace";
import { LAST, TIER_MS } from "../tiers";

export function checkpoint(
  file: string,
  store: Store,
  statuses: Map<string, SourceStatus>,
  { settings, now, resume, signal, described }: { settings: Settings; now: number; resume?: boolean; signal?: AbortSignal; described?: (key: string) => string | undefined },
) {
  const saved = new Map(((resume && store.scan?.statuses) || []).map((s) => [s.source, s]));
  const done = new Set((resume && store.scan?.done) || []);
  const started = (resume && store.scan?.started) || now;
  const snapshot = () => ({ done: [...done], statuses: [...statuses.values()].map(halted), started });
  const persist = () => {
    store.scan = snapshot();
    saveStore(file, store);
  };
  const from = (source: Source) => {
    const span = store.scanned[source];
    return span && span.from <= now - TIER_MS[LAST] ? span.to - (PACE[source].overlap ?? 0) : now - TIER_MS[LAST];
  };
  const ctxFor = (t: number, source: Source): Ctx => ({
    settings,
    now,
    cutoff: Math.max(now - TIER_MS[t], from(source)),
    from: from(source),
    dead: store.dead,
    known: (p) => {
      const found = store.descriptions[p.key] || described?.(p.key);
      if (!found) return p;
      store.descriptions[p.key] = found;
      return { ...p, description: [p.description, found].filter(Boolean).join("\n\n") };
    },
    done: (id) => done.has(t + ":" + id),
    finish: (id) => {
      if (signal?.aborted) return;
      done.add(t + ":" + id);
      persist();
    },
  });
  return { saved, done, started, persist, snapshot, ctxFor, from };
}
