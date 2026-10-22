import { expect, test } from "bun:test";
import { dedupeKey } from "../../dedupe";
import { schemaOf } from "../../settings/file";
import { SETTINGS } from "../../settings/fixture";
import { loadStore } from "../../store";
import type { Extraction, Posting } from "../../types";
import { lookup } from "../rows";
import { checkpoint } from "./checkpoint";
import { scoredBare } from "./classify";

const NOW = Date.UTC(2026, 9, 17, 20);

const job = (id: string, description = ""): Posting => ({
  key: "linkedin:" + id,
  source: "linkedin",
  title: "Engineer " + id,
  company: "Acme " + id,
  location: "Springfield",
  url: "https://www.linkedin.com/jobs/view/" + id,
  postedAt: NOW - 3600_000,
  precision: "exact",
  description,
});

const scored = (kept: boolean): Extraction => ({
  id: "x",
  isSoftwareRole: kept,
  seniority: "junior",
  minYears: null,
  regions: ["metro"],
  authBlocked: false,
  languageBlocked: false,
  companyScore: null,
  pay: null,
  payConfidence: 0,
  version: schemaOf(SETTINGS),
  reason: "",
});

const LONG = "Build and run services in TypeScript. ".repeat(10);

function setup() {
  const store = loadStore("/nonexistent/store.json");
  store.jobs = {
    "linkedin:1": job("1"),
    "linkedin:2": job("2", LONG),
    "linkedin:3": job("3"),
    "linkedin:4": job("4"),
  };
  store.extractions = {
    "linkedin:1": scored(true),
    "linkedin:2": scored(true),
    "linkedin:3": scored(false),
  };
  return store;
}

test("known descriptions are attached without fetching, and unknown ones stay empty", () => {
  const store = setup();
  store.descriptions["linkedin:1"] = LONG;
  const described = (key: string) => (key === "linkedin:3" ? "From voyager" : undefined);
  const { ctxFor } = checkpoint("/nonexistent/store.json", store, new Map(), { settings: SETTINGS, now: NOW, described });
  const ctx = ctxFor(0, "linkedin");
  expect(ctx.known(job("1")).description).toBe(LONG);
  expect(ctx.known(job("3", "Header")).description).toBe("Header\n\nFrom voyager");
  expect(ctx.known(job("4")).description).toBe("");
  expect(store.descriptions["linkedin:3"]).toBe("From voyager");
});

test("a resumed scan keeps the start of the scan it resumes", () => {
  const store = setup();
  store.scan = { done: [], statuses: [], started: NOW - 3600_000 };
  expect(checkpoint("/nonexistent/store.json", store, new Map(), { settings: SETTINGS, now: NOW, resume: true }).started).toBe(NOW - 3600_000);
  expect(checkpoint("/nonexistent/store.json", store, new Map(), { settings: SETTINGS, now: NOW }).started).toBe(NOW);
});

test("a full description arriving for a job scored without one marks it for rescoring", () => {
  const store = setup();
  const cached = lookup(store, SETTINGS);
  const again = scoredBare(store, [job("1", LONG), job("2", LONG), job("3", "short"), job("4", LONG)], cached);
  expect([...again]).toEqual([dedupeKey(job("1"))]);
  expect(scoredBare(store, [job("1")], cached).size).toBe(0);
});
