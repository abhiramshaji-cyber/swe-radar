import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Exit = { code: number | null; stdout: string; stderr: string };

export type Cli = { name: string; bin: string; notFound: string };

export function run(
  cli: Cli,
  cmd: string,
  args: string[],
  cwd: string,
  timeout: number,
  input?: string,
) {
  return new Promise<Exit>((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: [
        path.dirname(cmd),
        process.env.PATH,
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
      ]
        .filter(Boolean)
        .join(":"),
    };
    const child = spawn(cmd, args, {
      cwd,
      env,
      detached: true,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      reject(new Error(cli.name + " took too long. Try again."));
    }, timeout);
    child.stdin?.on("error", () => {});
    child.stdin?.end(input);
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(e.code === "ENOENT" ? new Error(cli.notFound) : e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const executable = (p: string) => {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return path.isAbsolute(p);
  } catch {
    return false;
  }
};

const MARK = "__SWE_RADAR_PATH__";

async function loginPath(cli: Cli) {
  const shell = process.env.SHELL || "/bin/zsh";
  const r = await run(
    cli,
    shell,
    ["-ilc", `printf '${MARK}%s${MARK}' "$PATH"`],
    os.homedir(),
    15_000,
  ).catch(() => null);
  return r?.stdout.split(MARK)[1] ?? "";
}

const resolved = new Map<string, Promise<string>>();

export function locate(cli: Cli) {
  let found = resolved.get(cli.bin);
  if (!found) {
    found = (async () => {
      const home = os.homedir();
      const dirs = [
        ...new Set(
          [
            ...(await loginPath(cli)).split(":"),
            ...(process.env.PATH ?? "").split(":"),
          ].filter(Boolean),
        ),
      ];
      process.env.PATH = dirs.join(":");
      const onPath = dirs.map((d) => path.join(d, cli.bin));
      const hit = [
        ...onPath,
        home + "/.local/bin/" + cli.bin,
        "/opt/homebrew/bin/" + cli.bin,
        "/usr/local/bin/" + cli.bin,
      ].find(executable);
      if (!hit) throw new Error(cli.notFound);
      return hit;
    })();
    found.catch(() => resolved.delete(cli.bin));
    resolved.set(cli.bin, found);
  }
  return found;
}

export const failed = (cli: Cli, r: Exit) =>
  new Error(
    cli.name +
      " failed: " +
      (r.stderr.trim().split("\n").pop() || "exit " + r.code).slice(0, 200),
  );

export async function inTemp<T>(work: (dir: string) => Promise<T>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swe-radar-ask-"));
  try {
    return await work(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
