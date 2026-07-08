// KOSIS (Statistics Korea) integrated-search client.
// Given a keyword, finds matching official statistical tables so the fact-check
// can ground Korean statistical claims in government data.
// Docs: https://kosis.kr/openapi/statisticsSearch.do (통합검색, param: searchNm)

const KOSIS_SEARCH = "https://kosis.kr/openapi/statisticsSearch.do";

export interface KosisRef {
  orgName: string;   // organization (e.g. 통계청)
  tableName: string; // statistical table name
  orgId: string;
  tblId: string;
  url: string;       // KOSIS table view URL
}

/** Search KOSIS for official statistical tables matching `query`. Returns [] on any error. */
export async function kosisSearch(query: string, resultCount = 3): Promise<KosisRef[]> {
  const key = process.env.KOSIS_KEY;
  if (!key || !query.trim()) return [];

  const params = new URLSearchParams({
    method: "getList",
    apiKey: key,
    searchNm: query,
    format: "json",
    jsonVD: "Y",
    sort: "RANK",
    startCount: "1",
    resultCount: String(resultCount),
  });

  try {
    const res = await fetch(`${KOSIS_SEARCH}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await res.json();
    // On error KOSIS returns an object ({ err, errMsg }), not an array.
    if (!Array.isArray(data)) return [];
    return data
      .map((d: any) => {
        const orgId = d.ORG_ID ?? d.orgId ?? "";
        const tblId = d.TBL_ID ?? d.tblId ?? "";
        return {
          orgName: d.ORG_NM ?? d.orgNm ?? "",
          tableName: d.TBL_NM ?? d.tblNm ?? d.STAT_NM ?? "",
          orgId,
          tblId,
          url:
            d.LINK_URL ??
            (orgId && tblId
              ? `https://kosis.kr/statHtml/statHtml.do?orgId=${orgId}&tblId=${tblId}`
              : "https://kosis.kr"),
        } as KosisRef;
      })
      .filter((r: KosisRef) => r.tableName);
  } catch {
    return [];
  }
}

/** Build KOSIS references for the lines that look like statistical claims (contain a number). */
export async function kosisContextFor(lines: string[], maxLines = 4): Promise<string> {
  const numeric = lines.filter((l) => /\d/.test(l)).slice(0, maxLines);
  if (numeric.length === 0) return "";
  const results = await Promise.all(numeric.map((l) => kosisSearch(l, 2)));
  const seen = new Set<string>();
  const refs: KosisRef[] = [];
  for (const group of results) {
    for (const r of group) {
      const kkey = r.tblId || r.tableName;
      if (seen.has(kkey)) continue;
      seen.add(kkey);
      refs.push(r);
    }
  }
  if (refs.length === 0) return "";
  return refs
    .map((r) => `- ${r.tableName} (${r.orgName || "KOSIS"}) — ${r.url}`)
    .join("\n");
}
