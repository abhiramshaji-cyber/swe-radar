import type { Posting } from "./types";

const SOURCES = new Set(["himalayas"]);
const HOSTS = ["himalayas.app"];

const onHost = (host = "") => HOSTS.some((h) => host === h || host.endsWith("." + h));

export const blockedSource = (source: string) => SOURCES.has(source);

export const blocked = (p: Posting) => blockedSource(p.source) || onHost(URL.parse(p.url)?.hostname);
