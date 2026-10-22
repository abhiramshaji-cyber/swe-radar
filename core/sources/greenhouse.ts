import { getJson, htmlToText } from "../http";
import { relisted } from "../repost";
import type { Board, Ctx, Posting } from "../types";

const API = "https://boards-api.greenhouse.io/v1/boards/";

export const parseGreenhouse = (d: any, board: Board): Posting[] =>
  (Array.isArray(d?.jobs) ? d.jobs : []).flatMap((x: any) => {
    const postedAt = Date.parse(x?.first_published ?? "");
    if (!x?.id || !x.title || Number.isNaN(postedAt)) return [];
    return [
      {
        key: "greenhouse:" + board.slug + ":" + x.id,
        source: "greenhouse" as const,
        title: String(x.title),
        company: x.company_name || board.company,
        location: x.location?.name ?? "",
        url:
          x.absolute_url ??
          "https://job-boards.greenhouse.io/" + board.slug + "/jobs/" + x.id,
        postedAt,
        precision: "exact" as const,
        description: "",
      },
    ];
  });

export const greenhouseDetail = (d: any) => htmlToText(htmlToText(d?.content));

export const greenhouseDescription = (p: Posting) => {
  const [, slug, id] = p.key.split(":");
  return getJson(API + slug + "/jobs/" + id).then(greenhouseDetail);
};

export async function fetchGreenhouse(
  board: Board,
  ctx: Ctx,
): Promise<Posting[]> {
  return relisted(parseGreenhouse(await getJson(API + board.slug + "/jobs"), board)).filter((p) => p.postedAt >= ctx.cutoff);
}
