import { parse } from "node-html-parser";
import { dedupeKey } from "../dedupe";
import { HttpError, RateLimited, errorText, getText, htmlToText, rateLimits } from "../http";
import { parseRelative } from "../time";
import type { Settings } from "../settings";
import type { Ctx, Log, Posting } from "../types";

const BASE = "https://www.linkedin.com/jobs-guest/jobs/api/";
const PAGE = 10;
const MAX_PAGES = 3;
const STOP_AFTER = 2;
const HOST = "www.linkedin.com";
type Place = { location: string; remoteOnly: boolean };
export const locationsOf = (s: Settings): Place[] =>
  [...new Map(s.regions.filter((r) => r.linkedinLocation).map((r) => [r.linkedinLocation + "|" + !!r.linkedinRemoteOnly, { location: r.linkedinLocation!, remoteOnly: !!r.linkedinRemoteOnly }])).values()];

export function parseLinkedInCards(html: string, now: number): Posting[] {
  return parse(html)
    .querySelectorAll("[data-entity-urn]")
    .flatMap((card) => {
      const id = card
        .getAttribute("data-entity-urn")
        ?.match(/jobPosting:(\d+)/)?.[1];
      const time = card.querySelector("time");
      const postedAt = time ? parseRelative(time.text, now) : null;
      const title = card.querySelector(".base-search-card__title")?.text.trim();
      if (!id || !title || postedAt === null) return [];
      const companyUrl = card.querySelector(".base-search-card__subtitle a")?.getAttribute("href")?.match(/^https:\/\/[a-z]+\.linkedin\.com\/company\/[^/?#]+/)?.[0];
      return [
        {
          key: "linkedin:" + id,
          source: "linkedin" as const,
          title,
          company:
            card.querySelector(".base-search-card__subtitle")?.text.trim() ??
            "",
          location:
            card.querySelector(".job-search-card__location")?.text.trim() ?? "",
          url: "https://www.linkedin.com/jobs/view/" + id,
          postedAt,
          precision: "exact" as const,
          description: "",
          ...(companyUrl && { companyUrl }),
        },
      ];
    });
}

export function parseLinkedInDetail(html: string) {
  const root = parse(html);
  const criteria = root
    .querySelectorAll(".description__job-criteria-item")
    .map(
      (li) =>
        li.querySelector(".description__job-criteria-subheader")?.text.trim() +
        ": " +
        li.querySelector(".description__job-criteria-text")?.text.trim(),
    );
  const body = htmlToText(
    root.querySelector(".show-more-less-html__markup")?.innerHTML,
  );
  return [criteria.join("\n"), body].filter(Boolean).join("\n\n");
}

export function pacer() {
  let streak = 0;
  return async (url: string) => {
    try {
      const text = await getText(url);
      streak = 0;
      return text;
    } catch (e) {
      if (e instanceof HttpError && e.status === 429 && ++streak >= STOP_AFTER)
        throw new RateLimited("LinkedIn kept returning 429 after backing off", { cause: e });
      throw e;
    }
  };
}

const detailUrl = (p: Posting) => BASE + "jobPosting/" + p.key.split(":")[1];

export const linkedInDescription = (p: Posting) =>
  pacer()(detailUrl(p)).then(parseLinkedInDetail);

const geo = (place: string) => "location=" + encodeURIComponent(place);
const workType = (p: Place) => (p.remoteOnly ? "&f_WT=2" : "");

const searchUrl = (q: string, place: Place, page: number, ctx: Ctx) =>
  BASE + "seeMoreJobPostings/search?keywords=" + encodeURIComponent(q) + "&" + geo(place.location) + workType(place) + "&f_TPR=r" + Math.ceil((ctx.now - ctx.cutoff) / 1000) + "&sortBy=DD&start=" + page * PAGE;

type Found = Map<string, Posting>;
type Cursors = Map<string, number>;

async function search(ctx: Ctx, log: Log, get: (url: string) => Promise<string>, found: Found, cursors: Cursors) {
  const errors: unknown[] = [];
  for (const q of ctx.settings.searchTerms)
    for (const place of locationsOf(ctx.settings)) {
      const at = q + "|" + geo(place.location) + workType(place);
      for (let page = cursors.get(at) ?? 0; page < MAX_PAGES; page++) {
        let cards: Posting[];
        try {
          cards = parseLinkedInCards(await get(searchUrl(q, place, page, ctx)), ctx.now);
        } catch (e) {
          cursors.set(at, page);
          if (e instanceof RateLimited) return { errors, stopped: e };
          errors.push(e);
          break;
        }
        const recent = cards.filter((c) => c.postedAt >= ctx.cutoff);
        for (const c of recent) if (!found.has(c.key)) found.set(c.key, c);
        log.progress(found.size + " found");
        cursors.set(at, page + 1);
        if (cards.length < PAGE || recent.length === 0) {
          cursors.set(at, page);
          break;
        }
      }
    }
  return { errors, stopped: null as RateLimited | null };
}

export function linkedIn() {
  const get = pacer();
  const found: Found = new Map();
  const cursors: Cursors = new Map();
  const sent = new Set<string>();
  let stopped: RateLimited | null = null;

  return async (ctx: Ctx, log: Log): Promise<Posting[]> => {
    if (stopped) throw stopped;
    if (!locationsOf(ctx.settings).length) {
      log.label("No LinkedIn locations set");
      return [];
    }
    const before = found.size;
    const result = await search(ctx, log, get, found, cursors);
    stopped = result.stopped;
    const { errors } = result;
    if (stopped && found.size === before) throw stopped;
    if (found.size === before && errors.length)
      throw new Error("search failed: " + errorText(errors[0]), { cause: errors[0] });
    if (errors.length || stopped) log.partial();
    if (errors.length) log.warn(errors.length + " search pages failed, e.g. " + errorText(errors[0]));

    const fresh = [...found.values()].filter((p) => !sent.has(p.key));
    for (const p of fresh) sent.add(p.key);
    const out = [...Map.groupBy(fresh, dedupeKey).values()].flatMap(([first, ...rest]) => [ctx.known(first), ...rest]);
    log.found(out);
    if (stopped) {
      log.label("Rate limited · stopped early");
      log.warn(errorText(stopped));
    } else if (rateLimits(HOST)) log.label("Rate limited · retried");
    return out;
  };
}
