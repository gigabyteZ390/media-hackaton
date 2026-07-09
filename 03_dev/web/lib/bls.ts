// BLS (U.S. Bureau of Labor Statistics) — public API client, KEYLESS.
//
// The public v2 API works without registration (limited daily quota; set BLS_KEY
// for a higher free quota). Given a series id (e.g. LNS14000000 = U.S. unemployment
// rate, seasonally adjusted, monthly), we fetch a year and return a representative
// annual figure so a claim like "unemployment is 3.5%" can be compared.
//
// Returns null on any error (caller falls back to web search).

import type { StatValue } from "./types";

const BLS_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data";

export async function blsGetSeries(
  seriesId: string,
  opts?: { period?: string; unit?: string; label?: string; sourceUrl?: string }
): Promise<StatValue | null> {
  if (!seriesId) return null;
  // Period may be "2019" / "2019-05" / "2019-05-13". Use the year, and the month
  // when present (present-tense claims → that specific month, not the annual avg).
  const now = new Date().getUTCFullYear();
  const year = (opts?.period?.match(/\d{4}/)?.[0] as string) || String(now - 1);
  const monthMatch = opts?.period?.match(/^\d{4}-(\d{2})/);
  const wantMonth = monthMatch ? `M${monthMatch[1]}` : null;

  const url = `${BLS_BASE}/${encodeURIComponent(seriesId)}?startyear=${year}&endyear=${year}${
    process.env.BLS_KEY ? `&registrationkey=${process.env.BLS_KEY}` : ""
  }`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const series = data?.Results?.series?.[0]?.data;
    if (!Array.isArray(series) || series.length === 0) return null;

    // If the claim named a month, use that month; else the annual average ("M13");
    // else average the monthly values.
    const monthObs = wantMonth
      ? series.find((d: any) => d.period === wantMonth)
      : null;
    const annual = series.find((d: any) => d.period === "M13");
    let value: number;
    let periodOut = year;
    if (monthObs) {
      value = parseFloat(monthObs.value);
      periodOut = `${year}-${monthMatch![1]}`;
    } else if (annual) {
      value = parseFloat(annual.value);
    } else {
      const nums = series
        .map((d: any) => parseFloat(d.value))
        .filter((n: number) => !Number.isNaN(n));
      if (!nums.length) return null;
      value = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
      value = Math.round(value * 10) / 10;
    }
    if (Number.isNaN(value)) return null;

    return {
      provider: "BLS",
      value,
      period: periodOut,
      unit: opts?.unit,
      sourceUrl:
        opts?.sourceUrl ??
        `https://data.bls.gov/timeseries/${encodeURIComponent(seriesId)}`,
      label: opts?.label,
    };
  } catch {
    return null;
  }
}
