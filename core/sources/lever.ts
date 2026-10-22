import { getJson, htmlToText } from "../http";
import { type Per, annualPay } from "../rank/pay";
import { relisted } from "../repost";
import type { Board, Ctx, Posting } from "../types";

const text = (x: any) =>
  [
    x.descriptionPlain,
    ...(Array.isArray(x.lists)
      ? x.lists.map((l: any) => l?.text + "\n" + htmlToText(l?.content))
      : []),
    x.additionalPlain,
  ]
    .filter(Boolean)
    .join("\n\n");

const INTERVAL: Record<string, Per> = {
  "per-hour-wage": "hour",
  "per-day-wage": "day",
  "per-week-salary": "week",
  "per-month-salary": "month",
  "per-year-salary": "year",
};

const salary = (r: any) => r && annualPay(r.min, r.max, r.currency, INTERVAL[r.interval]);

const where = (x: any) =>
  [
    ...new Set(
      [x.categories?.location, ...(x.categories?.allLocations ?? [])].filter(
        Boolean,
      ),
    ),
  ].join("; ") +
  (x.workplaceType ? " (" + x.workplaceType + ")" : "") +
  (x.country ? " [" + x.country + "]" : "");

export const parseLever = (d: any, board: Board): Posting[] =>
  (Array.isArray(d) ? d : []).flatMap((x: any) => {
    if (!x?.id || !x.text || typeof x.createdAt !== "number") return [];
    return [
      {
        key: "lever:" + board.slug + ":" + x.id,
        source: "lever" as const,
        title: String(x.text),
        company: board.company,
        location: where(x),
        url: x.hostedUrl ?? "https://jobs.lever.co/" + board.slug + "/" + x.id,
        postedAt: x.createdAt,
        precision: "exact" as const,
        description: text(x),
        pay: salary(x.salaryRange),
      },
    ];
  });

export const fetchLever = async (board: Board, ctx: Ctx) =>
  relisted(parseLever(await getJson("https://api.lever.co/v0/postings/" + board.slug + "?mode=json"), board)).filter((p) => p.postedAt >= ctx.cutoff);
