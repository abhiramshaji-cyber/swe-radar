import { greenhouseDescription } from "../sources/greenhouse";
import { linkedInDescription } from "../sources/linkedin";
import { microsoftDescription } from "../sources/microsoft";
import { smartRecruitersDescription } from "../sources/smartrecruiters";
import type { Posting, Source } from "../types";

const DETAIL: Partial<Record<Source, (p: Posting) => Promise<string>>> = {
  linkedin: linkedInDescription,
  greenhouse: greenhouseDescription,
  smartrecruiters: smartRecruitersDescription,
  microsoft: microsoftDescription,
};

export const canFetch = (p: Posting) => !!DETAIL[p.source];

export async function fetchDescription(p: Posting) {
  const get = DETAIL[p.source];
  if (!get) throw new Error("This board has no description to fetch.");
  return (await get(p)) ?? "";
}

export async function describe(p: Posting) {
  const fetched = await fetchDescription(p).catch(() => "");
  return fetched && fetched.length > p.description.length ? fetched : p.description;
}
