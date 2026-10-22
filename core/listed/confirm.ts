import type { Row } from "../types";
import type { Verdict } from "./parse";

export type Checked = Verdict & { checked: number };

export type Verdicts = Record<string, Checked>;

const strip = ({ repost: _, ...bare }: Row): Row => bare;

export function confirm(rows: Row[], verdicts: Verdicts): Row[] {
  return rows.map((r) => {
    const v = r.source === "linkedin" ? verdicts[r.key] : undefined;
    if (v?.reposted)
      return {
        ...strip(r),
        repost: {
          signal: "linkedin",
          of: r.key,
          ...(v.first && { at: v.first }),
        },
      };
    if (v) return strip(r);
    return r.repost && verdicts[r.repost.of]?.reposted === false ? strip(r) : r;
  });
}

export const due = (rows: Row[], verdicts: Verdicts) =>
  rows
    .filter(
      (r) => r.source === "linkedin" && r.kept === true && !verdicts[r.key],
    )
    .toSorted((a, b) => b.effectiveAt - a.effectiveAt);
