import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pkg from "../package.json";

const APP = "SWE Radar.app";
const release = path.join(import.meta.dir, "..", "release.noindex");
const built = fs
  .readdirSync(release)
  .map((d) => path.join(release, d, APP))
  .find((p) => fs.existsSync(p));
if (!built)
  throw new Error(
    "no " + APP + " under " + release + ", run bun run dist first",
  );

const writable = (dir: string) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const dir = process.env.SWE_RADAR_APPS ?? (writable("/Applications")
  ? "/Applications"
  : path.join(os.homedir(), "Applications"));
if (!writable(dir))
  throw new Error("neither /Applications nor ~/Applications is writable");
const target = path.join(dir, APP);

spawnSync("launchctl", ["bootout", "gui/" + process.getuid?.() + "/" + pkg.build.appId], { stdio: "ignore" });
const running = ["-f", target + "/Contents/MacOS/"];
spawnSync("pkill", running, { stdio: "ignore" });
for (let i = 0; i < 50 && spawnSync("pgrep", running).status === 0; i++) Bun.sleepSync(200);
if (spawnSync("pgrep", running).status === 0) throw new Error("SWE Radar is still running, quit it and retry");

const support = path.join(os.homedir(), "Library", "Application Support");
const data = path.join(support, "SWE Radar");
const backups = path.join(support, "SWE Radar Backups");
const STAMP = /^\d{8}-\d{6}$/;
if (fs.existsSync(data)) {
  const copy = path.join(backups, new Date().toLocaleString("sv").replace(/\D/g, "").replace(/^(\d{8})/, "$1-"));
  fs.cpSync(data, copy, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false });
  console.log("backed up " + data + " to " + copy);
  const old = fs.readdirSync(backups).filter((d) => STAMP.test(d)).sort().slice(0, -5);
  for (const d of old) fs.rmSync(path.join(backups, d), { recursive: true });
}

fs.rmSync(target, { recursive: true, force: true });
const r = spawnSync("ditto", [built, target], { stdio: "inherit" });
if (r.status !== 0) throw new Error("ditto failed with " + r.status);

const sign = spawnSync(
  "codesign",
  ["--force", "--deep", "--sign", "-", target],
  { stdio: "inherit" },
);
if (sign.status !== 0)
  throw new Error("ad-hoc codesign failed with " + sign.status);
console.log("installed " + target);
