import type { Outcome } from "../jev";
import { resetHosts } from "../http";
import type { Settings } from "../settings";
import type { Classifying, Row, SourceStatus, Tier } from "../types";
import { collect } from "./collect";
import { SOURCES } from "./sources";

export { SOURCES };
export { soonest } from "./pace";
export { lastResult, rescore } from "./rows";

export type Hooks = {
  status: (s: SourceStatus) => void;
  rows?: (rows: Row[]) => void;
  classifying?: (c: Classifying) => void;
  tiers?: (t: Tier[]) => void;
  classified?: (o: Outcome) => void;
};

export type Options = {
  settings: Settings;
  apiKey?: string;
  now?: number;
  sources?: typeof SOURCES;
  signal?: AbortSignal;
  resume?: boolean;
  launched?: number;
  described?: (key: string) => string | undefined;
};

const hush = (on: Hooks, signal?: AbortSignal): Required<Hooks> => ({
  status: (s) => signal?.aborted || on.status(s),
  rows: (r) => signal?.aborted || on.rows?.(r),
  classifying: (c) => signal?.aborted || on.classifying?.(c),
  tiers: (t) => signal?.aborted || on.tiers?.(t),
  classified: (o) => signal?.aborted || on.classified?.(o),
});

export function refresh(file: string, on: Hooks, opts: Options) {
  resetHosts(opts.signal);
  return collect(file, hush(on, opts.signal), opts).finally(() => resetHosts());
}
