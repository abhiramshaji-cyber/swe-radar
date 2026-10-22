import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import pkg from "../../package.json";
import { BACKSTOP_SECONDS, agentPlist } from "./plist";

export const LABEL = pkg.build.appId;

const domain = () => "gui/" + process.getuid?.();
const plistFile = () =>
  path.join(os.homedir(), "Library", "LaunchAgents", LABEL + ".plist");
const launchctl = (...args: string[]) =>
  spawnSync("launchctl", args, { stdio: "ignore" }).status === 0;

export const agentAllowed = () =>
  process.platform === "darwin" &&
  app.isPackaged &&
  process.execPath.startsWith("/Applications/") &&
  !app.commandLine.hasSwitch("user-data-dir");

export const underAgent = () => process.env.XPC_SERVICE_NAME === LABEL;

export function installAgent() {
  if (!agentAllowed()) return;
  const file = plistFile();
  const text = agentPlist(LABEL, process.execPath, BACKSTOP_SECONDS);
  const same = fs.existsSync(file) && fs.readFileSync(file, "utf8") === text;
  if (!same) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  if (underAgent()) return;
  const loaded = launchctl("print", domain() + "/" + LABEL);
  if (loaded && same) return;
  if (loaded) launchctl("bootout", domain() + "/" + LABEL);
  launchctl("bootstrap", domain(), file);
}

export function retireAgent() {
  if (!agentAllowed()) return;
  spawn("launchctl", ["bootout", domain() + "/" + LABEL], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
