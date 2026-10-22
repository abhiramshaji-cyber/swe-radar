import path from "node:path";
import { app, ipcMain } from "electron";
import { PROVIDER_ENV } from "../core/ask/ai";
import type { Settings } from "../core/settings";
import { readSettings, saveSettings } from "../core/settings/file";

const NAME = "SWE Radar";

export function pinUserData() {
  if (!app.commandLine.hasSwitch("user-data-dir"))
    app.setPath("userData", path.join(app.getPath("appData"), NAME));
}

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

const applied = (s: Settings) => {
  process.env[PROVIDER_ENV] = s.provider;
  return s;
};

export const userSettings = () => applied(readSettings(settingsFile()));

export const setUserSettings = (value: unknown) =>
  applied(saveSettings(settingsFile(), value));

export function handleSettings(saved: (s: Settings) => void) {
  ipcMain.handle("settings", userSettings);
  ipcMain.handle("settings:set", (_e, value: unknown) => {
    const s = setUserSettings(value);
    saved(s);
    return s;
  });
}
