import boardsJson from "../../data/boards.json";
import { HttpError, RateLimited, errorText, failKind, mapPool } from "../http";
import { fetchAmazon } from "../sources/amazon";
import { fetchAshby } from "../sources/ashby";
import { fetchGreenhouse } from "../sources/greenhouse";
import { fetchLever } from "../sources/lever";
import { linkedIn } from "../sources/linkedin";
import { fetchMicrosoft } from "../sources/microsoft";
import { fetchRecruitee } from "../sources/recruitee";
import { fetchSmartRecruiters } from "../sources/smartrecruiters";
import type { Ats, Board, Ctx, Log, Posting, Source } from "../types";

export type Run = (ctx: Ctx, log: Log) => Promise<Posting[]>;

const BOARDS = boardsJson as Board[];
const PER_PROVIDER = 2;
const WORD = { rate: "Rate limited", offline: "Offline", down: "Down" } as const;

export const failLabel = (e: unknown, kept: number) => WORD[failKind(e)] + (kept ? " · kept " + kept : "");

type List = (b: Board, ctx: Ctx) => Promise<Posting[]>;

const wide = (ctx: Ctx): Ctx => ({ ...ctx, cutoff: ctx.from });

const once = (run: Run): Run => {
  let all: Promise<Posting[]> | undefined;
  return (ctx, log) => (all ??= run(wide(ctx), log));
};

const sweep = (ats: Ats, list: List): Run => {
  const lists = new Map<string, Promise<Posting[]>>();
  let limited: unknown;
  return async (ctx, log) => {
    const id = (b: Board) => ats + ":" + b.slug;
    const boards = BOARDS.filter((b) => b.ats === ats && !(id(b) in ctx.dead));
    const left = boards.filter((b) => !ctx.done(id(b)));
    let done = boards.length - left.length;
    const gone: string[] = [];
    const failed: { slug: string; e: unknown }[] = [];
    const found = await mapPool(left, PER_PROVIDER, async (b) => {
      if (limited) return [];
      if (!lists.has(b.slug)) lists.set(b.slug, list(b, wide(ctx)));
      const recent = (rows: Posting[]) => rows.filter((p) => p.postedAt >= ctx.cutoff);
      let ok = true;
      const r = await lists.get(b.slug)!.then((rows) => recent(rows).map(ctx.known)).catch((e) => {
        ok = false;
        if (e instanceof HttpError && e.status === 404) {
          ctx.dead[id(b)] = ctx.now;
          gone.push(b.slug);
        } else failed.push({ slug: b.slug, e });
        if (failKind(e) === "rate") limited ??= e;
        return [];
      });
      log.found(r);
      if (ok) ctx.finish(id(b));
      log.progress(++done + "/" + boards.length + " boards");
      return r;
    });
    const example = failed[0] && failed[0].slug + ": " + errorText(failed[0].e);
    if (left.length < boards.length) log.partial();
    if (limited) throw new RateLimited(ats + " rate limited, stopped after " + done + "/" + boards.length + " boards", { cause: limited });
    if (gone.length) log.warn("gone, rechecked weekly: " + gone.join(", "));
    if (failed.length && failed.length === left.length - gone.length)
      throw new Error("all " + boards.length + " boards failed, e.g. " + example, {
        cause: failed[0].e,
      });
    if (failed.length) {
      log.partial();
      log.label("Partial · " + failed.length + " failed");
      log.warn(failed.length + "/" + boards.length + " boards failed, e.g. " + example);
    }
    return found.flat();
  };
};

export const SOURCES: [Source, () => Run][] = [
  ["linkedin", () => once(linkedIn())],
  ["amazon", () => once(fetchAmazon)],
  ["microsoft", () => once(fetchMicrosoft)],
  ["greenhouse", () => sweep("greenhouse", fetchGreenhouse)],
  ["lever", () => sweep("lever", fetchLever)],
  ["ashby", () => sweep("ashby", fetchAshby)],
  ["smartrecruiters", () => sweep("smartrecruiters", fetchSmartRecruiters)],
  ["recruitee", () => sweep("recruitee", fetchRecruitee)],
];
