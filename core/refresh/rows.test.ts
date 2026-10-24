import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DAY } from "../time";
import { loadRates } from "../rank/rates";
import { expect, test } from "bun:test";
import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { classifyOne } from "../jev/answer";
import { job } from "../repost/fixture";
import { SETTINGS } from "../settings/fixture";
import { schemaOf } from "../settings/file";
import { loadStore, saveStore } from "../store";
import type { Extraction } from "../types";
import { jobScore } from "../rank/score";
import { payLabel } from "../../src/lib/format";
import { buildRows, lastResult, lookup } from "./rows";

const settings = { ...SETTINGS, currency: "USD" };
const posting = job("greenhouse:pay", { pay: { min: 90000, max: 100000, currency: "EUR" } });
const rates = { EUR: 1, USD: 1.2 };
const extraction: Extraction = {
  id: posting.key, isSoftwareRole: true, seniority: "mid", minYears: 2, regions: [],
  authBlocked: false, languageBlocked: false, companyScore: 80,
  pay: { min: 70000, max: 70000, currency: "USD" }, payConfidence: 0.5,
  version: schemaOf(settings), reason: "fixture",
};

test("converted posted salary beats an estimate with full scoring confidence", () => {
  const [row] = buildRows([posting], () => extraction, {}, new Set(), settings, rates);
  expect(row.salary).toEqual({ min: 108000, max: 120000, currency: "USD" });
  expect(row.pay).toEqual(posting.pay);
  expect(row.estimated).toBe(false);
  expect(row.score).toBe(jobScore(80, row.salary, 1, settings));
  expect(payLabel(row)).toBe("€90K–€100K");
});

test("missing rates use estimated salary while the card still shows posted pay", () => {
  for (const unavailable of [undefined, { EUR: 1 }]) {
    const [row] = buildRows([posting], () => extraction, {}, new Set(), settings, unavailable);
    expect(row.salary).toEqual(extraction.pay);
    expect(row.estimated).toBe(true);
    expect(row.score).toBe(jobScore(80, extraction.pay, 0.5, settings));
    expect(payLabel(row)).toBe("€90K–€100K");
  }
});

test("Jev only estimates pay when conversion is unavailable", async () => {
  for (const available of [rates, undefined, { EUR: 1 }]) {
    let asked = false;
    const client = { systemOne: async ({ questions }: { questions: Record<string, unknown> }) => {
      asked = "pay" in questions;
      return { answers: { software: { noul: 1 }, seniority: { choice: "mid", confidence: 1 },
        minYears: { choice: "2" }, authBlocked: { noul: 0 },
        ...(asked && { pay: { score: 1, confidence: 0.5 } }) }, usage: { input_tokens: 0 } };
    } } as unknown as TypeSafeClient;
    const result = await classifyOne(client, posting, 80, settings, undefined, available);
    expect(asked).toBe(available !== rates);
    expect(!!result.extraction?.pay).toBe(available !== rates);
  }
});

test("unavailable conversion without an estimate invalidates the cached classification", () => {
  const store = loadStore("nonexistent-rates-test-store.json");
  store.jobs[posting.key] = posting;
  store.extractions[posting.key] = { ...extraction, pay: null };
  expect(lookup(store, settings, rates)(posting.key)).not.toBeNull();
  expect(lookup(store, settings)(posting.key)).toBeNull();
  store.extractions[posting.key] = extraction;
  expect(lookup(store, settings)(posting.key)).toEqual(extraction);
});


test("launch keeps classifications and converted salaries after rates expire offline", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radar-launch-"));
  const file = path.join(dir, "store.json");
  const now = posting.postedAt + 1000;
  try {
    const store = loadStore(file);
    store.jobs[posting.key] = posting;
    store.seen[posting.key] = posting.postedAt;
    store.extractions[posting.key] = { ...extraction, pay: null };
    saveStore(file, store);
    fs.writeFileSync(path.join(dir, "exchange-rates.json"), JSON.stringify({ at: now, rates }));
    const fresh = lastResult(file, settings, now)!.rows[0];
    const offline = await loadRates(file, now + DAY + 1, undefined, async () => { throw new Error("offline"); });
    expect(lookup(store, settings, offline)(posting.key)).toEqual(store.extractions[posting.key]);
    const stale = lastResult(file, settings, now + DAY + 1)!.rows[0];
    expect(stale.extraction).toEqual(fresh.extraction);
    expect(stale.extraction).not.toBeNull();
    expect(stale.kept).toBe(fresh.kept);
    expect(stale.salary).toEqual({ min: 108000, max: 120000, currency: "USD" });
    expect(stale.score).toBe(fresh.score);
    expect(stale.estimated).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
