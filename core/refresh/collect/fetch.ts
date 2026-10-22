import { canFetch, fetchDescription } from "../../ask/describe";
import { failKind, mapPool, paced } from "../../http";
import { promising } from "../../rank/top";
import type { Store } from "../../store";
import type { Posting, Row, Source } from "../../types";
import { PACE } from "../pace";

const POOL = 4;

export async function describeTop(
  store: Store,
  rows: Row[],
  started: number,
  limited: (s: Source) => void,
  signal?: AbortSignal,
): Promise<Posting[]> {
  const fresh = rows.filter((r) => (store.seen[r.key] ?? 0) >= started && canFetch(r));
  const blocked = new Set<Source>();
  const fetched = await mapPool(promising(fresh), POOL, async (r) => {
    if (signal?.aborted || blocked.has(r.source)) return null;
    const { gap, jitter } = PACE[r.source];
    const text = await paced
      .run({ gap, jitter, limited: () => limited(r.source) }, () => fetchDescription(r))
      .catch((e) => {
        if (failKind(e) === "rate") blocked.add(r.source);
        return "";
      });
    const job = store.jobs[r.key];
    if (!text || !job) return null;
    store.descriptions[r.key] = text;
    return { ...job, description: [job.description, text].filter(Boolean).join("\n\n") };
  });
  return fetched.filter((p) => p !== null);
}
