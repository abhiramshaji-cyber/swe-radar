import { byScore } from "../../core/rank/score";
import { byNewest } from "../../core/time";
import type { Row } from "../../core/types";
import type { Sort } from "../App";

export const keptKeys = (rows: Row[]) => new Set(rows.filter((r) => r.kept === true).map((r) => r.key));

const inRegion = (r: Row, region: string) => !!r.extraction?.regions.includes(region);

export function selectFeed(rows: Row[], regions: string[], region: string, sort: Sort) {
  const kept = rows.filter((r) => r.kept === true);
  const counts: Record<string, number> = Object.fromEntries(regions.map((g) => [g, kept.filter((r) => inRegion(r, g)).length]));
  return {
    counts,
    pending: rows.filter((r) => r.kept === null).sort(byNewest),
    shown: kept.filter((r) => inRegion(r, region)).sort(sort === "score" ? byScore : byNewest),
    filtered: rows.filter((r) => r.kept === false && (inRegion(r, region) || !r.extraction?.regions.length)),
  };
}
