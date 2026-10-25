import type { Pay } from "../types";
import type { Rates } from "./rates";

export function convertedPay(pay: Pay | undefined, currency: string, rates?: Rates): Pay | null {
  if (!pay?.currency) return null;
  if (pay.currency === currency) return pay;
  const from = rates?.[pay.currency];
  const to = rates?.[currency];
  if (!from || !to) return null;
  return { min: pay.min * to / from, max: pay.max * to / from, currency };
}

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
