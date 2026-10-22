import { useSyncExternalStore } from "react";
import type { Rated } from "../../core/types";

let ratings: Record<string, Rated> = {};
const listeners = new Set<() => void>();

const set = (next: Record<string, Rated>) => {
  ratings = next && typeof next === "object" ? next : {};
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

window.radar.ratings().then(set, () => {});
window.radar.onRatings(set);

export const useRatings = () => useSyncExternalStore(subscribe, () => ratings);
