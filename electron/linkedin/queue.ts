import fs from "node:fs";
import { BrowserWindow, ipcMain } from "electron";
import { type Verdicts, due } from "../../core/listed/confirm";
import { DAY } from "../../core/time";
import type { Row } from "../../core/types";
import { log } from "../log";
import { Challenged, checkJob } from "./check";
import { connect, signOut, signedIn } from "./session";

const PAUSE = [3_000, 8_000];
const RETRY = 15 * 60_000;
const MEMORY = 30 * DAY;

export type LinkedInState = { signedIn: boolean; verdicts: Verdicts };

let file = "";
let verdicts: Verdicts = {};
let latest: Row[] = [];
let signed = false;
let running = false;
let retry: NodeJS.Timeout | undefined;
const failed = new Map<string, number>();

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const pause = () =>
  new Promise((r) =>
    setTimeout(r, PAUSE[0] + Math.random() * (PAUSE[1] - PAUSE[0])),
  );

function load(now: number): Verdicts {
  try {
    const all: Verdicts = JSON.parse(fs.readFileSync(file, "utf8"));
    return Object.fromEntries(
      Object.entries(all).filter(
        ([, v]) => typeof v?.reposted === "boolean" && now - v.checked < MEMORY,
      ),
    );
  } catch {
    return {};
  }
}

function save() {
  fs.writeFileSync(file + ".tmp", JSON.stringify(verdicts), { flush: true });
  fs.renameSync(file + ".tmp", file);
}

const bare = (): Verdicts =>
  Object.fromEntries(
    Object.entries(verdicts).map(([k, { description: _, ...v }]) => [k, v]),
  );

const state = (): LinkedInState => ({ signedIn: signed, verdicts: bare() });

export const describedBy = (key: string) => verdicts[key]?.description;

function tell() {
  for (const w of BrowserWindow.getAllWindows())
    w.webContents.isDestroyed() || w.webContents.send("linkedin", state());
}

async function expire(why: string) {
  signed = false;
  log("linkedin · " + why + " · back to guessing reposts");
  await signOut();
  tell();
}

const next = (now: number) =>
  due(latest, verdicts).find(
    (r) => !(now - (failed.get(r.key) ?? -Infinity) < RETRY),
  );

async function check(row: Row) {
  try {
    const verdict = await checkJob(row.key.split(":")[1]);
    if (!verdict) {
      failed.set(row.key, Date.now());
      log(
        "linkedin · no repost signal · " +
          row.title +
          " · " +
          row.company +
          " · retry later",
      );
      return;
    }
    verdicts[row.key] = { ...verdict, checked: Date.now() };
    failed.delete(row.key);
    save();
    tell();
    log(
      "linkedin · " +
        (verdict.reposted ? "reposted" : "fresh") +
        " via " +
        verdict.via +
        (verdict.description ? " + description" : "") +
        " · " +
        row.title +
        " · " +
        row.company,
    );
  } catch (e) {
    if (e instanceof Challenged) return expire(e.message);
    failed.set(row.key, Date.now());
    log("linkedin · check failed · " + row.title + " · " + message(e));
  }
}

async function drain() {
  if (running || !signed) return;
  running = true;
  clearTimeout(retry);
  try {
    for (
      let row = next(Date.now()), first = true;
      row && signed;
      row = next(Date.now()), first = false
    ) {
      if (!first) await pause();
      await check(row);
    }
  } finally {
    running = false;
  }
  if (signed && due(latest, verdicts).length) retry = setTimeout(drain, RETRY);
}

export function offer(rows: Row[]) {
  latest = rows;
  void drain();
}

export function startLinkedIn(path: string) {
  file = path;
  verdicts = load(Date.now());
  const ready = signedIn().then((on) => {
    signed = on;
    tell();
    void drain();
  });

  ipcMain.handle("linkedin", () => ready.then(state));
  ipcMain.handle("linkedin:connect", async (e) => {
    await ready;
    const ok = await connect(
      BrowserWindow.fromWebContents(e.sender) ?? undefined,
    );
    signed = ok && (await signedIn());
    log("linkedin · " + (signed ? "connected" : "login closed"));
    tell();
    void drain();
    return state();
  });
  ipcMain.handle("linkedin:disconnect", async () => {
    await ready;
    signed = false;
    await signOut();
    log("linkedin · disconnected");
    tell();
    return state();
  });
}
