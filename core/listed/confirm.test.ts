import { expect, test } from "bun:test";
import { buildRows } from "../refresh/rows";
import { markReposts } from "../repost";
import { SETTINGS } from "../settings/fixture";
import { NOW, job } from "../repost/fixture";
import { DAY, HOUR } from "../time";
import type { Extraction, Posting, Row } from "../types";
import { type Verdicts, confirm, due } from "./confirm";

const TOP = 4_480_000_000;
const PER_DAY = 450_000;

const ANCHORS = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => ["linkedin:" + (TOP - (6 - i) * (PER_DAY / 2)), NOW - (6 - i) * 12 * HOUR]),
);

const kept = { regions: ["metro"], version: "", reason: "", isSoftwareRole: true } as unknown as Extraction;

function rows(postings: Posting[], seen: Record<string, number>): Row[] {
  const { jobs } = markReposts({ jobs: Object.fromEntries(postings.map((p) => [p.key, p])), seen, sightings: {} }, NOW);
  return buildRows(Object.values(jobs), () => kept, seen, new Set(), SETTINGS).map((r) => ({ ...r, kept: true }));
}

const old = job("linkedin:" + (TOP - 60 * PER_DAY), { postedAt: NOW - HOUR });
const fresh = job("linkedin:" + TOP, { postedAt: NOW - HOUR, company: "Fresh" });
const seen = { ...ANCHORS, [old.key]: NOW, [fresh.key]: NOW };
const sightings = rows([old, fresh], seen);

const verdict = (reposted: boolean) => ({ reposted, via: "originalListedAt", checked: NOW });

test("unchecked: the id-age guess still flags the old LinkedIn id", () => {
  const out = confirm(sightings, {});
  expect(out.find((r) => r.key === old.key)?.repost?.signal).toBe("age");
  expect(out.find((r) => r.key === fresh.key)?.repost).toBeUndefined();
});

test("checked fresh: the LinkedIn verdict overrides the guess", () => {
  const out = confirm(sightings, { [old.key]: verdict(false) });
  expect(out.find((r) => r.key === old.key)?.repost).toBeUndefined();
});

test("checked fresh: same-id relist matching is dropped for that LinkedIn job", () => {
  const row = { ...sightings[0], repost: { signal: "bumped" as const, of: sightings[0].key, at: NOW - 3 * DAY } };
  expect(confirm([row], { [row.key]: verdict(false) })[0].repost).toBeUndefined();
  expect(confirm([row], {})[0].repost?.signal).toBe("bumped");
});

test("checked reposted: LinkedIn flags it with the original date", () => {
  const v: Verdicts = { [fresh.key]: { ...verdict(true), first: NOW - 30 * DAY } };
  const out = confirm(sightings, v);
  expect(out.find((r) => r.key === fresh.key)?.repost).toEqual({ signal: "linkedin", of: fresh.key, at: NOW - 30 * DAY });
  expect(out.find((r) => r.key === old.key)?.repost?.signal).toBe("age");
});

test("other sources keep their own signals unless LinkedIn cleared the job they point at", () => {
  const own = { ...sightings[0], key: "lever:a:1", source: "lever" as const, repost: { signal: "history" as const, of: "lever:a:0", at: 1 } };
  const borrowed = { ...own, key: "lever:a:2", repost: { signal: "age" as const, of: old.key, at: 1 } };
  const [a, b] = confirm([own, borrowed], { [old.key]: verdict(false) });
  expect(a.repost?.signal).toBe("history");
  expect(b.repost).toBeUndefined();
  expect(confirm([borrowed], { [old.key]: verdict(true) })[0].repost?.signal).toBe("age");
  expect(confirm([own], { "lever:a:1": verdict(false) })[0].repost?.signal).toBe("history");
});

test("due: unchecked kept LinkedIn jobs, newest first", () => {
  const newer = { ...sightings[0], key: "linkedin:2", effectiveAt: NOW };
  const older = { ...sightings[0], key: "linkedin:1", effectiveAt: NOW - DAY };
  const filtered = { ...newer, key: "linkedin:3", kept: false };
  const other = { ...newer, key: "lever:a:9", source: "lever" as const };
  const done = { ...newer, key: "linkedin:4" };
  const keys = due([older, filtered, newer, other, done], { "linkedin:4": verdict(false) }).map((r) => r.key);
  expect(keys).toEqual(["linkedin:2", "linkedin:1"]);
});
