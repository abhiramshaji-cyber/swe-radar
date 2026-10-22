import fs from "node:fs";
import path from "node:path";
import type { Options } from "./index";
import { type Cli, failed, inTemp, locate, run } from "./run";

const CLI: Cli = {
  name: "Codex",
  bin: "codex",
  notFound: "Codex not found. Install it and run `codex` once to sign in.",
};

export const codex = (
  instructions: string,
  prompt: string,
  schema: object | undefined,
  opts: Required<Options>,
) =>
  inTemp(async (cwd) => {
    const bin = await locate(CLI);
    const output = path.join(cwd, "answer.txt");
    const schemaFile = path.join(cwd, "schema.json");
    if (schema) fs.writeFileSync(schemaFile, JSON.stringify(schema));
    const r = await run(
      CLI,
      bin,
      [
        ...(opts.search ? ["--search"] : []),
        "exec",
        "--ignore-user-config",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--disable",
        "shell_tool",
        "-c",
        "developer_instructions=" + JSON.stringify(instructions),
        ...(schema ? ["--output-schema", schemaFile] : []),
        "--output-last-message",
        output,
        prompt,
      ],
      cwd,
      opts.timeout,
    );
    if (r.code !== 0) throw failed(CLI, r);
    const answer = fs.existsSync(output)
      ? fs.readFileSync(output, "utf8").trim()
      : "";
    if (!answer) throw new Error("Codex returned nothing. Try again.");
    return answer;
  });
