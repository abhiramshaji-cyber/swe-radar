import { createHash } from "node:crypto";
import fs from "node:fs";
import { type Settings, cleanSettings } from "./index";

export function readSettings(file: string): Settings {
  try {
    return cleanSettings(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return cleanSettings({});
  }
}

export function saveSettings(file: string, value: unknown): Settings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Settings must be an object.");
  const s = cleanSettings(value);
  fs.writeFileSync(file + ".tmp", JSON.stringify(s, null, 2));
  fs.renameSync(file + ".tmp", file);
  return s;
}

export const schemaOf = (s: Settings) =>
  "s-" +
  createHash("sha256")
    .update(
      JSON.stringify([
        s.regions.map((r) => [r.id, r.description]),
        s.workCountry,
        s.excludeCountryOnly ?? "",
        s.requiredLanguagesToExclude,
        s.currency,
        s.payFloor,
        s.roleScope,
      ]),
    )
    .digest("hex")
    .slice(0, 12);
