import { expect, test } from "bun:test";
import type { Posting } from "../types";
import { dueCompanies } from "./queue";

const job = (company: string, extra: Partial<Posting> = {}): Posting => ({
  key: "k:" + Math.random(),
  source: "greenhouse",
  title: "Engineer",
  company,
  location: "Springfield, IL",
  url: "https://x.test/job",
  postedAt: 0,
  precision: "exact",
  description: "",
  ...extra,
});

test("one entry per company in priority order, context merged across jobs", () => {
  const due = dueCompanies(
    [
      job("Cohere Inc."),
      job("Shopify"),
      job("Cohere", { location: "Ogdenville, OH", companyUrl: "https://www.linkedin.com/company/cohere-ai" }),
    ],
    {},
  );
  expect(due.map((c) => c.id)).toEqual(["cohere", "shopify"]);
  expect(due[0]).toEqual({
    id: "cohere",
    name: "Cohere Inc.",
    linkedin: "https://www.linkedin.com/company/cohere-ai",
    locations: ["Springfield, IL", "Ogdenville, OH"],
  });
});

test("skips companies that already have an entry and blank names", () => {
  const due = dueCompanies([job("Cohere"), job(""), job("Shopify")], { cohere: { miss: true, at: 1 } });
  expect(due.map((c) => c.id)).toEqual(["shopify"]);
});
