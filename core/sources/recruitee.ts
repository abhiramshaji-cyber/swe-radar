import { getJson, htmlToText } from "../http";
import { relisted } from "../repost";
import type { Board, Ctx, Posting } from "../types";

export const parseRecruiteeTime = (s: unknown) =>
  typeof s === "string"
    ? Date.parse(
        s
          .trim()
          .replace(" ", "T")
          .replace(/\s*UTC$/, "Z"),
      )
    : NaN;

const mode = (x: any) =>
  x.remote
    ? " (Remote)"
    : x.hybrid
      ? " (Hybrid)"
      : x.on_site
        ? " (On-site)"
        : "";

export const parseRecruitee = (d: any, board: Board): Posting[] =>
  (Array.isArray(d?.offers) ? d.offers : []).flatMap((x: any) => {
    const postedAt = parseRecruiteeTime(x?.published_at);
    if (!x?.id || !x.title || Number.isNaN(postedAt)) return [];
    return [
      {
        key: "recruitee:" + board.slug + ":" + x.id,
        source: "recruitee" as const,
        title: String(x.title),
        company: x.company_name || board.company,
        location:
          (x.location || [x.city, x.country].filter(Boolean).join(", ")) +
          mode(x),
        url:
          x.careers_url ??
          "https://" + board.slug + ".recruitee.com/o/" + x.slug,
        postedAt,
        precision: "exact" as const,
        description: [htmlToText(x.description), htmlToText(x.requirements)]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
  });

export const fetchRecruitee = async (board: Board, ctx: Ctx) =>
  relisted(parseRecruitee(await getJson("https://" + board.slug + ".recruitee.com/api/offers/"), board)).filter((p) => p.postedAt >= ctx.cutoff);
