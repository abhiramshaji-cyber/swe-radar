import { dedupe, dedupeKey } from "../../dedupe";
import { hasDescription } from "../../docs/description";
import type { classifier } from "../../jev";
import { effectiveAt } from "../../time";
import type { Store } from "../../store";
import type { Posting } from "../../types";
import type { Lookup } from "../rows";
import { LAST, tierOf, type tracker } from "../tiers";

export function classifyQueue(
  jev: ReturnType<typeof classifier>,
  tiers: ReturnType<typeof tracker>,
  cached: Lookup,
  seen: Record<string, number>,
  now: number,
) {
  const queued = new Set<string>();
  const classifying: Promise<void>[] = [];
  const classify = (postings: Posting[]) => {
    for (const p of postings) if (cached(p.key)) queued.add(dedupeKey(p));
    const rank = new Map<string, number>();
    for (const p of postings)
      rank.set(dedupeKey(p), Math.min(rank.get(dedupeKey(p)) ?? LAST, tierOf(effectiveAt(p, seen[p.key]), now)));
    const todo = dedupe(postings).filter((p) => !queued.has(dedupeKey(p)));
    for (const p of todo) queued.add(dedupeKey(p));
    for (const [t, group] of Map.groupBy(todo, (p) => rank.get(dedupeKey(p)) ?? LAST)) {
      tiers.queued(t, group.length);
      classifying.push(jev.add(group, t).finally(() => tiers.classified(t, group.length)));
    }
  };
  const rescore = (groups: Set<string>) => {
    for (const g of groups) queued.delete(g);
  };
  return { classify, rescore, settled: () => Promise.all(classifying) };
}

export function scoredBare(store: Store, postings: Posting[], cached: Lookup) {
  const bare = (p: Posting) => hasDescription(p.description) && !hasDescription(store.jobs[p.key]?.description) && !!cached(p.key);
  return new Set(postings.filter(bare).map(dedupeKey));
}
