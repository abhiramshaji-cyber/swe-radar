import { useSyncExternalStore } from "react";
import type { DocKind } from "../../core/docs/make";
import { hasDescription } from "../../core/docs/description";
import type { Row } from "../../core/types";
import { failure } from "../lib/format";

export type Toast = { id: number; text: string; sub?: string; file?: string };
export type Status = "busy" | "done" | "failed";
type State = { status: Record<string, Status>; toasts: Toast[]; described: Record<string, string> };

const DONE_MS = 2600;
const COPIED_MS = 1500;
const TOAST_MS = 9000;
const ERROR_MS = 6000;
const MAX_TOASTS = 4;
const NOUN: Record<DocKind, string> = { resume: "Resume", letter: "Cover letter" };

let state: State = { status: {}, toasts: [], described: {} };
let ids = 0;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useDocs = () => useSyncExternalStore(subscribe, () => state);

export const docId = (r: Row, kind: DocKind) => r.key + "\n" + kind;

function mark(id: string, status?: Status) {
  const { [id]: _, ...rest } = state.status;
  set({ status: status ? { ...rest, [id]: status } : rest });
}

export const dismiss = (id: number) => set({ toasts: state.toasts.filter((t) => t.id !== id) });

export function toast(t: Omit<Toast, "id">) {
  const id = ++ids;
  const same = (x: Toast) => x.text === t.text && x.sub === t.sub && x.file === t.file;
  set({ toasts: [...state.toasts.filter((x) => !same(x)), { ...t, id }].slice(-MAX_TOASTS) });
  setTimeout(() => dismiss(id), t.file ? TOAST_MS : ERROR_MS);
}

async function track(id: string, work: () => Promise<void>, doneMs: number) {
  if (state.status[id] === "busy") return;
  mark(id, "busy");
  try {
    await work();
    mark(id, "done");
    setTimeout(() => state.status[id] === "done" && mark(id), doneMs);
  } catch (e) {
    mark(id);
    toast({ text: failure(e) });
  }
}

export const withDescription = (r: Row): Row => {
  const d = state.described[r.key];
  return d && d.length > r.description.length ? { ...r, description: d } : r;
};

export const makeDoc = (r: Row, kind: DocKind) =>
  track(
    docId(r, kind),
    async () => {
      const file = await window.radar.makeDoc(withDescription(r), kind);
      toast({ text: NOUN[kind] + " ready", sub: r.company, file });
    },
    DONE_MS,
  );

export const copyId = (r: Row) => r.key + "\ncopy";

export const copyLetter = (r: Row) => track(copyId(r), () => window.radar.copyLetter(withDescription(r)), COPIED_MS);

export const refetchId = (r: Row) => r.key + "\nrefetch";

export const needsDescription = (r: Row) =>
  !hasDescription(state.described[r.key]) && !hasDescription(r.description);

export async function refetch(r: Row) {
  const id = refetchId(r);
  if (state.status[id] === "busy") return;
  mark(id, "busy");
  try {
    const d = await window.radar.refetch(r);
    set({ described: { ...state.described, [r.key]: d } });
    mark(id);
  } catch {
    mark(id, "failed");
  }
}
