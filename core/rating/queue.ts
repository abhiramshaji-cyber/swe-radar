import { companyKey } from "../dedupe";
import type { Posting, Rating } from "../types";

export type Company = { id: string; name: string; linkedin?: string; locations: string[] };

const PLACES = 3;

export function dueCompanies(byPriority: Posting[], ratings: Record<string, Rating>): Company[] {
  const due = new Map<string, Company>();
  for (const p of byPriority) {
    const id = companyKey(p);
    if (!id || id in ratings) continue;
    const c = due.get(id) ?? { id, name: p.company.trim(), locations: [] };
    c.linkedin ??= p.companyUrl;
    if (p.location && !c.locations.includes(p.location) && c.locations.length < PLACES) c.locations.push(p.location);
    due.set(id, c);
  }
  return [...due.values()];
}
