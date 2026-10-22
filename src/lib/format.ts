import type { Extraction, Repost, Row } from "../../core/types";

const DAY = 86_400_000;

export function relativeTime(r: Row, now: number) {
  if (r.precision === "day") {
    const start = new Date(now).setHours(0, 0, 0, 0);
    return r.postedAt >= start
      ? "today"
      : r.postedAt >= start - DAY
        ? "yesterday"
        : new Date(r.postedAt).toLocaleDateString([], { month: "short", day: "numeric" });
  }
  const mins = Math.max(0, Math.round((now - r.effectiveAt) / 60_000));
  if (mins < 60) return mins + "m";
  const hours = Math.floor(mins / 60);
  return hours < 48 ? hours + "h" : Math.floor(hours / 24) + "d";
}

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", maximumFractionDigits: 0 }).format(n);

export function payLabel(r: Row) {
  if (!r.salary) return "";
  const { min, max, currency } = r.salary;
  if (r.estimated) return "~" + money((min + max) / 2, currency);
  return money(min, currency) === money(max, currency) ? money(min, currency) : money(min, currency) + "–" + money(max, currency);
}

const LEVEL: Record<Extraction["seniority"], string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff_plus: "Staff+",
  manager: "Manager",
  unknown: "",
};

export const levelLabel = (e: Extraction) =>
  [LEVEL[e.seniority], e.minYears ? e.minYears + "y+" : ""]
    .filter(Boolean)
    .join(" · ");

export const usd = (n: number) =>
  "$" + (n > 0 && n < 0.01 ? n.toFixed(4) : n.toFixed(2));

export const failure = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).replace(
    /^Error invoking remote method '[^']+': (Error: )?/,
    "",
  );

const SIGNAL: Record<Repost["signal"], string> = {
  board: "on the board since",
  history: "first listed",
  bumped: "up since",
  age: "first listed around",
  linkedin: "first listed",
};

const when = (at: number, r: Repost) =>
  new Date(at).toLocaleDateString([], r.signal === "age" ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" });

export const repostTip = (r: Repost) =>
  r.at ? "Reposted · " + SIGNAL[r.signal] + " " + when(r.at, r) : "Reposted on LinkedIn";
