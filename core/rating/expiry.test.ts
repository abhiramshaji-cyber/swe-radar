import { expect, test } from "bun:test";
import { loadStore, pruneStore } from "../store";
import { DAY, HOUR } from "../time";
import { expireRatings, hits, readRatings } from "./expiry";

const NOW = 100 * DAY;
const hit = (age: number) => ({ rating: 4, reviews: 10, url: "u", employer: "E1", at: NOW - age });
const miss = (age: number) => ({ miss: true as const, at: NOW - age });
const failed = (age: number) => ({ miss: true as const, at: NOW - age, failed: true as const });

test("hits last 30 days, misses 7, failures one day", () => {
  const m = {
    a: hit(29 * DAY),
    b: hit(31 * DAY),
    c: miss(6 * DAY),
    d: miss(8 * DAY),
    e: failed(23 * HOUR),
    f: failed(25 * HOUR),
  };
  expect(Object.keys(expireRatings(m, NOW))).toEqual(["a", "c", "e"]);
});

test("pruneStore expires ratings with the rest of the store", () => {
  const s = { ...loadStore("/nonexistent/store.json"), ratings: { a: hit(DAY), b: failed(2 * DAY) } };
  expect(Object.keys(pruneStore(s, NOW).ratings)).toEqual(["a"]);
});

test("a missing or malformed ratings map loads as empty, bad entries dropped", () => {
  expect(loadStore("/nonexistent/store.json").ratings).toEqual({});
  expect(readRatings([1])).toEqual({});
  expect(readRatings({ a: hit(0), b: { rating: 4 }, c: { miss: true }, d: miss(0) })).toEqual({ a: hit(0), d: miss(0) });
});

test("hits keeps only real ratings", () => {
  expect(hits({ a: hit(0), b: miss(0), c: failed(0) })).toEqual({ a: hit(0) });
});
