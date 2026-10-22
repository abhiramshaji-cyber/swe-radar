import type { Pay } from "../types";

export type Per = "hour" | "day" | "week" | "month" | "year";

const PER_YEAR: Record<Per, number> = {
  hour: 2080,
  day: 260,
  week: 52,
  month: 12,
  year: 1,
};

export function annualPay(
  min: unknown,
  max: unknown,
  currency: unknown,
  per: Per | undefined,
): Pay | undefined {
  const code = String(currency ?? "")
    .trim()
    .toUpperCase();
  const lo = Number(min) || Number(max);
  const hi = Number(max) || lo;
  if (!/^[A-Z]{3}$/.test(code) || !per || !(lo > 0)) return undefined;
  const year = (n: number) => Math.round(n * PER_YEAR[per]);
  return {
    min: year(Math.min(lo, hi)),
    max: year(Math.max(lo, hi)),
    currency: code,
  };
}
