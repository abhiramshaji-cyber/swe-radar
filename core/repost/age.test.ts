import { describe, expect, test } from "bun:test";
import { DAY, HOUR } from "../time";
import type { Posting } from "../types";
import { NOW, job } from "./fixture";
import { markReposts } from "./index";

const TOP = 4_480_000_000;
const PER_DAY = 450_000;
const COHERE = 4_259_510_227;

const scans = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [
    "linkedin:" + (TOP - (6 - i) * (PER_DAY / 2)),
    NOW - (6 - i) * 12 * HOUR,
  ]),
);

const li = (id: number, postedAt: number, title = "Role " + id) =>
  job("linkedin:" + id, { postedAt, title });

const marks = (jobs: Posting[], anchors: Record<string, number> = scans) =>
  markReposts(
    {
      jobs: Object.fromEntries(jobs.map((p) => [p.key, p])),
      seen: {
        ...anchors,
        ...Object.fromEntries(jobs.map((p) => [p.key, NOW])),
      },
      sightings: {},
    },
    NOW,
  ).jobs;

const daysOld = (id: number) => (TOP - id) / PER_DAY;

describe("id age", () => {
  test("one listing with a misleading old date does not mark the newer ids below it", () => {
    const m = marks([
      li(TOP, NOW - 3 * DAY),
      li(TOP - 100_000, NOW - HOUR),
      li(TOP - 900_000, NOW - 2 * HOUR),
    ]);
    expect(Object.values(m).filter((p) => p.repost)).toEqual([]);
  });

  test("an id from over a year ago shown as hours old is a repost dated by its id", () => {
    const r = marks([li(COHERE, NOW - 7 * HOUR)])["linkedin:" + COHERE].repost;
    expect(r?.signal).toBe("age");
    expect(r?.shown).toBe(NOW - 7 * HOUR);
    expect((NOW - r!.at!) / DAY).toBeCloseTo(daysOld(COHERE), -1);
  });

  test("an id a week below the frontier is a late first listing, not a repost", () => {
    const id = TOP - 7 * PER_DAY;
    expect(
      marks([li(id, NOW - HOUR)])["linkedin:" + id].repost,
    ).toBeUndefined();
  });

  test("an id three weeks below the frontier shown as hours old is a repost", () => {
    const id = TOP - 21 * PER_DAY;
    expect(marks([li(id, NOW - HOUR)])["linkedin:" + id].repost?.signal).toBe("age");
  });

  test("first run with a single scan flags nothing", () => {
    const m = marks([li(TOP, NOW - 3 * DAY), li(COHERE, NOW - 7 * HOUR)], {});
    expect(Object.values(m).filter((p) => p.repost)).toEqual([]);
  });

  test("one anchor with a skewed clock moves nothing", () => {
    const skewed = { ...scans, ["linkedin:" + (TOP + 50_000)]: NOW - 40 * DAY };
    const m = marks(
      [li(TOP - 200_000, NOW - HOUR), li(COHERE, NOW - 7 * HOUR)],
      skewed,
    );
    expect(m["linkedin:" + (TOP - 200_000)].repost).toBeUndefined();
    expect((NOW - m["linkedin:" + COHERE].repost!.at!) / DAY).toBeCloseTo(
      daysOld(COHERE),
      -1,
    );
  });
});
