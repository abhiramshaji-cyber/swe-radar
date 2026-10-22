import { parse } from "node-html-parser";

export { HostDown, HttpError, RateLimited, errorText, failKind, transient } from "./errors";
export { limit, mapPool, sleep } from "./pool";
export { type Pace, getJson, getText, paced, rateLimits, resetHosts } from "./request";

export const htmlToText = (html: string | null | undefined) =>
  html
    ? parse(html)
        .structuredText.replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";
