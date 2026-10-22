import fs from "node:fs";
import path from "node:path";
import { ipcMain, powerMonitor } from "electron";
import { soonest } from "../../core/refresh";
import { ready } from "../../core/settings";
import { loadStore } from "../../core/store";
import { HOUR } from "../../core/time";
import { type Run, broadcast, runInfo, scanFromMain, scanning, scans } from "../scan";
import { userSettings } from "../userdata";

export type Plan = {
  last?: number;
  next: number;
  paused: boolean;
  run: Run | null;
};

const SETTLE = 60_000;

let file = "";
let launched = 0;
let calm = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let listener: (plan: Plan) => void = () => {};

const pauseFile = () => path.join(path.dirname(file), "schedule-paused");

export function plan(): Plan {
  const store = loadStore(file);
  const paused = fs.existsSync(pauseFile());
  const held = paused || !!store.scan || !ready(userSettings());
  return {
    last: store.last?.at,
    next: held ? Infinity : Math.max(soonest(store, launched), calm),
    paused,
    run: runInfo(),
  };
}

function arm() {
  clearTimeout(timer);
  const now = plan();
  listener(now);
  broadcast("plan", now);
  if (Number.isFinite(now.next))
    timer = setTimeout(
      tick,
      Math.min(Math.max(0, now.next - Date.now()), HOUR),
    );
}

function tick() {
  if (scanning()) return;
  if (plan().next > Date.now()) return arm();
  scanFromMain(file, launched);
}

export function toggleSchedule() {
  if (fs.existsSync(pauseFile())) fs.rmSync(pauseFile());
  else fs.writeFileSync(pauseFile(), "");
  arm();
}

export function startSchedule(
  storeFile: string,
  background: boolean,
  onPlan: (plan: Plan) => void,
) {
  file = storeFile;
  launched = background ? 0 : Date.now();
  listener = onPlan;
  scans.on("start", () => listener(plan()));
  scans.on("end", () => {
    calm = Date.now() + SETTLE;
    arm();
  });
  powerMonitor.on("resume", tick);
  ipcMain.handle("plan", plan);
  arm();
}

export { arm as replan };
