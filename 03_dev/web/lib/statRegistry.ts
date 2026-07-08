// Curated registry of well-known official metrics -> their series identifiers.
//
// This is the bridge between a natural-language claim ("unemployment is 5%") and
// a *specific* official series we can fetch a real number from. The LLM extracts
// which metric a line is about (metricKey / subject); this table says where the
// authoritative figure lives (INSEE idbank for France, KOSIS org/table for Korea).
//
// ⚠️ HACKATHON NOTE: the identifiers below are examples. Verify each one against
// the live source with a valid API key before the demo:
//   - INSEE idbank: find the series on https://www.insee.fr (BDM) → its idbank.
//   - KOSIS orgId/tblId/itmId/objL1: open the table on https://kosis.kr and read
//     its OpenAPI sample query. Unknown/removed keys just fall back to web search.

export type StatProvider = "INSEE" | "KOSIS";

export interface RegistryEntry {
  key: string; // stable key the LLM maps to (e.g. "fr.unemployment_rate")
  label: string; // human label shown in the UI / sources
  provider: StatProvider;
  geo: string; // "FR" | "KR"
  unit: string; // canonical unit ("%", "persons", ...)
  aliases: string[]; // multilingual keywords to help matching
  sourceUrl: string; // public page for the figure (shown as the source link)
  insee?: { idbank: string };
  kosis?: {
    orgId: string;
    tblId: string;
    itmId?: string;
    objL1?: string;
    prdSe?: string;
  };
}

export const STAT_REGISTRY: RegistryEntry[] = [
  {
    key: "fr.unemployment_rate",
    label: "France — taux de chômage (BIT)",
    provider: "INSEE",
    geo: "FR",
    unit: "%",
    aliases: ["chômage", "taux de chômage", "unemployment", "unemployment rate"],
    sourceUrl: "https://www.insee.fr/fr/statistiques/2012804",
    insee: { idbank: "001688527" }, // TODO verify idbank on insee.fr (BDM)
  },
  // NOTE: inflation & population entries were removed after live INSEE checks —
  // idbank 001763852 is a discontinued *index* (not a % rate) and 000067692 is
  // invalid. To add a metric: find its series on insee.fr, copy the idbank, verify
  // it returns the expected unit (curl the keyless BDM endpoint), then add an entry.
  {
    key: "kr.unemployment_rate",
    label: "대한민국 — 실업률 (통계청)",
    provider: "KOSIS",
    geo: "KR",
    unit: "%",
    aliases: ["실업률", "unemployment", "unemployment rate"],
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1DA7004S",
    kosis: { orgId: "101", tblId: "DT_1DA7004S", itmId: "T20", objL1: "0", prdSe: "M" }, // TODO verify
  },
  {
    key: "kr.total_fertility_rate",
    label: "대한민국 — 합계출산율 (통계청)",
    provider: "KOSIS",
    geo: "KR",
    unit: "명",
    aliases: ["합계출산율", "출산율", "fertility rate", "birth rate"],
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B81A21",
    kosis: { orgId: "101", tblId: "DT_1B81A21", itmId: "T10", objL1: "00", prdSe: "Y" }, // TODO verify
  },
];

const byKey = new Map(STAT_REGISTRY.map((e) => [e.key, e]));

/** Look up an entry by exact key, or by a fuzzy alias/label match on free text. */
export function findEntry(keyOrText: string, geo?: string): RegistryEntry | undefined {
  if (!keyOrText) return undefined;
  const exact = byKey.get(keyOrText);
  if (exact) return exact;

  const t = keyOrText.toLowerCase();
  const match = (list: RegistryEntry[]) =>
    list.find(
      (e) =>
        e.label.toLowerCase().includes(t) ||
        e.aliases.some(
          (a) => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t)
        )
    );

  // Prefer entries from the claim's country to avoid FR/KR ambiguity.
  const scoped = geo ? STAT_REGISTRY.filter((e) => e.geo === geo) : STAT_REGISTRY;
  return match(scoped) ?? (geo ? match(STAT_REGISTRY) : undefined);
}
