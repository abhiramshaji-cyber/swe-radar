import { hasDescription } from "../docs/description";
import type { Row } from "../types";
import { byScore } from "./score";

export const AUTO_DESCRIBE = 20;

const standing = (r: Row) => (r.kept === null ? 1 : r.kept ? 2 : 0);

export const promising = (rows: Row[], n = AUTO_DESCRIBE) =>
  rows
    .filter((r) => r.kept !== false && !hasDescription(r.description))
    .toSorted((a, b) => standing(b) - standing(a) || byScore(a, b) || a.key.localeCompare(b.key))
    .slice(0, Math.max(0, n));
