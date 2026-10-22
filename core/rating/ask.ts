import { askJson } from "../ask/ai";
import type { Rating } from "../types";
import { checkRatings, failedAll } from "./check";
import type { Company } from "./queue";

const TIMEOUT = 90_000;

export const INSTRUCTIONS = `You look up Glassdoor employer ratings. For each company in the list, search the web for its Glassdoor employer page.
Several employers often share a similar name. Use the LinkedIn company page and the job locations given to confirm it is the same employer. If you cannot tell which employer it is, or you find no Glassdoor page, return null for rating, reviews and glassdoorUrl. Never guess.
Read the rating from Glassdoor's own snippet, which reads like "X has an employee rating of N out of 5 stars, based on M company reviews". Return rating as N, reviews as M (a whole number) and glassdoorUrl as the employer's glassdoor URL that contains its E<number> employer ID.
Return exactly one result per company, with the same id you were given.`;

const nullable = (type: string) => ({ type: [type, "null"] });

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "company", "rating", "reviews", "glassdoorUrl"],
        properties: {
          id: { type: "string" },
          company: nullable("string"),
          rating: nullable("number"),
          reviews: nullable("integer"),
          glassdoorUrl: nullable("string"),
        },
      },
    },
  },
};

export const ratingPrompt = (cs: Company[]) => "Companies:\n" + JSON.stringify(cs, null, 1);

export type Ask = (instructions: string, prompt: string, schema: object) => Promise<unknown>;

const search: Ask = (i, p, s) => askJson(i, p, s, { search: true, timeout: TIMEOUT });

export async function lookupRatings(cs: Company[], now: number, ask: Ask = search): Promise<Record<string, Rating>> {
  const ids = cs.map((c) => c.id);
  try {
    return checkRatings(await ask(INSTRUCTIONS, ratingPrompt(cs), SCHEMA), ids, now);
  } catch {
    return failedAll(ids, now);
  }
}
