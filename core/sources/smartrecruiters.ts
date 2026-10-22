import { getJson, htmlToText } from "../http";
import { relisted } from "../repost";
import type { Board, Ctx, Posting } from "../types";

const API = "https://api.smartrecruiters.com/v1/companies/";
const PAGE = 100;
const MAX_PAGES = 10;

const where = (l: any) => {
  if (!l) return "";
  const place =
    l.fullLocation || [l.city, l.region, l.country].filter(Boolean).join(", ");
  return (
    place +
    (l.remote ? " (Remote)" : l.hybrid ? " (Hybrid)" : "") +
    (l.country ? " [" + String(l.country).toUpperCase() + "]" : "")
  );
};

export const parseSmartRecruiters = (d: any, board: Board): Posting[] =>
  (Array.isArray(d?.content) ? d.content : []).flatMap((x: any) => {
    const postedAt = Date.parse(x?.releasedDate ?? "");
    if (!x?.id || !x.name || Number.isNaN(postedAt)) return [];
    return [
      {
        key: "smartrecruiters:" + board.slug + ":" + x.id,
        source: "smartrecruiters" as const,
        title: String(x.name),
        company: x.company?.name || board.company,
        location: where(x.location),
        url: "https://jobs.smartrecruiters.com/" + board.slug + "/" + x.id,
        postedAt,
        precision: "exact" as const,
        description: x.experienceLevel?.label
          ? "Experience level: " + x.experienceLevel.label
          : "",
      },
    ];
  });

export const smartRecruitersDetail = (d: any) =>
  Object.values(d?.jobAd?.sections ?? {})
    .map((s: any) => htmlToText(s?.text))
    .filter(Boolean)
    .join("\n\n");

export const smartRecruitersDescription = (p: Posting) => {
  const [, slug, id] = p.key.split(":");
  return getJson(API + slug + "/postings/" + id).then(smartRecruitersDetail);
};

export async function fetchSmartRecruiters(
  board: Board,
  ctx: Ctx,
): Promise<Posting[]> {
  const all: Posting[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await getJson(
      API + board.slug + "/postings?country=ca&limit=" + PAGE + "&offset=" + page * PAGE,
    );
    all.push(...parseSmartRecruiters(d, board));
    if ((page + 1) * PAGE >= (d?.totalFound ?? 0)) break;
  }
  return relisted(all).filter((p) => p.postedAt >= ctx.cutoff);
}
