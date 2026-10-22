import { expect, test } from "bun:test";
import { checkRatings, failedAll } from "./check";

const AT = 1_000;
const URL_ = "https://www.glassdoor.com/Reviews/Cohere-Reviews-E3256435.htm";
const ok = { id: "cohere", company: "Cohere", rating: 4.14, reviews: 212, glassdoorUrl: URL_ };
const one = (x: object) => checkRatings({ results: [{ ...ok, ...x }] }, ["cohere"], AT).cohere;

test("a clean answer keeps rating, reviews, url and the employer id", () => {
  expect(one({})).toEqual({ rating: 4.1, reviews: 212, url: URL_, employer: "E3256435", at: AT });
});

test("overview urls with EI_IE ids are accepted", () => {
  const url = "https://www.glassdoor.com/Overview/Working-at-Cohere-EI_IE3256435.11,17.htm";
  expect(one({ glassdoorUrl: url })).toMatchObject({ employer: "E3256435", url });
});

test("null from the model is a confident miss", () => {
  expect(one({ rating: null, reviews: null, glassdoorUrl: null })).toEqual({ miss: true, at: AT });
});

test.each([
  ["rating below 1", { rating: 0.5 }],
  ["rating above 5", { rating: 5.2 }],
  ["rating as text", { rating: "4.1" }],
  ["fractional reviews", { reviews: 12.5 }],
  ["zero reviews", { reviews: 0 }],
  ["non glassdoor host", { glassdoorUrl: "https://www.indeed.com/cmp/Cohere-E3256435.htm" }],
  ["lookalike host", { glassdoorUrl: "https://glassdoor.com.evil.com/Reviews/Cohere-Reviews-E3256435.htm" }],
  ["no employer id", { glassdoorUrl: "https://www.glassdoor.com/Reviews/cohere-reviews-SRCH_KE0,6.htm" }],
  ["plain http", { glassdoorUrl: "http://www.glassdoor.com/Reviews/Cohere-Reviews-E3256435.htm" }],
  ["not a url", { glassdoorUrl: "glassdoor Cohere" }],
])("drops %s", (_, x) => {
  expect(one(x)).toEqual({ miss: true, at: AT });
});

test("a company missing from the answer counts as failed, unknown ids are ignored", () => {
  const r = checkRatings({ results: [{ ...ok, id: "someone-else" }] }, ["cohere"], AT);
  expect(r).toEqual({ cohere: { miss: true, at: AT, failed: true } });
});

test.each([[null], ["nonsense"], [[]], [{ results: "x" }], [{ results: [null, 3] }]])("unparseable output %p fails every company", (raw) => {
  expect(checkRatings(raw, ["a", "b"], AT)).toEqual(failedAll(["a", "b"], AT));
});
