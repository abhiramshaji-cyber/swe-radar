import { DAY } from "../time";
import type { Rated, Rating } from "../types";

const HIT = 30 * DAY;
const MISS = 7 * DAY;
const FAILED = DAY;

export const isRated = (r: Rating): r is Rated => !("miss" in r);

const ttl = (r: Rating) => (isRated(r) ? HIT : r.failed ? FAILED : MISS);

const valid = (r: any): r is Rating =>
  Number.isFinite(r?.at) &&
  (r.miss === true ||
    (Number.isFinite(r.rating) && Number.isInteger(r.reviews) && typeof r.url === "string" && typeof r.employer === "string"));

export const readRatings = (v: unknown): Record<string, Rating> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, r]) => valid(r)))
    : {};

export const expireRatings = (m: Record<string, Rating>, now: number) =>
  Object.fromEntries(Object.entries(m).filter(([, r]) => now - r.at < ttl(r)));

export const hits = (m: Record<string, Rating>): Record<string, Rated> =>
  Object.fromEntries(Object.entries(m).filter((e): e is [string, Rated] => isRated(e[1])));
