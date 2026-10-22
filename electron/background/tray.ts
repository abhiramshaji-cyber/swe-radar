import { Menu, type MenuItemConstructorOptions, Tray, nativeImage } from "electron";
import type { Plan } from "./schedule";

export type TrayActions = {
  open: () => void;
  fetch: () => void;
  pause: () => void;
  quit: () => void;
};

let tray: Tray | null = null;

const POINTS = 18;
const SCALE = 2;

const ink = (distance: number, width: number) =>
  Math.min(1, Math.max(0, width / 2 + 0.5 - Math.abs(distance)));

const toSegment = (x: number, y: number, ex: number, ey: number) => {
  const t = Math.min(1, Math.max(0, (x * ex + y * ey) / (ex * ex + ey * ey)));
  return Math.hypot(x - t * ex, y - t * ey);
};

export function radarPixels(size: number) {
  const unit = size / POINTS;
  const center = size / 2;
  const sweep = (6.5 * unit) / Math.SQRT2;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const r = Math.hypot(dx, dy);
      const alpha = Math.max(
        ink(r - 7.5 * unit, 1.5 * unit),
        ink(r - 4 * unit, 1.2 * unit),
        ink(r, 3 * unit),
        ink(toSegment(dx, dy, sweep, -sweep), 1.5 * unit),
      );
      pixels[(y * size + x) * 4 + 3] = Math.round(alpha * 255);
    }
  return pixels;
}

export function trayIcon() {
  const size = POINTS * SCALE;
  const image = nativeImage.createFromBitmap(radarPixels(size), {
    width: size,
    height: size,
    scaleFactor: SCALE,
  });
  image.setTemplateImage(true);
  return image;
}

export function when(at: number, now: number) {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return date.toDateString() === new Date(now).toDateString()
    ? time
    : date.toLocaleDateString([], { weekday: "short" }) + " " + time;
}

export function nextLabel(plan: Plan, now: number) {
  if (plan.paused) return "Next fetch paused";
  if (plan.run) return "Fetching now";
  if (!Number.isFinite(plan.next)) return "Next fetch after Resume";
  return "Next fetch " + (plan.next <= now ? "soon" : when(plan.next, now));
}

export const trayMenu = (
  plan: Plan,
  act: TrayActions,
  now: number,
): MenuItemConstructorOptions[] => [
  { label: "Open SWE Radar", click: act.open },
  {
    label: plan.run ? "Fetching…" : "Fetch now",
    enabled: !plan.run,
    click: act.fetch,
  },
  { type: "separator" },
  {
    label: "Last fetch " + (plan.last ? when(plan.last, now) : "never"),
    enabled: false,
  },
  { label: nextLabel(plan, now), enabled: false },
  { type: "separator" },
  {
    label: "Pause schedule",
    type: "checkbox",
    checked: plan.paused,
    click: act.pause,
  },
  { type: "separator" },
  { label: "Quit SWE Radar", click: act.quit },
];

export function showTray(act: TrayActions) {
  tray ??= new Tray(trayIcon());
  tray.setToolTip("SWE Radar");
  return (plan: Plan) =>
    tray?.setContextMenu(
      Menu.buildFromTemplate(trayMenu(plan, act, Date.now())),
    );
}
