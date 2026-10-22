import fs from "node:fs";
import path from "node:path";
import { HttpError, errorText, getJson, mapPool, sleep } from "../core/http";
import type { Ats, Board } from "../core/types";
import slugs from "../data/slugs.json";

const alnum = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

export const plausible = (slug: string, name: string) => {
  const a = alnum(slug);
  const b = alnum(name);
  return (
    !!a &&
    !!b &&
    (b.includes(a) || a.includes(b) || a.slice(0, 5) === b.slice(0, 5))
  );
};

const titleCase = (slug: string) =>
  slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

type Probe = (slug: string) => Promise<string | null | false>;

const probes: Record<Ats, Probe> = {
  greenhouse: async (slug) => {
    const d = await getJson(
      "https://boards-api.greenhouse.io/v1/boards/" + slug,
    );
    return typeof d?.name === "string" ? d.name : null;
  },
  lever: async (slug) =>
    Array.isArray(
      await getJson(
        "https://api.lever.co/v0/postings/" + slug + "?mode=json&limit=1",
      ),
    )
      ? null
      : false,
  ashby: async (slug) =>
    Array.isArray(
      (await getJson("https://api.ashbyhq.com/posting-api/job-board/" + slug))
        ?.jobs,
    )
      ? null
      : false,
  smartrecruiters: async (slug) => {
    const d = await getJson(
      "https://api.smartrecruiters.com/v1/companies/" +
        slug +
        "/postings?limit=1",
    );
    return d?.totalFound > 0 ? (d.content?.[0]?.company?.name ?? null) : false;
  },
  recruitee: async (slug) => {
    const d = await getJson("https://" + slug + ".recruitee.com/api/offers/");
    return Array.isArray(d?.offers)
      ? (d.offers[0]?.company_name ?? null)
      : false;
  },
};

async function probe(slug: string, ats: Ats, attempt = 0): Promise<Board | null> {
  try {
    const name = await probes[ats](slug);
    if (name === false) return null;
    if (name && !plausible(slug, name)) {
      console.error("reject " + ats + ":" + slug + " named " + name);
      return null;
    }
    return { slug, ats, company: name || titleCase(slug) };
  } catch (e) {
    if (e instanceof HttpError && e.status === 429 && attempt < 6) {
      await sleep(2000 * 2 ** attempt);
      return probe(slug, ats, attempt + 1);
    }
    if (!(e instanceof HttpError && e.status === 404))
      console.error("miss " + ats + ":" + slug + " " + errorText(e));
    return null;
  }
}

if (import.meta.main) {
  const tasks = (slugs as string[]).flatMap((slug) =>
    (Object.keys(probes) as Ats[]).map((ats) => ({ slug, ats })),
  );
  let done = 0;
  const found = await mapPool(tasks, 16, async (t) => {
    const b = await probe(t.slug, t.ats);
    if (++done % 250 === 0) console.error(done + "/" + tasks.length);
    return b;
  });
  const boards = found
    .filter((b): b is Board => !!b)
    .sort((a, b) => a.ats.localeCompare(b.ats) || a.slug.localeCompare(b.slug));
  fs.writeFileSync(
    path.join(import.meta.dir, "..", "data", "boards.json"),
    JSON.stringify(boards, null, 1) + "\n",
  );
  const by = Object.groupBy(boards, (b) => b.ats);
  console.log(
    "boards " +
      boards.length +
      " " +
      Object.entries(by)
        .map(([k, v]) => k + "=" + v!.length)
        .join(" "),
  );
}
