import type { Posting } from "./types";

const LEGAL =
  /\b(inc|incorporated|ltd|limited|llc|llp|corp|corporation|co|company|ulc|gmbh|plc|sa|ag)\b/g;

export const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

export const squash = (s: string) => s.replace(/\s+/g, "");

export const companyKey = (p: Posting) => squash(words(p.company).replace(LEGAL, " "));

export const dedupeKey = (p: Posting) => companyKey(p) + "|" + squash(words(p.title));

const better = (a: Posting, b: Posting) =>
  a.precision !== b.precision
    ? a.precision === "exact"
    : a.description.length !== b.description.length
      ? a.description.length > b.description.length
      : a.postedAt >= b.postedAt;

export function dedupe(postings: Posting[]): Posting[] {
  const groups = new Map<string, Posting[]>();
  for (const p of postings)
    groups.set(dedupeKey(p), [...(groups.get(dedupeKey(p)) ?? []), p]);
  return [...groups.values()].map((group) => {
    const best = group.reduce((a, b) => (better(a, b) ? a : b));
    const places = [
      ...new Set(group.flatMap((p) => p.location.split("; ")).filter(Boolean)),
    ];
    const pay = best.pay ?? group.find((p) => p.pay)?.pay;
    const repost = best.repost ?? group.find((p) => p.repost)?.repost;
    return { ...best, location: places.join("; "), ...(pay && { pay }), ...(repost && { repost }) };
  });
}
