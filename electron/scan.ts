import { EventEmitter } from "node:events";
import { BrowserWindow, ipcMain } from "electron";
import { type Hooks, SOURCES, refresh, rescore } from "../core/refresh";
import { NOT_READY, type Settings, ready } from "../core/settings";
import { loadStore } from "../core/store";
import type { RefreshResult } from "../core/types";
import { readKey } from "./key";
import { describedBy, offer } from "./linkedin/queue";
import { log, logClassified, logResult, logStatus } from "./log";
import { userSettings } from "./userdata";

const REPLACED = "Replaced by a newer refresh.";

let running: Promise<RefreshResult | null> | null = null;
let stop: AbortController | null = null;
let ticket = 0;
let current: Run = { id: 0, scan: false };

type Task = "auto" | "resume" | "refresh" | "rescore";

export type Run = { id: number; scan: boolean };

export const scans = new EventEmitter<{ start: []; end: [] }>();

export const scanning = () => running;

export const runInfo = (): Run | null => (running ? current : null);

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const pauseScan = () => stop?.abort(new Error("Paused."));

export const broadcast = (channel: string, payload: unknown) => {
  for (const w of BrowserWindow.getAllWindows())
    w.webContents.isDestroyed() || w.webContents.send(channel, payload);
};

const hooks = (settings: Settings): Hooks => ({
  status: (s) => {
    logStatus(s);
    broadcast("status", s);
  },
  rows: (rows) => {
    offer(rows);
    broadcast("rows", rows);
  },
  classifying: (c) => broadcast("classifying", c),
  tiers: (t) => broadcast("tiers", t),
  classified: (o) => logClassified(o, settings),
});

function configured() {
  const settings = userSettings();
  if (!ready(settings)) throw new Error(NOT_READY);
  return settings;
}

async function start(
  task: Task,
  make: (signal: AbortSignal) => Promise<RefreshResult | null>,
) {
  const mine = ++ticket;
  stop?.abort(new Error(REPLACED));
  await running?.catch(() => {});
  if (mine !== ticket) throw new Error(REPLACED);
  const { signal } = (stop = new AbortController());
  current = { id: mine, scan: task !== "rescore" };
  log(task);
  broadcast("scan", { phase: "start", ...current });
  const run: Promise<RefreshResult | null> = new Promise<RefreshResult | null>((r) => r(make(signal)))
    .then(
      (r) => r && logResult(r),
      (e) => {
        log(task + " failed · " + message(e));
        throw e;
      },
    )
    .finally(() => {
      if (running === run) running = null;
      scans.emit("end");
    });
  running = run;
  run.then(
    (result) => {
      if (result) offer(result.rows);
      broadcast("scan", { phase: "end", id: mine, result });
    },
    (e) => broadcast("scan", { phase: "end", id: mine, error: message(e) }),
  );
  scans.emit("start");
  return run;
}

const fetchJobs = (
  file: string,
  task: Task,
  resume: boolean,
  launched?: number,
) =>
  start(task, (signal) => {
    const settings = configured();
    return refresh(file, hooks(settings), {
      settings,
      apiKey: readKey(),
      sources: SOURCES,
      signal,
      resume,
      launched,
      described: describedBy,
    });
  });

export function scanFromMain(file: string, launched?: number) {
  const auto = launched !== undefined;
  const resume = !auto && !!loadStore(file).scan;
  const task = auto ? "auto" : resume ? "resume" : "refresh";
  fetchJobs(file, task, resume, launched).catch(() => {});
}

const rescoreNow = (file: string) =>
  start("rescore", () => {
    const settings = configured();
    return rescore(file, hooks(settings), settings, readKey());
  });

export const rescoreFromMain = (file: string) => rescoreNow(file).catch(() => {});

export function handleScans(storeFile: () => string) {
  ipcMain.handle("refresh", (_e, resume: unknown) =>
    fetchJobs(
      storeFile(),
      resume === true ? "resume" : "refresh",
      resume === true,
    ),
  );
  ipcMain.handle("pause", () => {
    log("pause");
    pauseScan();
  });
  ipcMain.handle("rescore", () => rescoreNow(storeFile()));
}
