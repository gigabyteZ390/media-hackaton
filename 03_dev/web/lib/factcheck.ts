// Axis 2 orchestration — factuality / fact-check.
//
// Design: the LLM does language understanding (extract structured claims); the
// CODE does the numeric verification (fetch the real official figure and compare).
// Comparing two numbers is deterministic work — no need to spend an LLM call on it.
//
//   lines ──▶ [LLM extraction] ──▶ StatClaim[]
//                 │
//                 ├─ statistical + registry match ─▶ INSEE/KOSIS fetch ─▶ compare() ─▶ TRUE/FALSE
//                 └─ everything else ──────────────▶ web-search fallback (LLM) ─▶ verdict + sources
//
// Anything we can't resolve deterministically degrades to web search, so the app
// still works (and the demo never breaks) even without stats API keys.
//
// `asOf` (the date the statement was spoken) is threaded through for time-anchoring:
// the verdict reflects the truth AT THAT TIME, not merely today's latest figure.

import { getOpenAI, MODEL, extractJson } from "./openai";
import { buildExtractionPrompt, buildFactPrompt } from "./prompts";
import { STAT_REGISTRY, findEntry, type RegistryEntry } from "./statRegistry";
import { inseeGetSeries } from "./insee";
import { kosisGetSeries } from "./kosis";
import type {
  SpokenLine,
  StatClaim,
  StatValue,
  FactVerdict,
  FactCheckResult,
} from "./types";

type Lang = "ko" | "en";

/** Step 1 — LLM extracts a structured claim per line (JSON mode, no web search). */
async function extractClaims(lines: SpokenLine[], lang: Lang): Promise<StatClaim[]> {
  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    seed: 7,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: buildExtractionPrompt(lines, lang) }],
  });
  const text = res.choices[0]?.message?.content ?? "";
  const parsed = extractJson<{ claims: StatClaim[] }>(text);
  return parsed.claims ?? [];
}

/** Fetch the official figure for a registry entry (dispatches to INSEE or KOSIS). */
async function resolveOfficial(
  entry: RegistryEntry,
  period?: string
): Promise<StatValue | null> {
  if (entry.provider === "INSEE" && entry.insee) {
    return inseeGetSeries(entry.insee.idbank, {
      period,
      unit: entry.unit,
      label: entry.label,
      sourceUrl: entry.sourceUrl,
    });
  }
  if (entry.provider === "KOSIS" && entry.kosis) {
    return kosisGetSeries({
      ...entry.kosis,
      period,
      unit: entry.unit,
      label: entry.label,
      sourceUrl: entry.sourceUrl,
    });
  }
  return null;
}

/** Step 3 — deterministic numeric comparison (replaces an LLM "are they equal?" call). */
function compare(
  claimed: number,
  official: number,
  unit: string
): { verdict: "TRUE" | "FALSE"; confidence: number } {
  const diff = Math.abs(claimed - official);
  const rel = official !== 0 ? diff / Math.abs(official) : diff;
  const isPercentagePoint = unit.includes("%");
  // Percentages: allow 0.3pt absolute OR 5% relative (people round in speech).
  // Counts / amounts: allow 2% relative.
  const ok = isPercentagePoint ? diff <= 0.3 || rel <= 0.05 : rel <= 0.02;
  const confidence = ok
    ? Math.min(1, Math.max(0.75, 1 - rel))
    : rel <= 0.1
    ? 0.6 // wrong but close — flag with lower confidence
    : 0.9;
  return { verdict: ok ? "TRUE" : "FALSE", confidence };
}

function statReason(
  lang: Lang,
  claimed: number,
  official: StatValue,
  entry: RegistryEntry
): string {
  const src = `${entry.label} · ${official.provider} ${official.period}`;
  return lang === "ko"
    ? `발언 값 ${claimed}${entry.unit} vs 공식 통계 ${official.value}${entry.unit} — ${src}.`
    : `Claimed ${claimed}${entry.unit} vs official ${official.value}${entry.unit} — ${src}.`;
}

