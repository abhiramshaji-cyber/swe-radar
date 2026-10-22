export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
    readonly retryAfter?: number,
  ) {
    super("HTTP " + status + " " + new URL(url).host);
  }
}

export class HostDown extends Error {
  constructor(readonly host: string) {
    super("host unreachable " + host);
  }
}

export class RateLimited extends Error {}

const NETWORK_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const codeOf = (e: unknown) =>
  (e as { cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;

export function transient(e: unknown) {
  if (!(e instanceof Error) || e instanceof HttpError) return false;
  if (e.name === "TimeoutError") return true;
  const code = codeOf(e);
  return code ? NETWORK_CODES.has(code) : /fetch failed/i.test(e.message);
}

const TLS_BLOCK = /CERT_ALTNAME|ALTNAME_INVALID/;

export function errorText(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  if (e.name === "TimeoutError" || e.name === "AbortError") return "timed out";
  const code = codeOf(e);
  const text = code ? code + ": " + e.message : e.message;
  if (TLS_BLOCK.test(text))
    return "TLS certificate mismatch, the network (router or filter) is intercepting this host";
  return text.length > 200 ? text.slice(0, 200) + "..." : text;
}

export function failKind(e: unknown): "rate" | "offline" | "down" {
  for (let c: unknown = e; c instanceof Error; c = c.cause) {
    if (c instanceof RateLimited || (c instanceof HttpError && c.status === 429)) return "rate";
    if (c instanceof HostDown || transient(c)) return "offline";
  }
  return "down";
}
