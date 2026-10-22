import type { Settings } from "../settings";
import type { Pay, Row } from "../types";

const SPAN = 4;
const NEUTRAL = 50;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const payPoints = (pay: Pay, floor: number) =>
  clamp01(Math.log((pay.min + pay.max) / 2 / floor) / Math.log(SPAN)) * 100;

export function jobScore(
  companyScore: number | null | undefined,
  pay: Pay | null,
  payConfidence: number,
  s: Settings,
) {
  const scored = !!pay && s.payFloor > 0;
  const confidence = scored ? clamp01(payConfidence) : 0;
  const payScore = scored
    ? confidence * payPoints(pay, s.payFloor) + (1 - confidence) * NEUTRAL
    : NEUTRAL;
  return 0.5 * (companyScore ?? NEUTRAL) + 0.5 * payScore;
}

export const byScore = (a: Row, b: Row) =>
  b.score - a.score || b.effectiveAt - a.effectiveAt;
