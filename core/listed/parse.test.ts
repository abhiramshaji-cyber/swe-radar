import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parseJobPage, parseVoyager } from "./parse";

const REPOSTED = "4471618709";
const FRESH = "4477748438";

const fixture = (name: string) =>
  fs.readFileSync(path.join(import.meta.dir, "fixtures", name), "utf8");
const json = (name: string) => JSON.parse(fixture(name));

test("voyager: listedAt weeks after originalListedAt is a repost dated to the original", () => {
  expect(parseVoyager(json("voyager-reposted.json"), REPOSTED)).toEqual({
    reposted: true,
    first: 1790267337000,
    via: "originalListedAt",
  });
});

test("voyager: listedAt minutes after originalListedAt is fresh", () => {
  expect(parseVoyager(json("voyager-fresh.json"), FRESH)).toMatchObject({
    reposted: false,
    via: "originalListedAt",
  });
});

test("voyager: only the posting whose urn matches the id counts", () => {
  expect(parseVoyager(json("voyager-reposted.json"), FRESH)).toBeNull();
  const both = {
    data: json("voyager-fresh.json").data,
    included: [json("voyager-reposted.json").data],
  };
  expect(parseVoyager(both, REPOSTED)?.reposted).toBe(true);
  expect(parseVoyager(both, FRESH)?.reposted).toBe(false);
});

test("voyager: missing either timestamp or a junk body gives no verdict", () => {
  const { originalListedAt: _, ...rest } = json("voyager-reposted.json").data;
  expect(parseVoyager({ data: rest }, REPOSTED)).toBeNull();
  expect(
    parseVoyager({ data: { ...rest, originalListedAt: "soon" } }, REPOSTED),
  ).toBeNull();
  expect(parseVoyager(null, REPOSTED)).toBeNull();
  expect(parseVoyager("<html>", REPOSTED)).toBeNull();
});

test("page: top card saying Reposted marks a repost", () => {
  expect(parseJobPage(fixture("page-reposted.html"))).toEqual({
    reposted: true,
    via: "top-card",
  });
});

test("page: top card with only a posted time marks the job fresh", () => {
  expect(parseJobPage(fixture("page-fresh.html"))).toEqual({
    reposted: false,
    via: "top-card",
  });
});

test("page: similar job cards below never decide", () => {
  const cards = fixture("page-reposted.html").replace(
    /<p[^>]*><span[^>]*>Shelbyville.*?<\/p>/,
    "",
  );
  expect(parseJobPage(cards)).toBeNull();
});

test("page: a page without a top card is unknown, never fresh", () => {
  expect(
    parseJobPage(
      "<html><body><main><p>Sign in · Join now</p></main></body></html>",
    ),
  ).toBeNull();
  expect(parseJobPage("")).toBeNull();
});

test("voyager: the same response carries the posting description", () => {
  const data = { ...json("voyager-fresh.json").data, description: { text: "  Build the payments API in Go.  " } };
  expect(parseVoyager({ data }, FRESH)?.description).toBe("Build the payments API in Go.");
  expect(parseVoyager(json("voyager-fresh.json"), FRESH)?.description).toBeUndefined();
});
