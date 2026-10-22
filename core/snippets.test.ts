import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SEED, readSnippets, saveSnippets } from "./snippets";

const file = () =>
  path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "snippets-")),
    "snippets.json",
  );

describe("snippets", () => {
  test("a missing file seeds the defaults", () => {
    expect(readSnippets(file())).toEqual(SEED);
  });

  test("a corrupt file falls back to an empty list", () => {
    const f = file();
    fs.writeFileSync(f, "{not json");
    expect(readSnippets(f)).toEqual([]);
  });

  test("a non list file falls back to an empty list", () => {
    const f = file();
    fs.writeFileSync(f, '{"id":"a"}');
    expect(readSnippets(f)).toEqual([]);
  });

  test("malformed entries are dropped and good ones kept", () => {
    const f = file();
    fs.writeFileSync(
      f,
      JSON.stringify([{ id: "a", label: "A", value: "1" }, { id: 2 }, null]),
    );
    expect(readSnippets(f)).toEqual([{ id: "a", label: "A", value: "1" }]);
  });

  test("an empty list stays empty instead of reseeding", () => {
    const f = file();
    saveSnippets(f, []);
    expect(readSnippets(f)).toEqual([]);
  });

  test("a saved list round trips with multiline values", () => {
    const f = file();
    const list = [{ id: "x", label: "Cover", value: "line one\nline two" }];
    saveSnippets(f, list);
    expect(readSnippets(f)).toEqual(list);
    expect(fs.existsSync(f + ".tmp")).toBe(false);
  });

  test("an invalid save throws and leaves the file untouched", () => {
    const f = file();
    saveSnippets(f, SEED);
    expect(() => saveSnippets(f, [{ id: "a" }])).toThrow();
    expect(() => saveSnippets(f, "nope")).toThrow();
    expect(readSnippets(f)).toEqual(SEED);
  });

  test("the seed is a copy so callers cannot mutate it", () => {
    readSnippets(file())[0].label = "changed";
    expect(SEED[0].label).toBe("Address");
  });
});
