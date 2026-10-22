import { HOUR, WINDOW_HOURS } from "../time";
import type { Tier } from "../types";

export const TIER_MS = WINDOW_HOURS.map((h) => h * HOUR);
export const LAST = TIER_MS.length - 1;

export function tierOf(at: number, now: number) {
  const t = TIER_MS.findIndex((ms) => at >= now - ms);
  return t < 0 ? LAST : t;
}

export function tracker(sources: number, emit: (tiers: Tier[]) => void) {
  const tiers: Tier[] = WINDOW_HOURS.map((hours) => ({ hours, state: "wait" }));
  const fetched = TIER_MS.map(() => 0);
  const waiting = TIER_MS.map(() => 0);
  const send = () => emit(tiers.map((t) => ({ ...t })));

  const check = () => {
    let changed = false;
    for (let t = 0, open = 0; t <= LAST; t++) {
      open += waiting[t];
      if (tiers[t].state === "ready") continue;
      if (fetched[t] < sources || open > 0) break;
      tiers[t].state = "ready";
      changed = true;
    }
    if (changed) send();
  };

  return {
    send,
    start(t: number) {
      if (tiers[t].state !== "wait") return;
      tiers[t].state = "run";
      send();
    },
    fetched(t: number, failed: boolean) {
      fetched[t]++;
      if (failed && !tiers[t].partial) {
        tiers[t].partial = true;
        send();
      }
      check();
    },
    queued(t: number, n: number) {
      waiting[t] += n;
    },
    classified(t: number, n: number) {
      waiting[t] -= n;
      check();
    },
  };
}
