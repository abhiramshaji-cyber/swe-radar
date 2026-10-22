import { TypeSafeClient, noul } from "@typesafe-ai/sdk";
import { limit } from "../http";
import type { Settings } from "../settings";
import { schemaOf } from "../settings/file";
import type { Posting } from "../types";
import { MODEL } from "./answer";
import { CONCURRENCY, TIMEOUT, USD_PER_INPUT_TOKEN } from "./index";

const question = (s: Settings) => ({
  reach: noul(
    "Could a job listed at the location in `place` possibly be taken by someone in one of these regions: " +
      s.regions.map((r) => r.label + " (" + r.description + ")").join("; ") +
      "? Answer yes when unsure, when the location is vague, remote, multi-country or worldwide, or when it could be inside one of them.",
    {
      true: "The location is inside, overlaps, or could be remote-reachable from one of the regions.",
      false:
        "The location is clearly a specific place outside every region, such as a city or country elsewhere.",
    },
  ),
});

export const placeKey = (settings: Settings, location: string) =>
  schemaOf(settings) + "\n" + location.trim().toLowerCase();

export function reacher(
  apiKey: string | undefined,
  settings: Settings,
  places: Record<string, boolean>,
  signal?: AbortSignal,
) {
  const jev = apiKey ? new TypeSafeClient({ apiKey, timeout: TIMEOUT }) : null;
  const gate = limit(CONCURRENCY);
  const asked = new Map<string, Promise<boolean>>();
  let tokens = 0;

  const ask = async (client: TypeSafeClient, key: string, location: string) => {
    try {
      const { answers, usage } = await client.systemOne(
        {
          model: MODEL,
          state: { place: location },
          questions: question(settings),
        },
        { signal },
      );
      tokens += usage.input_tokens;
      return (places[key] = answers.reach.noul >= 0.5);
    } catch {
      return true;
    }
  };

  const one = (location: string) => {
    const key = placeKey(settings, location);
    if (!jev || !location.trim() || signal?.aborted)
      return Promise.resolve(true);
    if (key in places) return Promise.resolve(places[key]);
    if (!asked.has(key))
      asked.set(
        key,
        gate(() => ask(jev, key, location)),
      );
    return asked.get(key)!;
  };

  const within = async (postings: Posting[]) => {
    const verdicts = await Promise.all(postings.map((p) => one(p.location)));
    return postings.filter((_, i) => verdicts[i]);
  };

  return { within, cost: () => tokens * USD_PER_INPUT_TOKEN };
}
