import { BrowserWindow, type Cookie, app, session } from "electron";

const PARTITION = "persist:linkedin";
const LOGIN = "https://www.linkedin.com/login";

let tuned = false;

export function linkedInSession() {
  const ses = session.fromPartition(PARTITION);
  if (!tuned) {
    tuned = true;
    ses.setUserAgent(
      app.userAgentFallback
        .replace(/ Electron\/\S+/, "")
        .replace(" " + app.getName() + "/" + app.getVersion(), ""),
    );
  }
  return ses;
}

const isAuth = (c: Cookie) =>
  c.name === "li_at" && !!c.domain?.endsWith("linkedin.com");

export const signedIn = async () =>
  (await linkedInSession().cookies.get({ name: "li_at" })).some(isAuth);

export async function csrf() {
  const [jar] = await linkedInSession().cookies.get({
    name: "JSESSIONID",
    url: "https://www.linkedin.com",
  });
  return jar?.value.replaceAll('"', "");
}

export async function signOut() {
  const ses = linkedInSession();
  await ses.clearStorageData();
  await ses.cookies.flushStore();
}

let pending: Promise<boolean> | null = null;

export function connect(parent?: BrowserWindow) {
  pending ??= login(parent).finally(() => (pending = null));
  return pending;
}

async function login(parent?: BrowserWindow) {
  await signOut();
  const ses = linkedInSession();
  const win = new BrowserWindow({
    width: 480,
    height: 760,
    title: "LinkedIn",
    parent,
    backgroundColor: "#ffffff",
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  return new Promise<boolean>((resolve) => {
    const changed = (
      _e: unknown,
      cookie: Cookie,
      _cause: string,
      removed: boolean,
    ) => {
      if (removed || !isAuth(cookie)) return;
      done(true);
      ses.cookies.flushStore().finally(() => win.isDestroyed() || win.close());
    };
    const done = (ok: boolean) => {
      ses.cookies.off("changed", changed);
      resolve(ok);
    };
    ses.cookies.on("changed", changed);
    win.on("closed", () => done(false));
    win.loadURL(LOGIN).catch(() => {});
  });
}
