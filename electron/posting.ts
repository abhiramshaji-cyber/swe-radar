import type { Posting } from "../core/types";

const text = (v: unknown) => (typeof v === "string" ? v : "");

export const posting = (p: any): Posting => {
  if (typeof p?.key !== "string" || typeof p.source !== "string")
    throw new Error("Unknown job.");
  return {
    key: p.key,
    source: p.source,
    title: text(p.title),
    company: text(p.company),
    location: text(p.location),
    url: text(p.url),
    postedAt: Number(p.postedAt) || 0,
    precision: p.precision === "day" ? "day" : "exact",
    description: text(p.description),
  };

};
