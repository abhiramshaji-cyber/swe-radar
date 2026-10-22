import { SETTINGS } from "../settings/fixture";
import { expect, test } from "bun:test";
import type { Row } from "../types";
import { jobScore } from "./score";
import { promising } from "./top";

const LONG = "Ship features across the stack. ".repeat(10);

const row = (key: string, score: number, over: Partial<Row> = {}): Row => ({
  key,
  source: "linkedin",
  title: "Engineer",
  company: "",
  location: "",
  url: "",
  postedAt: 0,
  precision: "exact",
  description: "",
  effectiveAt: 0,
  extraction: null,
  kept: true,
  salary: null,
  estimated: false,
  score,
  ...over,
});

const keys = (rows: Row[]) => rows.map((r) => r.key);

test("takes the top n by score", () => {
  const rows = Array.from({ length: 30 }, (_, i) => row("k" + String(i).padStart(2, "0"), i));
  expect(keys(promising(rows, 3))).toEqual(["k29", "k28", "k27"]);
  expect(promising(rows)).toHaveLength(20);
});

test("returns every candidate when there are fewer than n", () => {
  expect(keys(promising([row("a", 10), row("b", 60)], 20))).toEqual(["b", "a"]);
  expect(promising([], 20)).toEqual([]);
  expect(promising([row("a", 10)], 0)).toEqual([]);
});

test("kept beats unscored, filtered jobs are never fetched", () => {
  const rows = [row("open", 90, { kept: null }), row("kept", 40), row("filtered", 99, { kept: false })];
  expect(keys(promising(rows, 5))).toEqual(["kept", "open"]);
});

test("jobs that already have a description are skipped and do not count toward n", () => {
  const rows = [row("done", 99, { description: LONG }), row("a", 50), row("b", 40)];
  expect(keys(promising(rows, 2))).toEqual(["a", "b"]);
});

test("ties break by newest, then by key, so the pick is stable", () => {
  const rows = [row("b", 50), row("a", 50), row("new", 50, { effectiveAt: 5 })];
  expect(keys(promising(rows, 2))).toEqual(["new", "a"]);
  expect(keys(promising(rows.toReversed(), 2))).toEqual(["new", "a"]);
});

test("a job with no salary or location still ranks on the neutral score", () => {
  const rows = [row("bare", jobScore(null, null, 0, SETTINGS), { location: "" }), row("low", jobScore(10, null, 0, SETTINGS))];
  expect(keys(promising(rows, 1))).toEqual(["bare"]);
});
