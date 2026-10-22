import { getJson, htmlToText } from "../http";
import { sourceDayOk } from "../time";
import { relisted } from "../repost";
import type { Ctx, Posting } from "../types";

const URL_ =
  "https://www.amazon.jobs/en/search.json?base_query=software%20engineer&sort=recent&result_limit=";
const PAGE = 100;
const MAX_PAGES = 10;

export const parseAmazon = (d: any): Posting[] =>
  (Array.isArray(d?.jobs) ? d.jobs : []).flatMap((x: any) => {
    const postedAt = new Date(x?.posted_date ?? "").getTime();
    if (!x?.id_icims || !x.title || Number.isNaN(postedAt)) return [];
    return [
      {
        key: "amazon:" + x.id_icims,
        source: "amazon" as const,
        title: String(x.title),
        company: x.company_name || "Amazon",
        location: x.normalized_location || x.location || "",
        url:
          "https://www.amazon.jobs" + (x.job_path ?? "/en/jobs/" + x.id_icims),
        postedAt,
        precision: "day" as const,
        description: [
          htmlToText(x.description),
          "Basic qualifications:\n" + htmlToText(x.basic_qualifications),
          "Preferred qualifications:\n" +
            htmlToText(x.preferred_qualifications),
        ].join("\n\n"),
      },
    ];
  });

export async function fetchAmazon(ctx: Ctx): Promise<Posting[]> {
  const all: Posting[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await getJson(URL_ + PAGE + "&offset=" + page * PAGE);
    all.push(...parseAmazon(d));
    const jobs = Array.isArray(d?.jobs) ? d.jobs.length : 0;
    if (jobs < PAGE || (page + 1) * PAGE >= (d?.hits ?? 0)) break;
  }
  return relisted(all).filter((p) => sourceDayOk(p.postedAt, ctx));
}
