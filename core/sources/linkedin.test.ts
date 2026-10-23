import { SETTINGS } from "../settings/fixture";
import type { Settings } from "../settings";
import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { paced, resetHosts } from "../http";
import { markReposts } from "../repost";
import type { Ctx, Log, Posting } from "../types";
import { linkedIn, parseLinkedInCards } from "./linkedin";

const CAPTURED = Date.UTC(2026, 9, 17, 16, 49);

const ANCHORS = {
  "linkedin:4479224296": 1791935879712,
  "linkedin:4479247206": 1791940811554,
  "linkedin:4479709660": 1792021109441,
  "linkedin:4479731384": 1792024132015,
  "linkedin:4480123319": 1792088746004,
  "linkedin:4480531412": 1792181582000,
  "linkedin:4480557035": 1792184542195,
  "linkedin:4480586085": 1792197816572,
  "linkedin:4469688449": 1792203452710,
  "linkedin:4480842013": 1792254448805,
};

const html = fs.readFileSync(path.join(import.meta.dir, "fixtures/linkedin-cards.html"), "utf8");

test("captured search cards: the reposted Example Exchange listing is flagged, the fresh Example Insurance one is not", () => {
  const cards = parseLinkedInCards(html, CAPTURED);
  const { jobs } = markReposts(
    {
      jobs: Object.fromEntries(cards.map((p) => [p.key, p])),
      seen: { ...ANCHORS, ...Object.fromEntries(cards.map((p) => [p.key, CAPTURED])) },
      sightings: {},
    },
    CAPTURED,
  );
  expect(jobs["linkedin:4470753169"].company).toBe("Example Exchange");
  expect(jobs["linkedin:4470753169"].repost?.signal).toBe("age");
  expect(jobs["linkedin:4480592303"].repost).toBeUndefined();
});

const NOW = Date.UTC(2026, 9, 17, 20);
const real = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = real;
  resetHosts();
});

const card = (id: string, title: string) =>
  `<div data-entity-urn="urn:li:jobPosting:${id}"><h3 class="base-search-card__title">${title}</h3><h4 class="base-search-card__subtitle">Acme</h4><span class="job-search-card__location">Springfield, IL</span><time>1 hour ago</time></div>`;

function serve(search: string) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("seeMoreJobPostings"))
      return new Response(url.includes("start=0") ? search : "");
    return new Response("", { status: 404 });
  }) as typeof fetch;
  return calls;
}

function harness(known: Record<string, string>, settings: Settings = SETTINGS) {
  const emitted: Posting[] = [];
  const ctx: Ctx = {
    settings,
    now: NOW,
    cutoff: NOW - 12 * 3600_000,
    from: NOW - 12 * 3600_000,
    dead: {},
    known: (p) => (known[p.key] ? { ...p, description: known[p.key] } : p),
    done: () => false,
    finish: () => {},
  };
  const log: Log = {
    progress: () => {},
    warn: () => {},
    label: () => {},
    found: (ps) => emitted.push(...ps),
    partial: () => {},
  };
  const run = () =>
    paced.run({ gap: 1, limited: () => {} }, () => linkedIn()(ctx, log));
  return { run, emitted };
}

test("search cards reach the classifier without a detail fetch, keeping any known description", async () => {
  const calls = serve(card("1", "Software Engineer") + card("2", "Backend Developer"));
  const { run, emitted } = harness({ "linkedin:2": "Own the Rails monolith" });
  await run();
  expect(calls.some((u) => u.includes("jobPosting/"))).toBe(false);
  expect(Object.fromEntries(emitted.map((p) => [p.key, p.description]))).toEqual({
    "linkedin:1": "",
    "linkedin:2": "Own the Rails monolith",
  });
});

test("a remote-only region searches with f_WT=2 beside an onsite region sharing its location", async () => {
  const calls = serve(card("1", "Software Engineer"));
  const regions = [
    { id: "remote", label: "Remote", description: "Remote anywhere in my country", linkedinLocation: "Springfield", linkedinRemoteOnly: true },
    { id: "metro", label: "Metro", description: "Onsite or hybrid in Springfield", linkedinLocation: "Springfield" },
  ];
  const { run } = harness({}, { ...SETTINGS, searchTerms: ["software engineer"], regions });
  await run();
  expect(calls.filter((u) => u.includes("f_WT=2")).length).toBe(1);
  expect(calls.filter((u) => u.includes("seeMoreJobPostings") && !u.includes("f_WT")).length).toBe(1);
});

test("search cards keep the linkedin company page link", () => {
  const cards = parseLinkedInCards(html, CAPTURED);
  expect(cards.find((p) => p.key === "linkedin:4470753169")?.companyUrl).toBe("https://www.linkedin.com/company/example-exchange");
});
