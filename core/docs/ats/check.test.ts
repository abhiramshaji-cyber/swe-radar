import { expect, test } from "bun:test";
import type { Analysis } from "./analyze";
import { KEYWORDS_PER_BULLET, covered, invented, maxBullets, problems } from "./check";

const analysis = (keywords: [string, boolean][], texts: string[]): Analysis => ({
  keywords: keywords.map(([term, hard]) => ({ term, hard })),
  bullets: texts.map((text) => ({ text })),
  sentence: "",
});

const coverage = (a: Analysis) => problems(a).filter((p) => p.includes("missing") || p.includes("repeat"));

test("inflection", () => {
  expect(covered("testing methodologies", "the CI pipeline runs testing methodology checks")).toBe(true);
  expect(covered("testing methodologies", "Testing-Methodologies drive each pass")).toBe(true);
  expect(covered("testing methodology", "testing methodologies")).toBe(true);
  expect(covered("RESTful APIs", "a RESTful API contract")).toBe(true);
  expect(covered("LLMs", "an LLM call")).toBe(true);
  expect(covered("analysis", "static analysis")).toBe(true);
  expect(covered("code review", "code reviews gate merge")).toBe(true);
  expect(covered("processes", "one process")).toBe(true);
  expect(covered("classes", "a class")).toBe(true);
  expect(covered("databases", "the database")).toBe(true);
  expect(covered("CI/CD", "GitHub Actions CI/CD reruns")).toBe(true);
  expect(covered("Node.js", "Node.js services")).toBe(true);
});

test("whole word", () => {
  expect(covered("security", "cybersecurity tooling")).toBe(false);
  expect(covered("Go", "Golang services")).toBe(false);
  expect(covered("Java", "JavaScript bundles")).toBe(false);
  expect(covered("C", "C# services")).toBe(false);
  expect(covered("testing methodologies", "testing methods")).toBe(false);
});

test("overlap", () => {
  const keywords: [string, boolean][] = [["security", true], ["security libraries", true], ["testing methodologies", true]];
  const a = analysis(keywords, [
    "security reviews start on a short branch before the CI pipeline builds each change",
    "security libraries pass the CI pipeline on typecheck and tests until they hold",
    "testing methodology checks run before the merge gate accepts evidence for merge",
  ]);
  expect(coverage(a)).toEqual([]);
});

test("repeat", () => {
  const keywords: [string, boolean][] = [["security", true], ["Rust", true], ["Golang", true]];
  const a = analysis(keywords, [
    "Rust security fixes start on a short branch before the CI pipeline builds each change",
    "Golang security checks pass the CI pipeline on typecheck and tests until they hold",
    "every change waits until the merge gate accepts evidence for merge",
  ]);
  expect(coverage(a)).toEqual(["each hard keyword belongs in one bullet only, these repeat: security"]);
});

test("missing", () => {
  const a = analysis([["testing methodologies", true], ["Rust", true]], [
    "Rust crates start on a short branch before the CI pipeline builds each change",
    "test methods pass the CI pipeline on typecheck until they hold",
    "every change waits until the merge gate accepts evidence for merge",
  ]);
  expect(coverage(a)).toEqual(["hard keywords missing from the bullets word for word: testing methodologies"]);
});

const stuffing = (a: Analysis) => problems(a).filter((p) => p.startsWith("at most"));

test("cap", () => {
  const keywords: [string, boolean][] = [["Rust", true], ["Golang", true], ["gRPC", true], ["Kafka", true]];
  const a = analysis(keywords, [
    "Rust, Golang and gRPC services built behind typed contracts with hooks on every edit",
    "Kafka consumers replayed against recorded topics before any schema change",
    "every change waits for my own careful diff review",
  ]);
  expect(stuffing(a)).toEqual(["at most " + KEYWORDS_PER_BULLET + " hard keywords per bullet, this one stuffs Rust, Golang, gRPC: " + a.bullets[0].text]);
});

test("pair", () => {
  const keywords: [string, boolean][] = [["Rust", true], ["Golang", true], ["security", true], ["security libraries", true], ["usability", false]];
  const a = analysis(keywords, [
    "Rust and Golang services built behind typed contracts with hooks on every edit",
    "vetted security libraries only, security fixes tested against known exploits, usability kept",
    "every change waits for my own careful diff review",
  ]);
  expect(stuffing(a)).toEqual([]);
});

test("room", () => {
  const terms = Array.from({ length: 15 }, (_, i) => ["tool" + String.fromCharCode(97 + i), true] as [string, boolean]);
  expect(maxBullets(analysis(terms, []))).toBe(8);
  expect(maxBullets(analysis([["Rust", true]], []))).toBe(6);
});

test("filler is judged, not banned", () => {
  const a = analysis([["web scraping", true]], [
    "web scraping keeps selectors pinned to fixtures, each change replayed against recorded pages",
    "every change waits for my own careful diff review",
    "hooks reject untyped edits before any change can merge",
  ]);
  expect(problems(a).filter((p) => p.includes("filler"))).toEqual([]);
});

test("invented", () => {
  expect(invented("5 years of web scraping at Acme Robotics", ["web scraping"], "line")).toHaveLength(3);
  expect(invented("web scraping replayed against recorded pages", ["web scraping"], "line")).toEqual([]);
});
