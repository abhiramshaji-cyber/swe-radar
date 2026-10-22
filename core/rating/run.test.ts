import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { refresh } from "../refresh";
import { schemaOf } from "../settings/file";
import { SETTINGS } from "../settings/fixture";
import { type Store, loadStore, saveStore } from "../store";
import type { Extraction, Posting } from "../types";
import type { Ask } from "./ask";
import { rateCompanies } from "./run";

const NOW = Date.now();
const LONG = "Build and run services in TypeScript on a small product team. ".repeat(10);
const COMPANIES = ["Cohere", "Shopify", "Stripe", "Figma", "Notion", "Linear", "Vercel", "Airtable"];

const job = (company: string, i: number): Posting => ({
  key: "greenhouse:" + i,
  source: "greenhouse",
  title: "Software Engineer " + i,
  company,
  location: "Springfield",
  url: "https://boards.greenhouse.io/x/jobs/" + i,
  postedAt: NOW - 3600_000,
  precision: "exact",
  description: LONG,
});

const extraction = (i: number): Extraction => ({
  id: "x" + i,
  isSoftwareRole: true,
  seniority: "junior",
  minYears: null,
  regions: ["metro"],
  authBlocked: false,
  languageBlocked: false,
  companyScore: 50 + i,
  pay: { min: 90_000, max: 120_000, currency: "USD" },
  payConfidence: 1,
  version: schemaOf(SETTINGS),
  reason: "",
});

const JOBS = COMPANIES.map(job);

function seeded() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rating-")), "store.json");
  const empty = loadStore(file);
  const store: Store = {
    ...empty,
    jobs: Object.fromEntries(JOBS.map((p) => [p.key, p])),
    seen: Object.fromEntries(JOBS.map((p) => [p.key, NOW - 3600_000])),
    extractions: Object.fromEntries(JOBS.map((p, i) => [p.key, extraction(i)])),
  };
  saveStore(file, store);
  fs.writeFileSync(path.join(path.dirname(file), "exchange-rates.json"), JSON.stringify({ at: NOW, rates: { EUR: 1, USD: 1.2 } }));
  return file;
}

const scan = (file: string) =>
  refresh(file, { status: () => {} }, { settings: SETTINGS, now: NOW, sources: [["greenhouse", () => async () => JOBS]] });

const cards = (rows: { key: string; score: number; kept: boolean | null }[]) =>
  rows.map(({ key, score, kept }) => ({ key, score, kept })).sort((a, b) => a.key.localeCompare(b.key));

const later = <T>(ms: number, fn: () => T) => new Promise<T>((r) => setTimeout(() => r(fn()), ms));

test.each<[string, Ask]>([
  ["the AI CLI missing", () => Promise.reject(new Error("Claude Code not found. Install it and run `claude` once to sign in."))],
  ["the AI CLI timing out", () => later(80, () => Promise.reject(new Error("Codex took too long. Try again.")))],
  ["unparseable output", async () => "not json at all"],
  ["a thrown non error", () => { throw "boom"; }],
])("%s: the scan finishes on time and every card renders and scores as without ratings", async (_, ask) => {
  const baseline = await scan(seeded());

  const file = seeded();
  let running: Promise<unknown> | null = scan(file).finally(() => (running = null));
  const scanned = running as Promise<Awaited<ReturnType<typeof scan>>>;
  const rated = rateCompanies(file, {
    settings: SETTINGS, idle: () => running, now: () => NOW,
    ask: (...args) => {
      expect(running).toBeNull();
      return ask(...args);
    },
  });
  const result = await scanned;
  await rated;

  expect(cards(result.rows)).toEqual(cards(baseline.rows));
  expect(result.rows.filter((r) => r.kept === true)).toHaveLength(COMPANIES.length);

  const store = loadStore(file);
  expect(Object.keys(store.jobs).sort()).toEqual(JOBS.map((p) => p.key).sort());
  expect(store.last).not.toBeNull();
  expect(Object.values(store.ratings).every((r) => "miss" in r)).toBe(true);
});

test("a failed batch stops the run and is not retried until the next day", async () => {
  const file = seeded();
  const asked: number[] = [];
  const ask: Ask = async (_i, prompt) => {
    asked.push([...prompt.matchAll(/"id"/g)].length);
    throw new Error("Codex failed: not signed in");
  };
  await rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW });
  expect(asked).toEqual([6]);
  expect(Object.values(loadStore(file).ratings).every((r) => "failed" in r)).toBe(true);
  await rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW + 3600_000 });
  await rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW + 23 * 3600_000 });
  expect(asked).toEqual([6, 2]);
  await rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW + 25 * 3600_000 });
  expect(asked).toEqual([6, 2, 6]);
});

test("batches of six, one call at a time, overlapping starts share the run", async () => {
  const file = seeded();
  const seen: number[] = [];
  let open = 0;
  let most = 0;
  const ask: Ask = async (_i, prompt) => {
    open++;
    most = Math.max(most, open);
    const ids = [...prompt.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]);
    seen.push(ids.length);
    await later(10, () => {});
    open--;
    return { results: ids.map((id) => ({ id, company: id, rating: null, reviews: null, glassdoorUrl: null })) };
  };
  const a = rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW });
  const b = rateCompanies(file, { settings: SETTINGS, idle: () => null, ask, now: () => NOW });
  expect(b).toBe(a);
  await a;
  expect(seen).toEqual([6, 2]);
  expect(most).toBe(1);
  expect(Object.keys(loadStore(file).ratings)).toHaveLength(COMPANIES.length);
});

test("ratings wait for the scan to go idle before touching the store", async () => {
  const file = seeded();
  let release = () => {};
  let busy: Promise<void> | null = new Promise<void>((r) => (release = r));
  const saved: string[][] = [];
  const ask: Ask = async (_i, prompt) => ({
    results: [...prompt.matchAll(/"id": "([^"]+)"/g)].map((m) => ({
      id: m[1],
      company: m[1],
      rating: 4.2,
      reviews: 30,
      glassdoorUrl: "https://www.glassdoor.com/Reviews/X-Reviews-E42.htm",
    })),
  });
  const run = rateCompanies(file, { settings: SETTINGS, idle: () => busy, ask, now: () => NOW, saved: (r) => saved.push(Object.keys(r)) });
  await later(20, () => {});
  expect(loadStore(file).ratings).toEqual({});
  busy = null;
  release();
  await run;
  expect(Object.keys(loadStore(file).ratings)).toHaveLength(COMPANIES.length);
  expect(saved.at(-1)).toHaveLength(COMPANIES.length);
});
