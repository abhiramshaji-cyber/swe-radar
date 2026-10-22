import { fetchDescription } from "../core/ask/describe";
import { hasDescription, longest, realText } from "../core/docs/description";
import { learnDescription, loadStore, saveStore } from "../core/store";
import type { Posting } from "../core/types";
import { describedBy } from "./linkedin/queue";
import { log } from "./log";
import { rescoreFromMain, scanning } from "./scan";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function persist(file: string, key: string, description: string) {
  await scanning()?.catch(() => {});
  saveStore(file, learnDescription(loadStore(file), key, description));
  log("description saved · " + key);
  rescoreFromMain(file);
}

export async function refetch(file: string, p: Posting) {
  const s = loadStore(file);
  const stored = s.jobs[p.key]?.description;
  const have = longest(p.description, s.descriptions[p.key], stored, describedBy(p.key));
  const found = hasDescription(have)
    ? have
    : longest(have, await fetchDescription(p).catch((e) => {
        throw new Error("Couldn't fetch the description · " + message(e));
      }));
  if (!hasDescription(found)) throw new Error("The posting has no description yet. Try again later.");
  if (realText(found).length > realText(stored).length)
    persist(file, p.key, found).catch((e) => log("description save failed · " + message(e)));
  return found;
}

export const describeFor = (file: string) => (p: Posting) =>
  refetch(file, p).catch(() => longest(p.description, loadStore(file).descriptions[p.key]));
