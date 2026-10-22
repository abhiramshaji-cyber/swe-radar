import type { Options } from "./index";
import { type Cli, failed, inTemp, locate, run } from "./run";

const CLI: Cli = {
  name: "Claude Code",
  bin: "claude",
  notFound:
    "Claude Code not found. Install it and run `claude` once to sign in.",
};

const parse = (stdout: string) => {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
};

export const claude = (
  instructions: string,
  prompt: string,
  schema: object | undefined,
  opts: Required<Options>,
) =>
  inTemp(async (cwd) => {
    const bin = await locate(CLI);
    const r = await run(
      CLI,
      bin,
      [
        "-p",
        "--output-format",
        "json",
        "--no-session-persistence",
        "--setting-sources",
        "",
        "--strict-mcp-config",
        "--system-prompt",
        instructions,
        ...(opts.search
          ? ["--tools", "WebSearch", "--allowedTools", "WebSearch"]
          : ["--tools", ""]),
        ...(schema ? ["--json-schema", JSON.stringify(schema)] : []),
      ],
      cwd,
      opts.timeout,
      prompt,
    );
    const out = parse(r.stdout);
    if (r.code !== 0 && !out) throw failed(CLI, r);
    if (!out || out.is_error || out.subtype !== "success")
      throw new Error(
        "Claude Code failed: " +
          String(out?.result ?? out?.subtype ?? "exit " + r.code).slice(0, 200),
      );
    const answer =
      schema && out.structured_output !== undefined
        ? JSON.stringify(out.structured_output)
        : String(out.result ?? "").trim();
    if (!answer) throw new Error("Claude Code returned nothing. Try again.");
    return answer;
  });
