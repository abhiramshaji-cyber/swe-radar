import type { Settings } from "./settings";

export type Precision = "exact" | "day";

export type Ats =
  "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "recruitee";

export type Source =
  "linkedin" | Ats | "microsoft" | "amazon";

export type Board = { slug: string; ats: Ats; company: string };

export type Posting = {
  key: string;
  source: Source;
  title: string;
  company: string;
  location: string;
  url: string;
  postedAt: number;
  precision: Precision;
  description: string;
  pay?: Pay;
  repost?: Repost;
  companyUrl?: string;
};

export type Rated = { rating: number; reviews: number; url: string; employer: string; at: number };

export type Rating = Rated | { miss: true; at: number; failed?: true };

export type Repost = {
  signal: "board" | "history" | "bumped" | "age" | "linkedin";
  of: string;
  at?: number;
  shown?: number;
};

export type Sighting = { role: string; at: number; last: number; location: string };

export type Pay = { min: number; max: number; currency?: string };

export const SENIORITIES = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff_plus",
  "manager",
  "unknown",
] as const;
export type Extraction = {
  id: string;
  isSoftwareRole: boolean;
  seniority: (typeof SENIORITIES)[number];
  minYears: number | null;
  regions: string[];
  authBlocked: boolean;
  languageBlocked: boolean;
  companyScore: number | null;
  pay: Pay | null;
  payConfidence: number;
  version: string;
  reason: string;
};

export type Row = Posting & {
  effectiveAt: number;
  extraction: Extraction | null;
  kept: boolean | null;
  salary: Pay | null;
  estimated: boolean;
  score: number;
  stale?: boolean;
};

export type SourceStatus = {
  source: string;
  state: "running" | "ok" | "error" | "paused";
  count: number;
  label?: string;
  note?: string;
};

export type RefreshResult = {
  at: number;
  window?: number;
  rows: Row[];
  statuses: SourceStatus[];
  classifyError: string | null;
  cost: number;
  resume?: boolean;
};

export type Scan = { done: string[]; statuses: SourceStatus[]; started?: number };

export type Span = { from: number; to: number };

export type Log = {
  progress: (msg: string) => void;
  warn: (msg: string) => void;
  label: (short: string) => void;
  found: (postings: Posting[]) => void;
  partial: () => void;
};

export type Classifying = { done: number; total: number };

export type Tier = { hours: number; state: "wait" | "run" | "ready"; partial?: boolean };

export type Ctx = {
  settings: Settings;
  now: number;
  cutoff: number;
  from: number;
  dead: Record<string, number>;
  known: (p: Posting) => Posting;
  done: (id: string) => boolean;
  finish: (id: string) => void;
};
