import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { blocked } from "./blocked";
import { loadStore } from "./store";
import type { Posting } from "./types";

const job = (key: string, source: string, url: string) =>
  ({ key, source, url, title: "Engineer", company: "Acme", location: "", postedAt: 0, precision: "exact", description: "" }) as Posting;

test("blocks by source id and by apply host, not by text", () => {
  expect(blocked(job("a", "jobbank", "https://x.test"))).toBe(false);
  expect(blocked(job("b", "himalayas", "https://x.test"))).toBe(true);
  expect(blocked(job("c", "linkedin", "https://www.example.com/jobs/1"))).toBe(false);
  expect(blocked(job("d", "linkedin", "https://HIMALAYAS.app/companies/x/jobs/1"))).toBe(true);
  expect(blocked(job("e", "lever", "https://jobs.lever.co/himalayas.app"))).toBe(false);
  expect(blocked(job("f", "lever", "https://nothimalayas.app/x"))).toBe(false);
  expect(blocked(job("g", "lever", "not a url"))).toBe(false);
});

test("stored jobs and statuses from removed sources are dropped on load", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "store-")), "store.json");
  const jobs = Object.fromEntries(
    [job("himalayas:1", "himalayas", "https://x.test"), job("lever:1", "lever", "https://jobs.lever.co/a/1")].map((p) => [p.key, p]),
  );
  const statuses = [{ source: "himalayas", state: "ok", count: 3 }, { source: "lever", state: "ok", count: 1 }];
  fs.writeFileSync(file, JSON.stringify({ jobs, last: { at: 1, rows: [], statuses }, scan: { done: [], statuses } }));
  const s = loadStore(file);
  expect(Object.keys(s.jobs)).toEqual(["lever:1"]);
  expect(s.last?.statuses.map((x) => x.source)).toEqual(["lever"]);
  expect(s.scan?.statuses.map((x) => x.source)).toEqual(["lever"]);
});
