import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dedupe } from "../dedupe";
import { storeJobs } from "../refresh/rows";
import { loadStore } from "../store";
import { DAY } from "../time";
import { NOW, job } from "./fixture";

describe("rows and store", () => {
  test("a merged row carries the repost of any member", () => {
    const [row] = dedupe([
      job("lever:a:1"),
      job("lever:a:2", {
        repost: { signal: "history", of: "lever:a:1", at: 1 },
      }),
    ]);
    expect(row.repost?.of).toBe("lever:a:1");
  });

  test("an old store file without sightings loads and keeps every field", () => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "radar-")),
      "store.json",
    );
    const old = {
      seen: { "lever:a:1": NOW },
      jobs: { "lever:a:1": job("lever:a:1") },
      applied: ["lever:a:1"],
      extra: 1,
    };
    fs.writeFileSync(file, JSON.stringify(old));
    const s = loadStore(file);
    expect(s.sightings).toEqual({});
    expect(s.jobs).toEqual(old.jobs);
    expect(s.applied).toEqual(old.applied);
    expect((s as any).extra).toBe(1);
  });

  test("the same fetch marks the newer listing even when it arrives first", () => {
    const s = { ...loadStore("/nonexistent/store.json") };
    storeJobs(s, [job("lever:a:2")], NOW, 5 * DAY);
    storeJobs(s, [job("lever:a:1", { postedAt: NOW - 4 * DAY })], NOW, 5 * DAY);
    expect(s.jobs["lever:a:2"].repost?.of).toBe("lever:a:1");
    expect(s.jobs["lever:a:1"].repost).toBeUndefined();
  });
});
