import { parse } from "node-html-parser";
import { DAY } from "../time";

export type Verdict = { reposted: boolean; first?: number; via: string; description?: string };

const URN = /jobPosting:(\d+)/i;
const SHOWN =
  /^(reposted )?((\d+|an?|one) (second|minute|hour|day|week|month|year)s? ago|just now)$/i;

const stamp = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

function* walk(v: unknown): Generator<Record<string, unknown>> {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) {
    for (const x of v) yield* walk(x);
    return;
  }
  const o = v as Record<string, unknown>;
  yield o;
  for (const x of Object.values(o)) yield* walk(x);
}

const text = (v: unknown) => {
  const t = (v as { text?: unknown } | null)?.text;
  return typeof t === "string" && t.trim() ? t.trim() : undefined;
};

const isPosting = (o: Record<string, unknown>, id: string) =>
  [o.entityUrn, o.dashEntityUrn, o.trackingUrn].some(
    (u) => typeof u === "string" && u.match(URN)?.[1] === id,
  );

export function parseVoyager(json: unknown, id: string): Verdict | null {
  for (const o of walk(json)) {
    if (!isPosting(o, id)) continue;
    const first = stamp(o.originalListedAt);
    const listed = stamp(o.listedAt);
    const description = text(o.description);
    if (first && listed)
      return { reposted: listed - first > DAY, first, via: "originalListedAt", ...(description && { description }) };
  }
  return null;
}

const shown = (line: string) =>
  line
    .split("·")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .find((s) => SHOWN.test(s));

export function parseJobPage(html: string): Verdict | null {
  for (const p of parse(html).querySelectorAll("main p")) {
    if (!p.text.includes("·")) continue;
    const when = shown(p.text);
    if (when) return { reposted: /^reposted /i.test(when), via: "top-card" };
  }
  return null;
}
