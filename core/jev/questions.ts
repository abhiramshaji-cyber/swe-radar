import { choice, noul, score } from "@typesafe-ai/sdk";
import type { Region, Settings } from "../settings";
import type { Extraction, Posting } from "../types";

export const MAX_YEARS = 15;
const DESCRIPTION_CHARS = 12_000;

const SENIORITY: Record<Extraction["seniority"], string> = {
  intern: "Internship, co-op or student role.",
  junior: "New grad, entry level, junior, associate, or level I.",
  mid: "Intermediate, level II, or a plain Software Engineer title with a modest bar.",
  senior: "Senior, sr, or level III and above.",
  staff_plus: "Staff, principal, distinguished, or architect.",
  manager: "People manager, lead, head, director, or VP.",
  unknown: "The level cannot be told from the posting.",
};

const YEARS: Record<string, string> = {
  none: "No required years of experience are stated.",
  ...Object.fromEntries(
    Array.from({ length: MAX_YEARS + 1 }, (_, i) => [
      String(i),
      i === MAX_YEARS
        ? MAX_YEARS + " or more years required."
        : i + " years required.",
    ]),
  ),
};

const region = (r: Region) =>
  noul(
    "Can someone take the job in `posting` in the " + r.label + " region, described as: " + r.description +
      "? Judge the location, work arrangement and description together. When it lists several locations, answer yes if any of them qualifies.",
    {
      true: "The job's location, remote policy or description fits that region.",
      false: "Every office for this job is elsewhere, or remote work is limited to places outside that region.",
    },
  );

const authBlocked = (s: Settings) =>
  noul(
    "Read the whole description of the job in `posting`, not just its location. Would someone living in " + s.workCountry +
      ", holding only " + s.workCountry + " work authorization, be unable to take this job?",
    {
      true:
        "It needs work authorization, citizenship, residency or a security clearance from another country, or requires relocating abroad or being on another country's payroll" +
        (s.excludeCountryOnly ? ", including roles that hire only " + s.excludeCountryOnly + " residents" : "") +
        ".",
      false: "Authorization to work in " + s.workCountry + " is enough, and nothing in it limits hiring to other countries.",
    },
  );

const languageBlocked = (languages: string[]) =>
  noul("Does the job in `posting` require any of these languages: " + languages.join(", ") + "?", {
    true: "Fluency in one of them is mandatory, or the posting is written entirely in one of them.",
    false: "None of them is mentioned, or they are only an asset, a plus or nice to have.",
  });

const software = (scope: string) =>
  noul(
    "Does the job in `posting` fit this role scope: " + scope +
      " Judge from the title, location and description together; the description wins over the title when they disagree.",
    {
      true: "The core of the job fits the role scope.",
      false: "The core of the job falls outside the role scope.",
    },
  );

export const regionKey = (r: Region) => "region_" + r.id;

const PAY_LEVELS = 10;

export const payStep = (s: Settings) => s.payFloor / 2;

export const payFromLevel = (s: Settings, level: number) => Math.round(s.payFloor + level * payStep(s));

const money = (s: Settings, n: number) => Math.round(n).toLocaleString("en-US") + " " + s.currency;

const pay = (s: Settings) =>
  score(
    "What annual base pay in " + s.currency + " would the job in `posting` most likely offer, given the role, level, company and city?",
    Array.from({ length: PAY_LEVELS }, (_, i) =>
      i === PAY_LEVELS - 1
        ? money(s, payFromLevel(s, i)) + " or more a year"
        : "About " + money(s, payFromLevel(s, i)) + " a year",
    ) as [string, string, ...string[]],
  );

const COMPANY_RUBRIC = [
  "Unknown tiny outfit, staffing agency, or a contract or temp role with no security.",
  "Pre-seed or seed startup, or a company with recent large layoffs.",
  "Small funded startup, Series A or B.",
  "Established mid-size company or well funded late stage startup.",
  "Large, profitable or public company with a stable record.",
  "Very large, highly profitable blue-chip employer with strong job security and no recent major layoffs.",
] as const;

const COMPANY = score(
  "How big, established and job-secure is the employer in `posting`? Weigh its size, profitability or funding stage, whether it is public, its recent layoff history and how stable this role is. Contract, temp and agency roles score lower.",
  COMPANY_RUBRIC,
);

export const COMPANY_LEVELS = COMPANY_RUBRIC.length - 1;

export const questionsFor = (s: Settings, needPay: boolean, needCompany: boolean) => ({
  software: software(s.roleScope),
  seniority: choice("What seniority level is the job in `posting`?", SENIORITY),
  minYears: choice(
    "What is the minimum years of professional experience the job in `posting` REQUIRES? Take the lowest figure when a range is given, so 3-5 years is 3. Preferred or nice to have years do not count.",
    YEARS,
  ),
  authBlocked: authBlocked(s),
  ...(s.requiredLanguagesToExclude.length && { languageBlocked: languageBlocked(s.requiredLanguagesToExclude) }),
  ...Object.fromEntries(s.regions.map((r) => [regionKey(r), region(r)])),
  ...(needPay && s.payFloor > 0 && { pay: pay(s) }),
  ...(needCompany && { company: COMPANY }),
});

export const stateFor = (p: Posting) => ({
  posting: {
    title: p.title,
    company: p.company,
    location: p.location,
    source: p.source,
    description: p.description.slice(0, DESCRIPTION_CHARS),
  },
});
