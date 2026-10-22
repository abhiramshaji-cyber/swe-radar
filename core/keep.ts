import type { Settings } from "./settings";
import type { Extraction } from "./types";

export const keep = (e: Extraction, s: Settings) =>
  e.isSoftwareRole &&
  e.regions.some((r) => s.regions.some((x) => x.id === r)) &&
  !e.authBlocked &&
  !e.languageBlocked &&
  !s.excludeSeniorities.includes(e.seniority) &&
  (e.minYears === null || e.minYears <= s.maxYears);
