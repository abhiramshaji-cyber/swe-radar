import { ProxyAgent } from "undici";

const SCHEMES = new Set(["http:", "https:", "socks:", "socks5:"]);

let agents: ProxyAgent[] | null = null;
const cursors = new Map<string, number>();

function parse(list: string) {
  return list
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((url, i) => {
      if (!URL.canParse(url) || !SCHEMES.has(new URL(url).protocol))
        throw new Error("SWE_RADAR_PROXIES entry " + (i + 1) + " is not an http(s) or socks5 URL");
      return new ProxyAgent(url);
    });
}

export function nextProxy(host: string) {
  agents ??= parse(process.env.SWE_RADAR_PROXIES ?? "");
  if (!agents.length) return undefined;
  const i = cursors.get(host) ?? 0;
  cursors.set(host, i + 1);
  return agents[i % agents.length];
}
