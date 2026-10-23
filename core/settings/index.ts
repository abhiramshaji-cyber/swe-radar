import { WINDOW_HOURS } from "../time";
import { SENIORITIES } from "../types";

export type Provider = "codex" | "claude";

export type Region = {
  id: string;
  label: string;
  description: string;
  linkedinLocation?: string;
  linkedinRemoteOnly?: boolean;
};

export type Settings = {
  provider: Provider;
  regions: Region[];
  workCountry: string;
  excludeCountryOnly?: string;
  maxYears: number;
  excludeSeniorities: string[];
  requiredLanguagesToExclude: string[];
  searchTerms: string[];
  currency: string;
  payFloor: number;
  windowHours: number;
  roleScope: string;
};

export const ROLE_SCOPE =
  "Hands-on software engineering where writing production code is the core of the work: backend, frontend, full stack, mobile, embedded, game, ML or AI engineering, data engineering, infrastructure, platform, DevOps or SRE engineering.";

export const DEFAULTS: Settings = {
  provider: "codex",
  regions: [],
  workCountry: "",
  maxYears: 2,
  excludeSeniorities: ["senior", "staff_plus", "manager"],
  requiredLanguagesToExclude: [],
  searchTerms: ["software engineer", "software developer"],
  currency: "USD",
  payFloor: 0,
  windowHours: 12,
  roleScope: ROLE_SCOPE,
};

export const NOT_READY =
  "Add a region and your work country in Settings first.";

const MAX_REGIONS = 8;
const MAX_TERMS = 10;

const text = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const texts = (v: unknown, max: number) =>
  Array.isArray(v)
    ? [...new Set(v.map((x) => text(x, 100)).filter(Boolean))].slice(0, max)
    : null;

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

function regions(v: unknown): Region[] {
  if (!Array.isArray(v)) return [];
  const out = new Map<string, Region>();
  for (const r of v) {
    const label = text(r?.label, 60);
    const description = text(r?.description);
    const id = slug(text(r?.id, 60) || label);
    const linkedinLocation = text(r?.linkedinLocation, 100);
    if (!label || !description || !id || out.has(id)) continue;
    out.set(id, {
      id,
      label,
      description,
      ...(linkedinLocation && { linkedinLocation }),
      ...(linkedinLocation && r?.linkedinRemoteOnly === true && { linkedinRemoteOnly: true }),
    });
  }
  return [...out.values()].slice(0, MAX_REGIONS);
}

const whole = (v: unknown, fallback: number, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(hi, Math.max(lo, Math.round(v)))
    : fallback;

const nearestHours = (n: number) =>
  WINDOW_HOURS.reduce<number>(
    (best, h) => (Math.abs(h - n) < Math.abs(best - n) ? h : best),
    WINDOW_HOURS[0],
  );

const seniorities = (v: unknown) =>
  texts(v, SENIORITIES.length)?.filter((s) =>
    (SENIORITIES as readonly string[]).includes(s),
  ) ?? DEFAULTS.excludeSeniorities;

export function cleanSettings(v: any): Settings {
  const excludeCountryOnly = text(v?.excludeCountryOnly, 60);
  const currency = text(v?.currency).toUpperCase();
  const terms = texts(v?.searchTerms, MAX_TERMS);
  return {
    provider: v?.provider === "claude" ? "claude" : "codex",
    regions: regions(v?.regions),
    workCountry: text(v?.workCountry, 60),
    ...(excludeCountryOnly && { excludeCountryOnly }),
    maxYears: whole(v?.maxYears, DEFAULTS.maxYears, 0, 15),
    excludeSeniorities: seniorities(v?.excludeSeniorities),
    requiredLanguagesToExclude:
      texts(v?.requiredLanguagesToExclude, MAX_TERMS) ?? [],
    searchTerms: terms?.length ? terms : DEFAULTS.searchTerms,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : DEFAULTS.currency,
    payFloor: whole(v?.payFloor, DEFAULTS.payFloor, 0, 100_000_000),
    windowHours: nearestHours(
      whole(v?.windowHours, DEFAULTS.windowHours, 0, 10_000),
    ),
    roleScope: text(v?.roleScope, 1000) || ROLE_SCOPE,
  };
}

export const ready = (s: Settings) => s.regions.length > 0 && !!s.workCountry;
