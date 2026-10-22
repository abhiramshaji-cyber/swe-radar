import fs from "node:fs";

export function readProfile(file: string) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function saveProfile(file: string, text: unknown) {
  if (typeof text !== "string") throw new Error("Profile must be text.");
  fs.writeFileSync(file + ".tmp", text);
  fs.renameSync(file + ".tmp", file);
}
