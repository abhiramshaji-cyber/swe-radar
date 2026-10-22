import { DAY } from "../time";
import type { Posting, Repost } from "../types";

export const MARGIN = 14 * DAY;
const SPREAD = DAY;
const SEQUENTIAL = ["linkedin"];

type Anchor = { id: number; at: number };

const serial = (key: string) => {
  const [source, id] = key.split(":");
  return SEQUENTIAL.includes(source) && /^\d+$/.test(id ?? "")
    ? Number(id)
    : null;
};

const median = (xs: number[]) => {
  const s = xs.toSorted((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function batches(anchors: Anchor[]) {
  const top = new Map<number, number>();
  for (const a of anchors) top.set(a.at, Math.max(a.id, top.get(a.at) ?? -Infinity));
  return [...top].map(([at, id]) => ({ id, at })).toSorted((a, b) => a.at - b.at);
}

function fit(points: Anchor[]) {
  const pairs = points.flatMap((a, i) =>
    points
      .slice(i + 1)
      .flatMap((b, j) =>
        b.at - a.at >= SPREAD
          ? [{ i, j: i + 1 + j, rate: (b.at - a.at) / (b.id - a.id) }]
          : [],
      ),
  );
  const most = Math.max(
    0,
    ...points.map(
      (_, k) => pairs.filter((p) => p.i === k || p.j === k).length,
    ),
  );
  if (2 * most >= pairs.length) return null;

  const rate = median(pairs.map((p) => p.rate));
  if (!(rate > 0 && Number.isFinite(rate))) return null;
  const base = median(points.map((c) => c.at - c.id * rate));
  return (id: number) => base + id * rate;
}

export function aged(seen: Record<string, number>) {
  const anchors = Object.entries(seen).flatMap(([key, at]) => {
    const id = serial(key);
    return id !== null && Number.isFinite(at) && at > 0 ? [{ id, at }] : [];
  });
  const created = fit(batches(anchors));
  if (!created) return () => null;

  return (p: Posting): Repost | null => {
    const id = serial(p.key);
    if (id === null || !Number.isFinite(p.postedAt)) return null;
    const at = created(id);
    return p.postedAt - at > MARGIN
      ? { signal: "age", of: p.key, at, shown: p.postedAt }
      : null;
  };
}
