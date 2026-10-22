import { expect, mock, test } from "bun:test";

const bullets = [
  "web scraping selectors replayed against recorded pages before any change ships",
  "Rust parsers keep malformed records out of downstream jobs",
  "five years of crawling at Acme Robotics",
];

mock.module("../../ask/ai", () => ({
  askJson: async (instructions: string) =>
    instructions.startsWith("You compare")
      ? { keywords: [{ term: "web scraping or data acquisition at scale", hard: true }, { term: "Rust", hard: true }] }
      : instructions.startsWith("You review")
        ? { lines: bullets.map(() => ({ ok: true, issue: "", rewrite: "" })) }
        : { bullets: bullets.map((text) => ({ text })), sentence: "I keep 3 scrapers healthy" },
}));

const { analyze } = await import("./analyze");

test("ships the best repaired attempt when checks never pass", async () => {
  const p = { key: "x", title: "Software Engineer, Data Acquisition", company: "Nascent", location: "Springfield" } as any;
  const a = await analyze(p, "web scraping or data acquisition at scale in Rust");
  expect(a.bullets.map((b) => b.text)).toEqual(bullets.slice(0, 2));
  expect(a.sentence).toBe("");
});
