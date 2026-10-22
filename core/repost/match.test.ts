import { describe, expect, test } from "bun:test";
import { DAY, HOUR } from "../time";
import type { Posting } from "../types";
import { NOW, job } from "./fixture";
import { GAP, markReposts, relisted, sameArea } from "./index";

const store = (jobs: Posting[], seen: Record<string, number> = {}) => ({
  jobs: Object.fromEntries(jobs.map((p) => [p.key, p])),
  seen: Object.fromEntries(jobs.map((p) => [p.key, seen[p.key] ?? NOW])),
  sightings: {},
});

const flags = (jobs: Posting[], seen?: Record<string, number>) =>
  Object.fromEntries(
    Object.values(markReposts(store(jobs, seen), NOW).jobs).map((p) => [
      p.key,
      p.repost ?? null,
    ]),
  );

describe("history", () => {
  test("empty history marks nothing", () => {
    expect(flags([job("linkedin:9")])["linkedin:9"]).toBeNull();
  });

  test("newer id for the same role is a repost of the older one", () => {
    const f = flags([
      job("linkedin:1", { postedAt: NOW - 4 * DAY }),
      job("linkedin:2"),
    ]);
    expect(f["linkedin:2"]).toEqual({
      signal: "history",
      of: "linkedin:1",
      at: NOW - 4 * DAY,
    });
    expect(f["linkedin:1"]).toBeNull();
  });

  test("two listings within the gap are duplicates", () => {
    const f = flags([
      job("lever:a:1", { postedAt: NOW - GAP + HOUR }),
      job("lever:a:2"),
    ]);
    expect(f["lever:a:2"]).toBeNull();
  });

  test("same role from two sources is a duplicate, not a repost", () => {
    const f = flags([
      job("greenhouse:a:1", { postedAt: NOW - 4 * DAY }),
      job("linkedin:2"),
    ]);
    expect(f["linkedin:2"]).toBeNull();
  });

  test("company renamed only by suffix still matches", () => {
    const f = flags([
      job("lever:a:1", { postedAt: NOW - 4 * DAY, company: "ACME, Inc." }),
      job("lever:a:2", { company: "Acme Ltd" }),
    ]);
    expect(f["lever:a:2"]?.of).toBe("lever:a:1");
  });

  test("title differing only by case and punctuation matches", () => {
    const f = flags([
      job("lever:a:1", {
        postedAt: NOW - 4 * DAY,
        title: "Software Engineer - Backend",
      }),
      job("lever:a:2", { title: "software engineer (backend)" }),
    ]);
    expect(f["lever:a:2"]?.signal).toBe("history");
  });

  test("same title in a different city is a different role", () => {
    const f = flags([
      job("lever:a:1", { postedAt: NOW - 4 * DAY, location: "Springfield, IL" }),
      job("lever:a:2"),
    ]);
    expect(f["lever:a:2"]).toBeNull();
  });

  test("missing dates never mark", () => {
    const f = flags(
      [job("lever:a:1", { postedAt: NaN }), job("lever:a:2", { postedAt: 0 })],
      { "lever:a:1": NaN, "lever:a:2": NaN },
    );
    expect(Object.values(f).every((r) => r === null)).toBe(true);
  });

  test("evidence is kept once found", () => {
    const first = markReposts(
      store([job("lever:a:1", { postedAt: NOW - 4 * DAY }), job("lever:a:2")]),
      NOW,
    );
    delete first.jobs["lever:a:1"];
    expect(markReposts(first, NOW).jobs["lever:a:2"].repost?.of).toBe(
      "lever:a:1",
    );
  });
});

describe("bumped", () => {
  test("a listing seen days before its new post date was bumped", () => {
    const f = flags([job("lever:a:7", { postedAt: NOW - HOUR })], {
      "lever:a:7": NOW - 3 * DAY,
    });
    expect(f["lever:a:7"]).toEqual({
      signal: "bumped",
      of: "lever:a:7",
      at: NOW - 3 * DAY,
    });
  });

  test("the same id relisted a little over a day later was bumped", () => {
    const f = flags([job("linkedin:7", { postedAt: NOW - HOUR })], {
      "linkedin:7": NOW - 26 * HOUR,
    });
    expect(f["linkedin:7"]?.signal).toBe("bumped");
  });

  test("relative time jitter under a day is not a bump", () => {
    const f = flags([job("lever:a:7", { postedAt: NOW - HOUR })], {
      "lever:a:7": NOW - 20 * HOUR,
    });
    expect(f["lever:a:7"]).toBeNull();
  });
});

describe("board", () => {
  test("an older listing of the same role on the board marks the new one", () => {
    const [old, fresh] = relisted([
      job("greenhouse:a:1", { postedAt: NOW - 40 * DAY }),
      job("greenhouse:a:2"),
    ]);
    expect(old.repost).toBeUndefined();
    expect(fresh.repost).toEqual({
      signal: "board",
      of: "greenhouse:a:1",
      at: NOW - 40 * DAY,
    });
  });
});

describe("area", () => {
  test("unknown location is compatible", () => {
    expect(sameArea("", "Ogdenville, OH")).toBe(true);
  });

  test("annotations and state spelling do not matter", () => {
    expect(
      sameArea(
        "Springfield, IL (Hybrid) [US]",
        "Springfield, Illinois, United States",
      ),
    ).toBe(true);
  });

  test("any shared city in a multi place listing matches", () => {
    expect(sameArea("Shelbyville, IL; Ogdenville, OH", "Ogdenville")).toBe(true);
  });
});

