import { APIError, TypeSafeClient } from "@typesafe-ai/sdk";
import { companyKey } from "../dedupe";
import { errorText, limit } from "../http";
import type { Settings } from "../settings";
import type { Extraction, Posting } from "../types";
import { classifyOne } from "./answer";

export { MODEL } from "./answer";

export const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
export const TIMEOUT = 30_000;
export const CONCURRENCY = 4;

export const MISSING_KEY = "Add your TypeSafe API key in Settings";

export type Classified = { results: Map<string, Extraction>; error: string | null; cost: number };

export type Outcome = { done: number; total: number; posting: Posting; extraction: Extraction | null; error: string | null };

export function classifier(
  apiKey: string | undefined,
  settings: Settings,
  companies: Record<string, number>,
  progress: (o: Outcome) => void,
  signal?: AbortSignal,
) {
  const results = new Map<string, Extraction>();
  const jev = apiKey ? new TypeSafeClient({ apiKey, timeout: TIMEOUT }) : null;
  const gate = limit(CONCURRENCY);
  const errors: string[] = [];
  let halt: string | null = null;
  let tokens = 0;
  let total = 0;
  let done = 0;

  const ask = async (client: TypeSafeClient, p: Posting) => {
    if (halt || signal?.aborted) return halt;
    try {
      const company = companyKey(p);
      const { extraction, usage } = await classifyOne(client, p, company ? companies[company] : undefined, settings, signal);
      tokens += usage.input_tokens;
      if (!extraction) return "Jev returned an invalid answer for " + p.title;
      if (company && extraction.companyScore !== null) companies[company] ??= extraction.companyScore;
      results.set(p.key, extraction);
      return null;
    } catch (e) {
      if (signal?.aborted) return null;
      const status = e instanceof APIError ? e.status : 0;
      if (status === 401 || status === 403)
        halt = "Jev rejected the TypeSafe API key (" + status + "), replace it in Settings";
      return halt ?? errorText(e);
    }
  };

  const one = async (client: TypeSafeClient, p: Posting) => {
    const error = await ask(client, p);
    if (error && error !== halt) errors.push(error);
    progress({ done: ++done, total, posting: p, extraction: results.get(p.key) ?? null, error });
  };

  const add = async (postings: Posting[], rank = 0) => {
    if (!jev || !postings.length) return;
    total += postings.length;
    await Promise.all(postings.map((p) => gate(() => one(jev, p), rank)));
  };

  const finish = (): Classified => {
    if (!jev) return { results, error: MISSING_KEY, cost: 0 };
    const first = halt ?? errors[0];
    const error = first
      ? first + "; " + (total - results.size) + " of " + total + " postings unclassified"
      : null;
    return { results, error, cost: tokens * USD_PER_INPUT_TOKEN };
  };

  return { add, finish };
}
