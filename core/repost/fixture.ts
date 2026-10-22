import { HOUR } from "../time";
import type { Posting } from "../types";

export const NOW = Date.UTC(2026, 9, 16, 12);

export const job = (key: string, o: Partial<Posting> = {}): Posting => ({
  key,
  source: (key.split(":")[0] as Posting["source"]) ?? "linkedin",
  title: "Software Engineer",
  company: "Acme",
  location: "Ogdenville, Ohio, United States",
  url: "https://x/" + key,
  postedAt: NOW - HOUR,
  precision: "exact",
  description: "",
  ...o,
});
