import fs from "node:fs";
import path from "node:path";
import { DAY } from "../time";

export type Rates = Record<string, number>;
type Snapshot = { at: number; rates: Rates };

const fileOf = (store: string) => path.join(path.dirname(store), "exchange-rates.json");
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

function readSnapshot(store: string): Snapshot | undefined {
  try {
    const s: Snapshot = JSON.parse(fs.readFileSync(fileOf(store), "utf8"));
    if (!Number.isFinite(s.at) || s.rates?.EUR !== 1) return;
    if (Object.entries(s.rates).every(([c, n]) => /^[A-Z]{3}$/.test(c) && positive(n))) return s;
  } catch {}
}

export const readRates = (store: string) => readSnapshot(store)?.rates;

export async function loadRates(store: string, now = Date.now(), signal?: AbortSignal, request: (url: string, init: RequestInit) => Promise<Response> = fetch): Promise<Rates | undefined> {
  const cached = readSnapshot(store);
  if (cached && cached.at <= now && now - cached.at < DAY) return cached.rates;
  try {
    const response = await request("https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR", {
      signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) return cached?.rates;
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.length) return cached?.rates;
    const rates: Rates = { EUR: 1 };
    for (const row of data) {
      const date = Date.parse(row?.date);
      if (row?.base !== "EUR" || !/^[A-Z]{3}$/.test(row?.quote) || !positive(row?.rate) ||
          !Number.isFinite(date) || date > now || now - date > 7 * DAY) continue;
      rates[row.quote] = row.rate;
    }
    try {
      fs.writeFileSync(fileOf(store), JSON.stringify({ at: now, rates } satisfies Snapshot));
    } catch {}
    return rates;
  } catch {
    return cached?.rates;
  }
}
