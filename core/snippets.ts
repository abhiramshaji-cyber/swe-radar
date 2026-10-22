import fs from "node:fs";

export type Snippet = { id: string; label: string; value: string };

export const SEED: Snippet[] = [
  { id: "address", label: "Address", value: "" },
  { id: "postal", label: "Postal code", value: "" },
  { id: "phone", label: "Phone", value: "" },
  { id: "email", label: "Email", value: "" },
];

const isSnippet = (s: any): s is Snippet =>
  typeof s?.id === "string" &&
  typeof s.label === "string" &&
  typeof s.value === "string";

const clean = (list: unknown): Snippet[] =>
  Array.isArray(list)
    ? list
        .filter(isSnippet)
        .map(({ id, label, value }) => ({ id, label, value }))
    : [];

export function readSnippets(file: string): Snippet[] {
  if (!fs.existsSync(file)) return SEED.map((s) => ({ ...s }));
  try {
    return clean(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return [];
  }
}

export function saveSnippets(file: string, list: unknown) {
  if (!Array.isArray(list) || !list.every(isSnippet))
    throw new Error("Snippets must be a list of label and value pairs.");
  fs.writeFileSync(file + ".tmp", JSON.stringify(clean(list), null, 2));
  fs.renameSync(file + ".tmp", file);
}
