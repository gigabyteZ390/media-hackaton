// INSEE (France) — Banque de Données Macroéconomiques (BDM) series client.
//
// The BDM "Séries chronologiques" API is KEYLESS (open access, no auth) and returns
// SDMX-ML (XML). Given a series idbank, we fetch the latest official value.
//
// Verified working (keyless): GET https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/{idbank}
//   e.g. idbank 001688527 = "Taux de chômage au sens du BIT - Ensemble - France
//   hors Mayotte" → latest 8.1 (2026-Q1).
//
// Returns null on any error (caller falls back to web search).

import type { StatValue } from "./types";

const INSEE_BASE = process.env.INSEE_BASE ?? "https://api.insee.fr/series/BDM/V1";

// BDM is keyless. We still send a bearer token if one is configured, in case a
// future/private INSEE API needs it — harmless on the open BDM endpoint.
function authHeaders(): Record<string, string> {
  const token = process.env.INSEE_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Parse the most recent observation from an INSEE SDMX-ML payload. */
function parseLatestXml(xml: string): { value: number; period: string } | null {
  // Structure-specific data: observations are <Obs TIME_PERIOD="..." OBS_VALUE="..."/>.
  const obsTags = xml.match(/<[A-Za-z0-9:]*Obs\b[^>]*>/g) ?? [];
  let latest: { value: number; period: string } | null = null;
  for (const tag of obsTags) {
    const v = tag.match(/OBS_VALUE="([^"]*)"/);
    if (!v) continue;
    const value = parseFloat(v[1]);
    if (Number.isNaN(value)) continue;
    const p = tag.match(/TIME_PERIOD="([^"]*)"/);
    // SDMX orders observations ascending by period → the last one is the latest.
    latest = { value, period: p?.[1] ?? "" };
  }
  return latest;
}

export async function inseeGetSeries(
  idbank: string,
  opts?: { period?: string; unit?: string; label?: string; sourceUrl?: string }
): Promise<StatValue | null> {
  if (!idbank) return null;

  const query = opts?.period
    ? `?startPeriod=${encodeURIComponent(opts.period)}&endPeriod=${encodeURIComponent(
        opts.period
      )}`
    : "?lastNObservations=1";
  const url = `${INSEE_BASE}/data/SERIES_BDM/${encodeURIComponent(idbank)}${query}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/xml", ...authHeaders() },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const obs = parseLatestXml(xml);
    if (!obs) return null;
    return {
      provider: "INSEE",
      value: obs.value,
      period: obs.period,
      unit: opts?.unit,
      sourceUrl:
        opts?.sourceUrl ?? `https://www.insee.fr/fr/statistiques/serie/${idbank}`,
      label: opts?.label,
    };
  } catch {
    return null;
  }
}
