import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DAY } from "../time";
import { convertedPay } from "./pay";
import { loadRates, readRates } from "./rates";

const dirs: string[] = [];
const storeFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radar-rates-"));
  dirs.push(dir);
  return path.join(dir, "store.json");
};
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
const now = Date.UTC(2026, 9, 22, 12);
const body = [{ date: "2026-10-22", base: "EUR", quote: "USD", rate: 1.2 }];
const request = (data: unknown, status = 200) => (async () => Response.json(data, { status }));

test("converts both endpoints and cross rates without changing posted pay", () => {
  const pay = { min: 90000, max: 100000, currency: "EUR" };
  expect(convertedPay(pay, "USD", { EUR: 1, USD: 1.2 })).toEqual({ min: 108000, max: 120000, currency: "USD" });
  expect(convertedPay({ ...pay, currency: "GBP" }, "USD", { GBP: 0.8, USD: 1.2 })?.min).toBe(135000);
  expect(pay.min).toBe(90000);
  expect(convertedPay(pay, "EUR")).toBe(pay);
  expect(convertedPay(pay, "USD")).toBeNull();
  expect(convertedPay(undefined, "USD")).toBeNull();
});

test("keeps cached rates offline and refreshes after one day", async () => {
  const file = storeFile();
  expect(await loadRates(file, now, undefined, request(body))).toEqual({ EUR: 1, USD: 1.2 });
  expect(readRates(file)).toEqual({ EUR: 1, USD: 1.2 });
  const offline = (async () => { throw new Error("offline"); });
  expect(await loadRates(file, now + 1, undefined, offline)).toEqual({ EUR: 1, USD: 1.2 });
  expect(await loadRates(file, now + DAY, undefined, offline)).toEqual({ EUR: 1, USD: 1.2 });
  expect(await loadRates(file, now + DAY, undefined, request([{ ...body[0], rate: 1.3 }]))).toEqual({ EUR: 1, USD: 1.3 });
});

test("network, HTTP, malformed, and stale responses fall back without throwing", async () => {
  const file = storeFile();
  expect(await loadRates(file, now, undefined, (async () => { throw new Error("offline"); }))).toBeUndefined();
  for (const data of [null, [], {}]) {
    expect(await loadRates(file, now, undefined, request(data))).toBeUndefined();
  }
  expect(await loadRates(file, now, undefined, request(body, 503))).toBeUndefined();
  fs.writeFileSync(path.join(path.dirname(file), "exchange-rates.json"), "broken");
  expect(readRates(file)).toBeUndefined();
});


test("skips invalid quotes without losing valid currencies", async () => {
  const file = storeFile();
  const bad = [null, { ...body[0], quote: "GBP", rate: 0 },
    { ...body[0], quote: "CAD", date: "2020-01-01" }, { ...body[0], quote: "JPY", base: "USD" }];
  expect(await loadRates(file, now, undefined, request([...bad, ...body]))).toEqual({ EUR: 1, USD: 1.2 });
  expect(await loadRates(storeFile(), now, undefined, request(bad))).toEqual({ EUR: 1 });
});

test("failed refresh responses preserve the last snapshot and its timestamp", async () => {
  const file = storeFile();
  await loadRates(file, now, undefined, request(body));
  const cache = path.join(path.dirname(file), "exchange-rates.json");
  const saved = fs.readFileSync(cache, "utf8");
  for (const fetcher of [request(body, 503), request(null), request([]),
    async () => new Response("invalid json")]) {
    expect(await loadRates(file, now + DAY + 1, undefined, fetcher)).toEqual({ EUR: 1, USD: 1.2 });
    expect(fs.readFileSync(cache, "utf8")).toBe(saved);
  }
});
