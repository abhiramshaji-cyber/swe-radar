import type { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Settings } from "../settings";
import { schemaOf } from "../settings/file";
import { SENIORITIES, type Extraction, type Posting } from "../types";
import { COMPANY_LEVELS, MAX_YEARS, payFromLevel, questionsFor, regionKey, stateFor } from "./questions";

export const MODEL = "jev-1.13.0";

const pct = (n: number) => Math.round(n * 100) + "%";
const yes = (r: { noul: number }) => r.noul >= 0.5;

function valid(x: Extraction, ids: Set<string>) {
  return (
    typeof x.isSoftwareRole === "boolean" &&
    SENIORITIES.includes(x.seniority) &&
    x.regions.every((r) => ids.has(r)) &&
    (x.minYears === null || (Number.isInteger(x.minYears) && x.minYears >= 0 && x.minYears <= MAX_YEARS)) &&
    (x.companyScore === null || (x.companyScore >= 0 && x.companyScore <= 100)) &&
    (x.pay === null || x.pay.min > 0)
  );
}

export async function classifyOne(
  jev: TypeSafeClient,
  p: Posting,
  knownCompany: number | undefined,
  settings: Settings,
  signal?: AbortSignal,
) {
  const { answers, usage } = await jev.systemOne(
    { model: MODEL, state: stateFor(p), questions: questionsFor(settings, p.pay?.currency !== settings.currency, knownCompany === undefined) },
    { signal },
  );
  const a = answers as Record<string, any>;
  const regions = settings.regions.filter((r) => a[regionKey(r)] && yes(a[regionKey(r)])).map((r) => r.id);
  const mid = a.pay ? payFromLevel(settings, a.pay.score) : null;
  const extraction: Extraction = {
    id: p.key,
    isSoftwareRole: yes(a.software),
    seniority: a.seniority.choice,
    minYears: a.minYears.choice === "none" ? null : Number(a.minYears.choice),
    regions,
    authBlocked: yes(a.authBlocked),
    languageBlocked: !!a.languageBlocked && yes(a.languageBlocked),
    companyScore: knownCompany ?? (a.company ? Math.round((a.company.score / COMPANY_LEVELS) * 100) : null),
    pay: mid ? { min: mid, max: mid, currency: settings.currency } : null,
    payConfidence: a.pay ? a.pay.confidence : 0,
    version: schemaOf(settings),
    reason:
      "Jev: software " + pct(a.software.noul) +
      ", " + a.seniority.choice + " " + pct(a.seniority.confidence) +
      ", min years " + a.minYears.choice +
      ", regions " + (regions.join("+") || "none") +
      ", work authorization blocked " + pct(a.authBlocked.noul) +
      (a.languageBlocked ? ", language required " + pct(a.languageBlocked.noul) : ""),
  };
  return { extraction: valid(extraction, new Set(settings.regions.map((r) => r.id))) ? extraction : null, usage };
}
