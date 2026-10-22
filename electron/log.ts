import type { Settings } from "../core/settings";
import { BrowserWindow } from "electron";
import type { Outcome } from "../core/jev";
import { keep } from "../core/keep";
import type { RefreshResult, SourceStatus } from "../core/types";

const lines: string[] = [];
const latest = new Map<string, string>();

export const logs = () => lines;

export function log(text: string) {
  const line =
    new Date().toLocaleTimeString([], { hour12: false }) + "  " + text;
  const n = lines.push(line) - 1;
  for (const w of BrowserWindow.getAllWindows())
    w.webContents.send("log", { n, line });
}

export function logStatus(s: SourceStatus) {
  const parts =
    s.state === "running"
      ? [s.source, s.note ?? "started"]
      : [s.source, s.state + " " + s.count, s.label, s.note];
  const text = parts.filter(Boolean).join(" · ");
  if (latest.get(s.source) === text) return;
  latest.set(s.source, text);
  log(text);
}

export function logClassified({ done, total, posting, extraction, error }: Outcome, settings: Settings) {
  const verdict = error ? "unscored · " + error : extraction && keep(extraction, settings) ? "kept" : "filtered · " + extraction?.reason;
  log(`jev ${done}/${total} · ${posting.title} · ${posting.company} · ${verdict}`);
}

export function logResult(r: RefreshResult) {
  latest.clear();
  for (const [source, rows] of Map.groupBy(r.rows, (x) => x.source)) {
    const kept = rows.filter((x) => x.kept === true).length;
    const dropped = rows.filter((x) => x.kept === false).length;
    log(`${source} · ${rows.length} in window · ${kept} kept · ${dropped} filtered · ${rows.length - kept - dropped} unscored`);
  }
  if (r.classifyError) log("jev · " + r.classifyError);
  log(`done · ${r.rows.length} in window · ${r.rows.filter((x) => x.kept === true).length} kept`);
  return r;
}
