import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { keep } from "../keep";
import type { Extraction } from "../types";
import { DEFAULTS, cleanSettings, ready } from "./index";
import { readSettings, saveSettings, schemaOf } from "./file";
import { SETTINGS } from "./fixture";

const file = () =>
  path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "settings-")),
    "settings.json",
  );

test("a missing or corrupt file gives neutral defaults that force setup", () => {
  const f = file();
  expect(readSettings(f)).toEqual(DEFAULTS);
  fs.writeFileSync(f, "{oops");
  expect(readSettings(f)).toEqual(DEFAULTS);
  expect(ready(DEFAULTS)).toBe(false);
});

test("regions get slug ids, drop incomplete or duplicate entries", () => {
  const s = cleanSettings({
    workCountry: " Testland ",
    regions: [
      { label: "Big City", description: "onsite in Big City" },
      { label: "Big City!", description: "duplicate id" },
      { label: "No description" },
      {
        id: "remote",
        label: "Remote",
        description: "remote in Testland",
        linkedinLocation: "Testland",
      },
    ],
  });
  expect(s.workCountry).toBe("Testland");
  expect(s.regions.map((r) => r.id)).toEqual(["big-city", "remote"]);
  expect(s.regions[1].linkedinLocation).toBe("Testland");
  expect(ready(s)).toBe(true);
});

test("numbers clamp, the window snaps to an offered tier, junk falls back", () => {
  const s = cleanSettings({
    maxYears: 99,
    windowHours: 20,
    currency: "eur",
    payFloor: -5,
    provider: "other",
    excludeSeniorities: ["senior", "bogus"],
    searchTerms: [],
  });
  expect(s.maxYears).toBe(15);
  expect(s.windowHours).toBe(24);
  expect(s.currency).toBe("EUR");
  expect(s.payFloor).toBe(0);
  expect(s.provider).toBe("codex");
  expect(s.excludeSeniorities).toEqual(["senior"]);
  expect(s.searchTerms).toEqual(DEFAULTS.searchTerms);
});

test("save round trips and rejects non objects", () => {
  const f = file();
  expect(saveSettings(f, SETTINGS)).toEqual(SETTINGS);
  expect(readSettings(f)).toEqual(SETTINGS);
  expect(() => saveSettings(f, [])).toThrow();
});

test("the schema changes only when classification inputs change", () => {
  expect(schemaOf({ ...SETTINGS, maxYears: 9, windowHours: 3 })).toBe(
    schemaOf(SETTINGS),
  );
  expect(schemaOf({ ...SETTINGS, workCountry: "Elsewhere" })).not.toBe(
    schemaOf(SETTINGS),
  );
});

test("keep follows the settings", () => {
  const x: Extraction = {
    id: "x",
    isSoftwareRole: true,
    seniority: "mid",
    minYears: 3,
    regions: ["metro"],
    authBlocked: false,
    languageBlocked: false,
    companyScore: null,
    pay: null,
    payConfidence: 0,
    version: "",
    reason: "",
  };
  expect(keep(x, SETTINGS)).toBe(false);
  expect(keep(x, { ...SETTINGS, maxYears: 3 })).toBe(true);
  expect(
    keep(x, { ...SETTINGS, maxYears: 3, excludeSeniorities: ["mid"] }),
  ).toBe(false);
  expect(keep({ ...x, minYears: null, regions: ["gone"] }, SETTINGS)).toBe(
    false,
  );
  expect(keep({ ...x, minYears: null, authBlocked: true }, SETTINGS)).toBe(
    false,
  );
});
