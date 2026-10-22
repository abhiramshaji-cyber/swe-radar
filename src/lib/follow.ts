import type { RefreshResult } from "../../core/types";

type Follow = {
  begin: (scan: boolean) => number;
  finish: (ui: number, scan: boolean, result: RefreshResult | null, error?: string) => void;
  next: (at: number) => void;
};

export function followScans({ begin, finish, next }: Follow) {
  let newest = 0;
  let tracked = { id: 0, ui: 0, scan: false };
  let live = true;
  const follow = (id: number, scan: boolean) => {
    if (!live || id <= newest) return;
    newest = id;
    tracked = { id, ui: begin(scan), scan };
  };
  window.radar.plan().then(
    (p) => {
      next(p.next);
      if (p.run) follow(p.run.id, p.run.scan);
    },
    () => next(Infinity),
  );
  const offs = [
    window.radar.onPlan((p) => next(p.next)),
    window.radar.onScan((e) => {
      if (e.phase === "start") return follow(e.id, e.scan);
      newest = Math.max(newest, e.id);
      if (e.id === tracked.id) finish(tracked.ui, tracked.scan, e.result ?? null, e.error);
    }),
  ];
  return () => {
    live = false;
    offs.forEach((off) => off());
  };
}
