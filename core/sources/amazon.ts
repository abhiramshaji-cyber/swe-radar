import { getJson, htmlToText } from "../http";
import { sourceDayOk } from "../time";
import { relisted } from "../repost";
import type { Ctx, Posting } from "../types";

const COUNTRIES = `
AD AND|AE ARE|AF AFG|AG ATG|AI AIA|AL ALB|AM ARM|AO AGO|AQ ATA|AR ARG|AS ASM|AT AUT|AU AUS|AW ABW|AX ALA|AZ AZE
BA BIH|BB BRB|BD BGD|BE BEL|BF BFA|BG BGR|BH BHR|BI BDI|BJ BEN|BL BLM|BM BMU|BN BRN|BO BOL|BQ BES|BR BRA|BS BHS|BT BTN|BV BVT|BW BWA|BY BLR|BZ BLZ
CA CAN|CC CCK|CD COD|CF CAF|CG COG|CH CHE|CI CIV|CK COK|CL CHL|CM CMR|CN CHN|CO COL|CR CRC|CU CUB|CV CPV|CW CUW|CX CXR|CY CYP|CZ CZE|DE DEU|DJ DJI|DK DNK|DM DMA|DO DOM|DZ DZA
EC ECU|EE EST|EG EGY|EH ESH|ER ERI|ES ESP|ET ETH|FI FIN|FJ FJI|FK FLK|FM FSM|FO FRO|FR FRA|GA GAB|GB GBR|GD GRD|GE GEO|GF GUF|GG GGY|GH GHA|GI GIB|GL GRL|GM GMB|GN GIN|GP GLP|GQ GNQ|GR GRC|GS SGS|GT GTM|GU GUM|GW GNB|GY GUY
HK HKG|HM HMD|HN HND|HR HRV|HT HTI|HU HUN|ID IDN|IE IRL|IL ISR|IM IMN|IN IND|IO IOT|IQ IRQ|IR IRN|IS ISL|IT ITA|JE JEY|JM JAM|JO JOR|JP JPN|KE KEN|KG KGZ|KH KHM|KI KIR|KM COM|KN KNA|KP PRK|KR KOR|KW KWT|KY CYM|KZ KAZ
LA LAO|LB LBN|LC LCA|LI LIE|LK LKA|LR LBR|LS LSO|LT LTU|LU LUX|LV LVA|LY LBY|MA MAR|MC MCO|MD MDA|ME MNE|MF MAF|MG MDG|MH MHL|MK MKD|ML MLI|MM MMR|MN MNG|MO MAC|MP MNP|MQ MTQ|MR MRT|MS MSR|MT MLT|MU MUS|MV MDV|MW MWI|MX MEX|MY MYS|MZ MOZ
NA NAM|NC NCL|NE NER|NF NFK|NG NGA|NI NIC|NL NLD|NO NOR|NP NPL|NR NRU|NU NIU|NZ NZL|OM OMN|PA PAN|PE PER|PF PYF|PG PNG|PH PHL|PK PAK|PL POL|PM SPM|PN PCN|PR PRI|PS PSE|PT PRT|PW PLW|PY PRY|QA QAT|RE REU|RO ROU|RS SRB|RU RUS|RW RWA|SA SAU|SB SLB|SC SYC|SD SDN|SE SWE|SG SGP|SH SHN|SI SVN|SJ SJM|SK SVK|SL SLE|SM SMR|SN SEN|SO SOM|SR SUR|SS SSD|ST STP|SV SLV|SX SXM|SY SYR|SZ SWZ
TC TCA|TD TCD|TF ATF|TG TGO|TH THA|TJ TJK|TK TKL|TL TLS|TM TKM|TN TUN|TO TON|TR TUR|TT TTO|TV TUV|TW TWN|TZ TZA|UA UKR|UG UGA|UM UMI|US USA|UY URY|UZ UZB|VA VAT|VC VCT|VE VEN|VG VGB|VI VIR|VN VNM|VU VUT|WF WLF|WS WSM|YE YEM|YT MYT|ZA ZAF|ZM ZMB|ZW ZWE
`.trim().split(/[|\s]+/).reduce<string[]>((pairs, token, index, all) => {
  if (index % 2 === 0) pairs.push(token + " " + all[index + 1]);
  return pairs;
}, []);

const ALPHA2 = new Map<string, string>();
const ALPHA3 = new Map<string, string>();
const NAMES = new Map<string, string>();
const displayName = new Intl.DisplayNames(["en"], { type: "region" });
for (const pair of COUNTRIES) {
  const [alpha2, alpha3] = pair.trim().split(" ");
  ALPHA2.set(alpha2.toLowerCase(), alpha3);
  ALPHA3.set(alpha3.toLowerCase(), alpha3);
  NAMES.set(displayName.of(alpha2)!.toLowerCase().replace(/[^a-z]/g, ""), alpha3);
}
const ALIASES: Record<string, string> = {
  uk: "GBR", unitedkingdom: "GBR", us: "USA", unitedstates: "USA",
  uae: "ARE", unitedarabemirates: "ARE", southkorea: "KOR",
  republicofkorea: "KOR", korea: "KOR", czechia: "CZE",
  czechrepublic: "CZE", hongkong: "HKG",
};

const countryCode = (value: string) => {
  const key = value.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (key.length === 2) return ALPHA2.get(key) ?? ALIASES[key] ?? NAMES.get(key);
  if (key.length === 3) return ALPHA3.get(key) ?? ALIASES[key];
  return ALIASES[key] ?? NAMES.get(key);
};

export const amazonSearchUrl = (country: string, limit: number, offset: number) => {
  const code = countryCode(country);
  return "https://www.amazon.jobs/en/search.json?base_query=software%20engineer&sort=recent" +
    (code ? "&normalized_country_code%5B%5D=" + code : "") +
    "&result_limit=" + limit + "&offset=" + offset;
};
const PAGE = 100;
const MAX_PAGES = 10;

export const parseAmazon = (d: any): Posting[] =>
  (Array.isArray(d?.jobs) ? d.jobs : []).flatMap((x: any) => {
    const postedAt = new Date(x?.posted_date ?? "").getTime();
    if (!x?.id_icims || !x.title || Number.isNaN(postedAt)) return [];
    return [
      {
        key: "amazon:" + x.id_icims,
        source: "amazon" as const,
        title: String(x.title),
        company: x.company_name || "Amazon",
        location: x.normalized_location || x.location || "",
        url:
          "https://www.amazon.jobs" + (x.job_path ?? "/en/jobs/" + x.id_icims),
        postedAt,
        precision: "day" as const,
        description: [
          htmlToText(x.description),
          "Basic qualifications:\n" + htmlToText(x.basic_qualifications),
          "Preferred qualifications:\n" +
            htmlToText(x.preferred_qualifications),
        ].join("\n\n"),
      },
    ];
  });

export async function fetchAmazon(ctx: Ctx): Promise<Posting[]> {
  const all: Posting[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await getJson(amazonSearchUrl(ctx.settings.workCountry, PAGE, page * PAGE));
    all.push(...parseAmazon(d));
    const jobs = Array.isArray(d?.jobs) ? d.jobs.length : 0;
    if (jobs < PAGE || (page + 1) * PAGE >= (d?.hits ?? 0)) break;
  }
  return relisted(all).filter((p) => sourceDayOk(p.postedAt, ctx));
}
