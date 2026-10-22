import type { Provider } from "../../settings";
import { claude } from "./claude";
import { codex } from "./codex";

export type Options = { search?: boolean; timeout?: number };

const TIMEOUT = 180_000;

export const PROVIDER_ENV = "SWE_RADAR_PROVIDER";

export const provider = (): Provider =>
  process.env[PROVIDER_ENV] === "claude" ? "claude" : "codex";

const NAME: Record<Provider, string> = {
  codex: "Codex",
  claude: "Claude Code",
};

export function ask(
  instructions: string,
  prompt: string,
  schema?: object,
  opts: Options = {},
) {
  const run = provider() === "claude" ? claude : codex;
  return run(instructions, prompt, schema, {
    search: opts.search ?? false,
    timeout: opts.timeout ?? TIMEOUT,
  });
}

export async function askJson(
  instructions: string,
  prompt: string,
  schema: object,
  opts?: Options,
): Promise<unknown> {
  const text = await ask(instructions, prompt, schema, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(NAME[provider()] + " returned broken output. Try again.");
  }
}
