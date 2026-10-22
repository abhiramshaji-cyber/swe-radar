import { errorText, getJson, htmlToText, rateLimits } from "../http";
import type { Settings } from "../settings";
import type { Ctx, Log, Posting } from "../types";

const HOST = "https://apply.careers.microsoft.com";

const searchUrl = (place: string) =>
  HOST +
  "/api/pcsx/search?domain=microsoft.com&query=software%20engineer&location=" +
  encodeURIComponent(place) +
  "&sort_by=timestamp";

export const microsoftDescription = (p: Posting) =>
  getJson(HOST + "/api/pcsx/position_details?domain=microsoft.com&hl=en&position_id=" + p.key.split(":")[1]).then(
    (d: any) => htmlToText(d?.data?.jobDescription),
  );

export const parseMicrosoft = (d: any): Posting[] =>
  (Array.isArray(d?.data?.positions) ? d.data.positions : []).flatMap(
    (x: any) => {
      if (!x?.id || !x.name || typeof x.postedTs !== "number") return [];
      const places = Array.isArray(x.locations) ? x.locations.join("; ") : "";
      return [
        {
          key: "microsoft:" + x.id,
          source: "microsoft" as const,
          title: String(x.name),
          company: "Microsoft",
          location:
            places +
            (x.workLocationOption ? " (" + x.workLocationOption + ")" : ""),
          url: x.positionUrl
            ? new URL(x.positionUrl, HOST).href
            : HOST + "/careers/job/" + x.id,
          postedAt: x.postedTs * 1000,
          precision: "exact" as const,
          description: x.department ? "Department: " + x.department : "",
        },
      ];
    },
  );

export const placesOf = (s: Settings) => [...new Set([...s.regions.map((r) => r.linkedinLocation), s.workCountry].filter((x) => !!x))] as string[];

export async function fetchMicrosoft(ctx: Ctx, log: Log): Promise<Posting[]> {
  const places = placesOf(ctx.settings);
  const found = new Map<string, Posting>();
  const errors: { text: string; e: unknown }[] = [];
  for (const place of places)
    try {
      const recent = parseMicrosoft(await getJson(searchUrl(place))).filter(
        (p) => p.postedAt >= ctx.cutoff && !found.has(p.key),
      );
      for (const p of recent) found.set(p.key, p);
      log.found(recent);
    } catch (e) {
      errors.push({ text: place + ": " + errorText(e), e });
    }
  if (rateLimits(new URL(HOST).host)) log.label("Rate limited · retried");
  if (errors.length && errors.length === places.length)
    throw new Error("search failed: " + errors[0].text, { cause: errors[0].e });
  if (errors.length) log.partial();
  if (errors.length) log.warn(errors.length + " place searches failed, e.g. " + errors[0].text);
  return [...found.values()].map(ctx.known);
}
