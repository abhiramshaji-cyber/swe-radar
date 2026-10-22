import { getJson } from "../http";
import { type Per, annualPay } from "../rank/pay";
import { relisted } from "../repost";
import type { Board, Ctx, Posting } from "../types";

const where = (x: any) => {
  const places = [
    x.location,
    ...(Array.isArray(x.secondaryLocations)
      ? x.secondaryLocations.map((s: any) => s?.location)
      : []),
  ].filter(Boolean);
  const country = x.address?.postalAddress?.addressCountry;
  return (
    [...new Set(places)].join("; ") +
    (x.workplaceType
      ? " (" + x.workplaceType + ")"
      : x.isRemote
        ? " (Remote)"
        : "") +
    (country ? " [" + country + "]" : "")
  );
};

const INTERVAL: Record<string, Per> = { "1 HOUR": "hour", "1 DAY": "day", "1 WEEK": "week", "1 MONTH": "month", "1 YEAR": "year" };

const salary = (x: any) => {
  const s = (Array.isArray(x.compensation?.summaryComponents) ? x.compensation.summaryComponents : []).find(
    (c: any) => c?.compensationType === "Salary",
  );
  return s && annualPay(s.minValue, s.maxValue, s.currencyCode, INTERVAL[s.interval]);
};

export const parseAshby = (d: any, board: Board): Posting[] =>
  (Array.isArray(d?.jobs) ? d.jobs : []).flatMap((x: any) => {
    const postedAt = Date.parse(x?.publishedAt ?? "");
    if (!x?.id || !x.title || Number.isNaN(postedAt) || x.isListed === false)
      return [];
    return [
      {
        key: "ashby:" + board.slug + ":" + x.id,
        source: "ashby" as const,
        title: String(x.title),
        company: board.company,
        location: where(x),
        url: x.jobUrl ?? "https://jobs.ashbyhq.com/" + board.slug + "/" + x.id,
        postedAt,
        precision: "exact" as const,
        description: x.descriptionPlain ?? "",
        pay: salary(x),
      },
    ];
  });

export const fetchAshby = async (board: Board, ctx: Ctx) =>
  relisted(
    parseAshby(
      await getJson("https://api.ashbyhq.com/posting-api/job-board/" + board.slug + "?includeCompensation=true"),
      board,
    ),
  ).filter((p) => p.postedAt >= ctx.cutoff);
