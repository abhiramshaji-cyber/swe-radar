import { HOUR, WINDOW_HOURS } from "../../core/time";

export type Hours = (typeof WINDOW_HOURS)[number];

const KEY = "radar.hours";

export const hoursLabel = (h: number) => (h < 48 ? h + "h" : h / 24 + "d");

export const hoursMs = (h: number) => h * HOUR;

export function loadHours(): Hours | null {
  try {
    const n = Number(localStorage.getItem(KEY));
    return WINDOW_HOURS.find((h) => h === n) ?? null;
  } catch {
    return null;
  }
}

export const asHours = (n: number): Hours => WINDOW_HOURS.find((h) => h === n) ?? 12;

export function saveHours(h: Hours) {
  try {
    localStorage.setItem(KEY, String(h));
  } catch {
    return;
  }
}
