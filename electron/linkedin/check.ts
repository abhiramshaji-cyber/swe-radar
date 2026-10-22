import { BrowserWindow } from "electron";
import {
  type Verdict,
  parseJobPage,
  parseVoyager,
} from "../../core/listed/parse";
import { csrf, linkedInSession } from "./session";

const TIMEOUT = 20_000;
const RENDER = 15_000;
const TICK = 1_000;
const BLOCKED = [401, 999];

export class Challenged extends Error {}

const path = (url: string) => (URL.canParse(url) ? new URL(url).pathname : "");

const challenged = (url: string) =>
  /^\/(login|checkpoint|authwall|uas)\b/.test(path(url));

const voyagerUrl = (id: string) =>
  "https://www.linkedin.com/voyager/api/jobs/jobPostings/" +
  id +
  "?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65";

async function voyager(id: string): Promise<Verdict | null> {
  const token = await csrf();
  if (!token) return null;
  const res = await linkedInSession().fetch(voyagerUrl(id), {
    headers: {
      "csrf-token": token,
      "x-restli-protocol-version": "2.0.0",
      accept: "application/vnd.linkedin.normalized+json+2.1",
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (BLOCKED.includes(res.status))
    throw new Challenged("LinkedIn signed out (" + res.status + ")");
  if (!res.ok) return null;
  return parseVoyager(await res.json().catch(() => null), id);
}

async function rendered(win: BrowserWindow) {
  const end = Date.now() + RENDER;
  for (;;) {
    const html: string = await win.webContents.executeJavaScript(
      "document.documentElement.outerHTML",
    );
    const verdict = parseJobPage(html);
    if (verdict || Date.now() > end) return verdict;
    await new Promise((r) => setTimeout(r, TICK));
  }
}

async function page(id: string): Promise<Verdict | null> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      session: linkedInSession(),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.webContents.setAudioMuted(true);
  try {
    await win
      .loadURL("https://www.linkedin.com/jobs/view/" + id + "/")
      .catch(() => {});
    const url = win.webContents.getURL();
    if (challenged(url))
      throw new Challenged("LinkedIn asked to sign in again");
    return path(url).startsWith("/jobs/view/" + id)
      ? await rendered(win)
      : null;
  } finally {
    win.destroy();
  }
}

export const checkJob = async (id: string) =>
  (await voyager(id)) ?? (await page(id));
