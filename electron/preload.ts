import { contextBridge, ipcRenderer } from "electron";
import type { DocKind } from "../core/docs/make";
import type { Plan } from "./background/schedule";
import type { LinkedInState } from "./linkedin/queue";
import type { Settings } from "../core/settings";
import type { Snippet } from "../core/snippets";
import type { Classifying, Posting, Rated, RefreshResult, Row, SourceStatus, Tier } from "../core/types";

export type ScanEvent =
  | { phase: "start"; id: number; scan: boolean }
  | { phase: "end"; id: number; result?: RefreshResult | null; error?: string };

function subscribe<T>(channel: string, fn: (payload: T) => void) {
  const listener = (_e: unknown, payload: T) => fn(payload);
  ipcRenderer.on(channel, listener);
  return () => void ipcRenderer.off(channel, listener);
}

const api = {
  last: (): Promise<RefreshResult | null> => ipcRenderer.invoke("last"),
  refresh: (resume: boolean): Promise<RefreshResult> => ipcRenderer.invoke("refresh", resume),
  plan: (): Promise<Plan> => ipcRenderer.invoke("plan"),
  onPlan: (fn: (p: Plan) => void) => subscribe("plan", fn),
  onScan: (fn: (e: ScanEvent) => void) => subscribe("scan", fn),
  pause: (): Promise<void> => ipcRenderer.invoke("pause"),
  reset: (): Promise<void> => ipcRenderer.invoke("reset"),
  rescore: (): Promise<RefreshResult | null> => ipcRenderer.invoke("rescore"),
  hasKey: (): Promise<boolean> => ipcRenderer.invoke("key:has"),
  setKey: (key: string): Promise<void> => ipcRenderer.invoke("key:set", key),
  clearKey: (): Promise<void> => ipcRenderer.invoke("key:clear"),
  spent: (): Promise<number> => ipcRenderer.invoke("spent"),
  resetSpent: (): Promise<void> => ipcRenderer.invoke("spent:reset"),
  applied: (): Promise<string[]> => ipcRenderer.invoke("applied"),
  setApplied: (key: string, on: boolean): Promise<void> => ipcRenderer.invoke("applied:set", key, on),
  ask: (job: Posting, question: string): Promise<{ answer: string }> =>
    ipcRenderer.invoke("ask", job, question),
  makeDoc: (job: Posting, kind: DocKind): Promise<string> => ipcRenderer.invoke("doc", job, kind),
  refetch: (job: Posting): Promise<string> => ipcRenderer.invoke("describe", job),
  copyLetter: (job: Posting): Promise<void> => ipcRenderer.invoke("letter:copy", job),
  openFile: (file: string): Promise<void> => ipcRenderer.invoke("file:open", file),
  showFile: (file: string): Promise<void> => ipcRenderer.invoke("file:show", file),
  profile: (): Promise<string> => ipcRenderer.invoke("profile"),
  setProfile: (text: string): Promise<void> => ipcRenderer.invoke("profile:set", text),
  settings: (): Promise<Settings> => ipcRenderer.invoke("settings"),
  setSettings: (s: Settings): Promise<Settings> => ipcRenderer.invoke("settings:set", s),
  onSettings: (fn: (s: Settings) => void) => subscribe("settings", fn),
  snippets: (): Promise<Snippet[]> => ipcRenderer.invoke("snippets"),
  setSnippets: (list: Snippet[]): Promise<void> => ipcRenderer.invoke("snippets:set", list),
  open: (url: string): Promise<void> => ipcRenderer.invoke("open", url),
  onStatus: (fn: (s: SourceStatus) => void) => subscribe("status", fn),
  onRows: (fn: (rows: Row[]) => void) => subscribe("rows", fn),
  ratings: (): Promise<Record<string, Rated>> => ipcRenderer.invoke("ratings"),
  onRatings: (fn: (r: Record<string, Rated>) => void) => subscribe("ratings", fn),
  onClassifying: (fn: (c: Classifying) => void) => subscribe("classifying", fn),
  logs: (): Promise<string[]> => ipcRenderer.invoke("logs"),
  onLog: (fn: (l: { n: number; line: string }) => void) => subscribe("log", fn),
  copy: (text: string): Promise<void> => ipcRenderer.invoke("copy", text),
  onTiers: (fn: (t: Tier[]) => void) => subscribe("tiers", fn),
  linkedIn: (): Promise<LinkedInState> => ipcRenderer.invoke("linkedin"),
  connectLinkedIn: (): Promise<LinkedInState> => ipcRenderer.invoke("linkedin:connect"),
  disconnectLinkedIn: (): Promise<LinkedInState> => ipcRenderer.invoke("linkedin:disconnect"),
  onLinkedIn: (fn: (s: LinkedInState) => void) => subscribe("linkedin", fn),
};

export type RadarApi = typeof api;

contextBridge.exposeInMainWorld("radar", api);
