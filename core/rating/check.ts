import type { Rating } from "../types";

const GLASSDOOR = /(^|\.)glassdoor\.[a-z]{2,3}(\.[a-z]{2})?$/;
const EMPLOYER = /(?:-E|_IE)(\d+)(?=[._])/;

function employerOf(url: unknown) {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const id = u.pathname.match(EMPLOYER)?.[1];
    return u.protocol === "https:" && GLASSDOOR.test(u.hostname) && id ? "E" + id : null;
  } catch {
    return null;
  }
}

function judge(x: any, at: number): Rating {
  const employer = employerOf(x.glassdoorUrl);
  const ok =
    typeof x.rating === "number" &&
    x.rating >= 1 &&
    x.rating <= 5 &&
    Number.isInteger(x.reviews) &&
    x.reviews > 0 &&
    employer;
  return ok
    ? { rating: Math.round(x.rating * 10) / 10, reviews: x.reviews, url: x.glassdoorUrl, employer, at }
    : { miss: true, at };
}

export function checkRatings(raw: unknown, ids: string[], at: number): Record<string, Rating> {
  const results: any[] = Array.isArray((raw as any)?.results) ? (raw as any).results : [];
  return Object.fromEntries(
    ids.map((id) => {
      const x = results.find((r) => r?.id === id);
      return [id, x ? judge(x, at) : { miss: true, at, failed: true }];
    }),
  );
}

export const failedAll = (ids: string[], at: number): Record<string, Rating> =>
  Object.fromEntries(ids.map((id) => [id, { miss: true, at, failed: true }]));
