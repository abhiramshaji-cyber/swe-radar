import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as nap } from "node:timers/promises";
import { fetch as fetchVia } from "undici";
import { HostDown, HttpError, transient } from "./errors";
import { nextProxy } from "./proxy";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MIN_GAP = 300;
const MAX_GAP = 8000;
const BACKOFF = 1000;
const MAX_WAIT = 30_000;
const RETRIES = 3;
const TRIP = 3;
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

type Host = { ok: boolean; fails: number; gap: number; next: number; limited: number };

export type Pace = { gap?: number; jitter?: [number, number]; limited: () => void };

const hosts = new Map<string, Host>();
export const paced = new AsyncLocalStorage<Pace>();
let stop: AbortSignal | undefined;

export function resetHosts(signal?: AbortSignal) {
  hosts.clear();
  stop = signal;
}

const floor = () => paced.getStore()?.gap ?? MIN_GAP;
const jitter = ([min, max] = [0, 0]) => min + Math.random() * (max - min);
export const rateLimits = (host: string) => hosts.get(host)?.limited ?? 0;

function hostState(host: string) {
  let h = hosts.get(host);
  if (!h) hosts.set(host, (h = { ok: false, fails: 0, gap: floor(), next: 0, limited: 0 }));
  return h;
}

function retryAfterMs(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  const ms = Number.isNaN(seconds) ? Date.parse(value) - Date.now() : seconds * 1000;
  return Number.isFinite(ms) ? Math.max(0, ms) : undefined;
}

async function turn(h: Host) {
  const at = Math.max(Date.now(), h.next);
  h.next = at + h.gap + jitter(paced.getStore()?.jitter);
  await nap(at - Date.now(), undefined, { signal: stop });
}

async function attempt(url: string, host: string, timeout: number) {
  const dispatcher = nextProxy(host);
  const init = { headers: { "user-agent": UA, accept: "*/*" }, signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(stop ? [stop] : [])]) };
  const r = dispatcher ? await fetchVia(url, { ...init, dispatcher }) : await fetch(url, init);
  if (!r.ok) throw new HttpError(r.status, url, retryAfterMs(r.headers.get("retry-after")));
  return r.text();
}

const backoff = (i: number, retryAfter?: number) =>
  retryAfter ?? BACKOFF * 2 ** i * (0.5 + Math.random());

export async function getText(url: string, timeout = 20000) {
  const host = new URL(url).host;
  const h = hostState(host);
  if (!h.ok && h.fails >= TRIP) throw new HostDown(host);
  for (let i = 0; ; i++) {
    await turn(h);
    try {
      const text = await attempt(url, host, timeout);
      h.ok = true;
      h.gap = Math.max(floor(), h.gap * 0.8);
      return text;
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 0;
      if (status) h.ok = true;
      if (status === 429) {
        h.limited++;
        paced.getStore()?.limited();
        h.gap = Math.min(MAX_GAP, h.gap * 2);
      }
      if (stop?.aborted || (!RETRY_STATUS.has(status) && !transient(e))) throw e;
      const wait = backoff(i, e instanceof HttpError ? e.retryAfter : undefined);
      if (i >= RETRIES || wait > MAX_WAIT) {
        if (!status) h.fails++;
        throw e;
      }
      await nap(wait, undefined, { signal: stop });
    }
  }
}

export async function getJson(url: string, timeout = 20000): Promise<any> {
  const body = await getText(url, timeout);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("malformed JSON from " + new URL(url).host);
  }
}
