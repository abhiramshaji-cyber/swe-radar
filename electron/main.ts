import fs from "node:fs";
import path from "node:path";
import { app, clipboard, ipcMain, shell } from "electron";
import { askJob } from "../core/ask/answer";
import { readProfile, saveProfile } from "../core/ask/profile";
import { DOC_KINDS, type DocKind, letterText, makeDoc } from "../core/docs/make";
import { lastResult } from "../core/refresh";
import { readSnippets, saveSnippets } from "../core/snippets";
import { ready } from "../core/settings";
import { type Store, loadStore, pruneStore, saveStore } from "../core/store";
import { expireRatings, hits } from "../core/rating/expiry";
import { rateCompanies } from "../core/rating/run";
import { markReposts } from "../core/repost";
import { describeFor, refetch } from "./describe";
import { posting } from "./posting";
import { clearKey, hasKey, saveKey } from "./key";
import { logs } from "./log";
import { installAgent, retireAgent } from "./background/agent";
import { BACKGROUND } from "./background/plist";
import { replan, startSchedule, toggleSchedule } from "./background/schedule";
import { showTray } from "./background/tray";
import { allowQuit, appMenu, openWindow as open } from "./background/window";
import { offer, startLinkedIn } from "./linkedin/queue";
import { broadcast, handleScans, pauseScan, scanFromMain, scanning, scans } from "./scan";
import { handleSettings, pinUserData, userSettings } from "./userdata";

pinUserData();

const background = process.argv.includes(BACKGROUND);

const storeFile = () => path.join(app.getPath("userData"), "store.json");
const profileFile = () => path.join(app.getPath("userData"), "profile.md");
const proxiesFile = () => path.join(app.getPath("userData"), "proxies.txt");
const snippetsFile = () => path.join(app.getPath("userData"), "snippets.json");

function last() {
  const result = lastResult(storeFile(), userSettings());
  if (result) offer(result.rows);
  return result;
}

ipcMain.handle("last", last);
handleScans(storeFile);

ipcMain.handle("logs", logs);
ipcMain.handle("copy", (_e, text: unknown) =>
  clipboard.writeText(String(text)),
);

ipcMain.handle("key:has", hasKey);
ipcMain.handle("key:set", (_e, key: unknown) => void saveKey(key));
ipcMain.handle("key:clear", clearKey);

function idle() {
  if (scanning()) throw new Error("Wait for the refresh to finish.");
}

function update(change: (s: Store) => Partial<Store>) {
  idle();
  const store = loadStore(storeFile());
  const next = { ...store, ...change(store) };
  saveStore(storeFile(), next);
  return next;
}

const rate = () =>
  void setTimeout(() => {
    const settings = userSettings();
    if (ready(settings)) rateCompanies(storeFile(), { settings, idle: scanning, saved: (r) => broadcast("ratings", r) });
  });
ipcMain.handle("ratings", () => hits(expireRatings(loadStore(storeFile()).ratings, Date.now())));
scans.on("end", rate);

ipcMain.handle("spent", () => loadStore(storeFile()).spent);
ipcMain.handle("spent:reset", () => void update(() => ({ spent: 0 })));

ipcMain.handle("reset", async () => {
  pauseScan();
  await scanning()?.catch(() => {});
  update(() => ({ jobs: {}, scan: null, last: null, scanned: {} }));
});

ipcMain.handle("applied", () => loadStore(storeFile()).applied);
ipcMain.handle("applied:set", async (_e, key: unknown, on: unknown) => {
  if (typeof key !== "string") throw new Error("Unknown job.");
  await scanning()?.catch(() => {});
  update((s) => ({
    applied: [
      ...s.applied.filter((k) => k !== key),
      ...(on === true ? [key] : []),
    ],
  }));
});

ipcMain.handle("ask", (_e, job: unknown, question: unknown) =>
  askJob(profileFile(), posting(job), question, describeFor(storeFile())),
);
ipcMain.handle("doc", (_e, job: unknown, kind: unknown) => {
  if (!DOC_KINDS.includes(kind as DocKind))
    throw new Error("Unknown document.");
  return makeDoc(
    app.getPath("downloads"),
    posting(job),
    kind as DocKind,
    describeFor(storeFile()),
  );
});
ipcMain.handle("letter:copy", async (_e, job: unknown) =>
  clipboard.writeText(await letterText(posting(job), describeFor(storeFile()))),
);
ipcMain.handle("describe", (_e, job: unknown) => refetch(storeFile(), posting(job)));

const downloaded = (file: unknown) => {
  if (
    typeof file !== "string" ||
    !file.endsWith(".pdf") ||
    path.dirname(file) !== app.getPath("downloads")
  )
    throw new Error("Unknown file.");
  return file;
};

ipcMain.handle("file:open", async (_e, file: unknown) => {
  const failed = await shell.openPath(downloaded(file));
  if (failed) throw new Error(failed);
});
ipcMain.handle("file:show", (_e, file: unknown) =>
  shell.showItemInFolder(downloaded(file)),
);
ipcMain.handle("profile", () => readProfile(profileFile()));
ipcMain.handle("profile:set", (_e, value: unknown) =>
  saveProfile(profileFile(), value),
);

handleSettings((s) => {
  broadcast("settings", s);
  replan();
  rate();
});

ipcMain.handle("snippets", () => readSnippets(snippetsFile()));
ipcMain.handle("snippets:set", (_e, list: unknown) =>
  saveSnippets(snippetsFile(), list),
);

ipcMain.handle("open", (_e, url: unknown) => {
  if (typeof url === "string" && /^https?:\/\//.test(url))
    return shell.openExternal(url);
});

function boot() {
  userSettings();
  const now = Date.now();
  saveStore(storeFile(), markReposts(pruneStore(loadStore(storeFile()), now), now));
  if (!process.env.SWE_RADAR_PROXIES && fs.existsSync(proxiesFile()))
    process.env.SWE_RADAR_PROXIES = fs.readFileSync(proxiesFile(), "utf8");
  app.applicationMenu = appMenu();
  startLinkedIn(path.join(app.getPath("userData"), "linkedin.json"));
  last();
  rate();
  installAgent();
  const tray = showTray({
    open,
    fetch: () => void scanFromMain(storeFile()),
    pause: toggleSchedule,
    quit: () => {
      allowQuit();
      retireAgent();
      app.quit();
    },
  });
  startSchedule(storeFile(), background, tray);
  if (background) app.dock?.hide();
  else open();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", (_e, argv) => argv.includes(BACKGROUND) || open());
  app.on("activate", open);
  app.on("before-quit", allowQuit);
  app.on("window-all-closed", () => {});
  app.whenReady().then(boot);
}
