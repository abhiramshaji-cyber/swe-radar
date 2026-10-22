import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";

const keyFile = () => path.join(app.getPath("userData"), "typesafe-key.bin");

export const hasKey = () => fs.existsSync(keyFile());

export function saveKey(key: unknown) {
  if (typeof key !== "string" || !key.trim()) throw new Error("Enter a TypeSafe API key.");
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("Secure storage is unavailable, so the key was not saved.");
  fs.writeFileSync(keyFile(), safeStorage.encryptString(key.trim()), { mode: 0o600 });
}

export const clearKey = () => fs.rmSync(keyFile(), { force: true });

export function readKey() {
  if (hasKey())
    try {
      return safeStorage.decryptString(fs.readFileSync(keyFile()));
    } catch {
      throw new Error("The saved TypeSafe API key could not be decrypted, replace it in Settings.");
    }
  return process.env.TYPESAFE_API_KEY?.trim() || undefined;
}
