import { expect, test } from "bun:test";
import { learnDescription, loadStore } from "../store";
import { NO_DESCRIPTION, hasDescription, longest, requireDescription } from "./description";

const real = "Build and run services. ".repeat(10);

test("gate", () => {
  expect(hasDescription("")).toBe(false);
  expect(hasDescription(undefined)).toBe(false);
  expect(hasDescription(" \n".repeat(300))).toBe(false);
  expect(hasDescription("Seniority level: Not Applicable\nEmployment type: Full-time")).toBe(false);
  expect(hasDescription(real)).toBe(true);
  expect(requireDescription(real)).toBe(real);
  expect(() => requireDescription("short")).toThrow(NO_DESCRIPTION);
  try {
    requireDescription("");
  } catch (e) {
    expect((e as { code?: string }).code).toBe("no-description");
  }
});

test("longest", () => {
  expect(longest(undefined, "", "ab", "a  b  c")).toBe("a  b  c");
  expect(longest()).toBe("");
});

test("learn", () => {
  const s = loadStore("/nonexistent/store.json");
  s.jobs.k = { key: "k", source: "linkedin", title: "T", company: "C", location: "", url: "", postedAt: 0, precision: "exact", description: "" };
  s.extractions.k = {} as never;
  const next = learnDescription(s, "k", real);
  expect(next.descriptions.k).toBe(real);
  expect(next.jobs.k.description).toBe(real);
  expect(next.extractions.k).toBeUndefined();
  expect(learnDescription(s, "gone", real).jobs.gone).toBeUndefined();
});
