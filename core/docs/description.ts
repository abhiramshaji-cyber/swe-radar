export const MIN_DESCRIPTION = 200;

export const NO_DESCRIPTION = "No job description yet. Fetch it first.";

export const realText = (d: string | undefined) => (d ?? "").replace(/\s+/g, " ").trim();

export const hasDescription = (d: string | undefined) => realText(d).length >= MIN_DESCRIPTION;

export const longest = (...ds: (string | undefined)[]) =>
  ds.reduce<string>((a, d) => (realText(d).length > realText(a).length ? (d ?? "") : a), "");

export function requireDescription(d: string) {
  if (!hasDescription(d)) throw Object.assign(new Error(NO_DESCRIPTION), { code: "no-description" as const });
  return d;
}