/** Pull the REAL source links from the web-search response's url_citation
 *  annotations (the model itself is unreliable at copying URLs into the JSON). */
function extractCitations(res: any): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const item of res?.output ?? []) {
    for (const c of item?.content ?? []) {
      for (const a of c?.annotations ?? []) {
        const url: string | undefined = a?.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push({ title: a?.title || url, url });
      }
    }
  }
  return out;
}

/** Fallback — non-statistical or unresolved claims go to the LLM + web search. */
async function webSearchFallback(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactVerdict[]> {
  const client = getOpenAI();
  const res = await client.responses.create({
    model: MODEL,
    temperature: 0.4,
    tools: [{ type: "web_search" }],
    input: buildFactPrompt(lines, lang, undefined, asOf),
  } as any);
  const text = (res as any).output_text ?? "";
  const citations = extractCitations(res);
  let parsed: { facts?: FactVerdict[] } = {};
  try {
    parsed = extractJson<{ facts?: FactVerdict[] }>(text);
  } catch {
    parsed = {};
  }
  return (parsed.facts ?? []).map((f) => {
    // Keep only real http(s) URLs the model may have produced; otherwise use the
    // actual web-search citations so links are always genuine and clickable.
    const modelSources = (f.sources ?? []).filter((s) =>
      /^https?:\/\//.test(s?.url ?? "")
    );
    return {
      ...f,
      sources: modelSources.length ? modelSources : citations,
      method: "web-search" as const,
    };
  });
}

/** Public entry point used by /api/factcheck. */
export async function factCheck(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactCheckResult> {
  const claims = await extractClaims(lines, lang);

  const facts: FactVerdict[] = [];
  const fallback: SpokenLine[] = [];

  await Promise.all(
    claims.map(async (c) => {
      // Not a checkable fact (opinion / prediction) — record and skip verification.
      if (!c.isFactualClaim) {
        facts.push({
          line: c.line,
          isFactualClaim: false,
          verdict: "UNVERIFIABLE",
          reason:
            lang === "ko"
              ? "검증 대상이 아닌 의견/전망입니다."
              : "Opinion / prediction — not a checkable claim.",
          sources: [],
          confidence: 1,
          method: "none",
        });
        return;
      }

      // Deterministic path: a statistical claim we can map to an official series.
      const entry =
        (c.metricKey && STAT_REGISTRY.find((e) => e.key === c.metricKey)) ||
        (c.subject ? findEntry(c.subject, c.geo ?? undefined) : undefined);

      if (c.isStatistical && c.claimedValue != null && entry) {
        // Time-anchoring: judge as of the claim's own period, else the year the
        // statement was spoken (asOf), else the latest official figure.
        const effectivePeriod = c.period ?? (asOf ? asOf.slice(0, 4) : undefined);
        const official = await resolveOfficial(entry, effectivePeriod);
        if (official) {
          const { verdict, confidence } = compare(
            c.claimedValue,
            official.value,
            entry.unit
          );
          facts.push({
            line: c.line,
            isFactualClaim: true,
            verdict,
            referencePeriod: official.period,
            currentNote: "",
            reason: statReason(lang, c.claimedValue, official, entry),
            sources: [
              { title: `${entry.label} (${official.period})`, url: official.sourceUrl },
            ],
            confidence,
            method: "official-stats",
            claimedValue: c.claimedValue,
            officialValue: official.value,
            unit: entry.unit,
            period: official.period,
          });
          return;
        }
      }

      // Couldn't verify against official stats → hand to web search.
      fallback.push({ text: c.line });
    })
  );

  if (fallback.length > 0) {
    facts.push(...(await webSearchFallback(fallback, lang, asOf)));
  }

  // Accuracy = TRUE / checkable factual claims (computed in code, not by the model).
  const checked = facts.filter((f) => f.isFactualClaim);
  const trueCount = checked.filter((f) => f.verdict === "TRUE").length;
  const accuracyScore = checked.length
    ? Math.round((trueCount / checked.length) * 100)
    : 0;

  return { facts, accuracyScore };
}
