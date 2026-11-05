import { afterEach, expect, mock, test } from "bun:test";
import { fetchAmazon } from "./amazon";
import { DEFAULTS } from "../settings";
import type { Ctx } from "../types";

const requested: string[] = [];
mock.module("../http", () => ({
  getJson: async (url: string) => {
    requested.push(url);
    return { jobs: [], hits: 0 };
  },
  htmlToText: () => "",
}));

const countries: [string, string[]][] = [
  ["DEU", ["Germany", "DE", "DEU"]],
  ["GBR", ["United Kingdom", "UK", "GB", "GBR"]],
  ["USA", ["United States", "US", "USA"]],
  ["CAN", ["Canada", "CA", "CAN"]],
  ["IND", ["India", "IN", "IND"]],
  ["AUS", ["Australia", "AU", "AUS"]],
  ["KOR", ["South Korea", "KR", "KOR"]],
  ["ZAF", ["South Africa", "ZA", "ZAF"]],
  ["ARE", ["United Arab Emirates", "UAE", "ARE"]],
  ["NZL", ["New Zealand", "NZ", "NZL"]],
  ["CZE", ["Czech Republic", "CZ", "CZE"]],
];

afterEach(() => requested.length = 0);

test("Amazon search maps common country names and codes to alpha-3", async () => {
  for (const [code, forms] of countries)
    for (const country of forms) {
      const ctx = { settings: { ...DEFAULTS, workCountry: country } } as Ctx;
      await fetchAmazon(ctx);
      expect(new URL(requested[0]).searchParams.get("normalized_country_code[]"), country).toBe(code);
      requested.length = 0;
    }
});

test("Amazon fetch filters its request for less common ISO countries", async () => {
  const ctx = { settings: { ...DEFAULTS, workCountry: "Botswana" } } as Ctx;
  await fetchAmazon(ctx);
  expect(new URL(requested[0]).searchParams.get("normalized_country_code[]")).toBe("BWA");
});

test("Amazon fetch leaves empty and unknown countries unfiltered", async () => {
  for (const workCountry of ["", "Atlantis"]) {
    const ctx = { settings: { ...DEFAULTS, workCountry } } as Ctx;
    await fetchAmazon(ctx);
    expect(new URL(requested[0]).searchParams.has("normalized_country_code[]")).toBe(false);
    requested.length = 0;
  }
});
