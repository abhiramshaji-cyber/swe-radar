import type { Row } from "../../core/types";

const LEGAL =
  /\b(inc|ltd|llc|llp|corp|corporation|co|company|limited|plc|gmbh|technologies|technology|software|labs|group|holdings)\b\.?/g;

export function companyDomain(r: Row) {
  const name = r.company.toLowerCase().trim();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(name)) return name;
  const compact = name.replace(LEGAL, "").replace(/[^a-z0-9]/g, "");
  return compact ? compact + ".com" : null;
}

export const logoUrl = (domain: string) =>
  "https://www.google.com/s2/favicons?sz=64&domain=" + encodeURIComponent(domain);

export function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) % 360;
  return h;
}

export const initial = (name: string) =>
  (name.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
