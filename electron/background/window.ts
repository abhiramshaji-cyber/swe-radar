import path from "node:path";
import { BrowserWindow, Menu, app, shell } from "electron";
import { smoke } from "../smoke";

let win: BrowserWindow | null = null;
let quitting = false;

export const allowQuit = () => {
  quitting = true;
};

function createWindow() {
  const view = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    show: false,
    title: "SWE Radar",
    backgroundColor: "#f7f5fc",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });
  view.once("ready-to-show", () => {
    view.maximize();
    view.show();
    app.focus({ steal: true });
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  view.webContents.on("preload-error", (_e, file, error) =>
    console.error("preload " + file + ": " + error.message),
  );
  view.webContents.on("console-message", (e) => {
    if (e.level === "error") console.error("renderer: " + e.message);
  });
  if (process.env.ELECTRON_RENDERER_URL)
    view.loadURL(process.env.ELECTRON_RENDERER_URL);
  else view.loadFile(path.join(__dirname, "../renderer/index.html"));
  if (process.env.SWE_RADAR_SMOKE)
    view.webContents.once("did-finish-load", () => smoke(view));
  return view;
}

export function hideWindow() {
  win?.hide();
  app.dock?.hide();
}

export function openWindow() {
  void app.dock?.show();
  if (!win || win.isDestroyed()) {
    win = createWindow();
    win.on("close", (e) => {
      if (quitting) return;
      e.preventDefault();
      hideWindow();
    });
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  app.focus({ steal: true });
}

export const appMenu = () =>
  Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        {
          label: "Close " + app.name,
          accelerator: "Command+Q",
          click: hideWindow,
        },
      ],
    },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]);
