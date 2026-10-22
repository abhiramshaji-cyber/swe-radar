import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SOURCES, refresh } from "../core/refresh";
import { NOT_READY, ready } from "../core/settings";
import { readSettings } from "../core/settings/file";
import { HOUR } from "../core/time";
import type { Row } from "../core/types";

const dir =
  process.argv[2] ?? fs.mkdtempSync(path.join(os.tmpdir(), "swe-radar-smoke-"));
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "store.json");
const settings = readSettings(process.env.SWE_RADAR_SETTINGS ?? path.join(dir, "settings.json"));
if (!ready(settings)) throw new Error(NOT_READY + " Point SWE_RADAR_SETTINGS at a settings.json.");
const started = Date.now();

const since = () => ((Date.now() - started) / 1000).toFixed(1) + "s";
const announced = new Set<number>();
let latest: Row[] = [];
const batches: number[] = [];
let firstCard = 0;

const tierLine = (hours: number) => {
  const rows = latest.filter((r) => r.effectiveAt >= started - hours * HOUR);
  const kept = rows.filter((r) => r.kept === true).length;
  const open = rows.filter((r) => r.kept === null).length;
  return hours + "h ready: rows " + rows.length + ", kept " + kept + ", unclassified " + open;
};

const result = await refresh(
  file,
  {
    status: (s) => {
      if (s.state !== "running")
        console.error(
          since().padStart(7) + " " + s.source.padEnd(16) + s.state.padEnd(6) + String(s.count).padStart(4) + (s.note ? "  " + s.note : ""),
        );
    },
    rows: (rows) => {
      latest = rows;
      batches.push(Date.now() - started);
      if (!firstCard && rows.some((r) => r.kept === true)) firstCard = Date.now() - started;
    },
    tiers: (tiers) => {
      for (const t of tiers)
        if (t.state === "ready" && !announced.has(t.hours)) {
          announced.add(t.hours);
          console.error(since().padStart(7) + " TIER " + tierLine(t.hours) + (t.partial ? " (partial)" : ""));
        } else if (t.state === "run" && !announced.has(-t.hours)) {
          announced.add(-t.hours);
          console.error(since().padStart(7) + " tier " + t.hours + "h started");
        }
    },
  },
  { settings, apiKey: process.env.TYPESAFE_API_KEY?.trim(), sources: SOURCES },
);

const kept = result.rows.filter((r) => r.kept === true);
const unclassified = result.rows.filter((r) => r.kept === null);
const ago = (t: number) => Math.round((Date.now() - t) / 60_000) + "m ago";

const gaps = batches.slice(1).map((t, i) => t - batches[i]).sort((a, b) => a - b);
console.log(
  "rows events " + batches.length + ", first at " + batches[0] + "ms, median gap " + gaps[gaps.length >> 1] + "ms, first card " + (firstCard ? firstCard + "ms" : "none"),
);
console.log("store " + file);
console.log("took " + Math.round((Date.now() - started) / 1000) + "s");
console.log(
  "in-window " +
    result.rows.length +
    ", kept " +
    kept.length +
    ", filtered " +
    (result.rows.length - kept.length - unclassified.length) +
    ", unclassified " +
    unclassified.length,
);
if (result.classifyError) console.log("jev error: " + result.classifyError);
console.log("estimated jev cost $" + result.cost.toFixed(6));
for (const r of kept.slice(0, 5)) {
  console.log(
    "- " +
      ago(r.effectiveAt) +
      (r.precision === "day" ? " (~day)" : "") +
      " | " +
      r.title +
      " | " +
      r.company +
      " | " +
      r.location +
      " | " +
      r.source +
      " | " +
      r.extraction?.seniority +
      " " +
      (r.extraction?.minYears ?? "-") +
      "y | score " +
      Math.round(r.score) +
      " | " +
      r.extraction?.reason,
  );
}
