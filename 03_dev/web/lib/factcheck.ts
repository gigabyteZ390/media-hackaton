// Axis 2 orchestration — factuality / fact-check (Claude / Anthropic).
//
// Design: the LLM does language understanding (extract structured claims); the
// CODE does the numeric verification (fetch the real official figure and compare).
// Comparing two numbers is deterministic work — no need to spend an LLM call on it.
//
//   lines ──▶ [verdict cache] ──▶ [LLM extraction] ──▶ StatClaim[]
//                 │                     │
//                 │                     ├─ statistical + registry ─▶ INSEE/KOSIS ─▶ compare() ─▶ TRUE/FALSE
//                 │                     └─ everything else ────────▶ web-search fallback ─▶ verdict + sources
//                 └─ (hit) ─▶ reuse the stored verdict, skip all LLM/API calls
//
// Two MongoDB caches (best-effort, no-op if Mongo is down) spare the LLM/web/KOSIS
// quotas: `statCache` (official figures) and `factCache` (per-line verdicts).
// `asOf` (the date the statement was spoken) is threaded through for time-anchoring.
//
// Note (Claude Opus 4.8): sampling params (temperature/top_p) are rejected — do not
// send them. We use adaptive thinking + the web_search server tool.

import {
  getAnthropic,
  joinText,
  extractJson,
  salvageObjects,
  isLocalLLM,
} from "./anthropic";
import { webSearch } from "./websearch";
import { buildExtractionPrompt, buildFactPrompt } from "./prompts";
import { STAT_REGISTRY, findEntry, type RegistryEntry } from "./statRegistry";
import { inseeGetSeries } from "./insee";
import { kosisGetSeries } from "./kosis";
import { blsGetSeries } from "./bls";
import { cacheGet, cacheSet } from "./mongo";
import type {
  SpokenLine,
  StatClaim,
  StatValue,
  FactVerdict,
  FactCheckResult,
} from "./types";

type Lang = "ko" | "en";

const MODEL = "claude-sonnet-5";
const VERDICT_TTL = 60 * 60 * 24; // 24h — verdicts are stable within a demo
const STAT_TTL = 60 * 60 * 24; // 24h — official figures update at most monthly

const norm = (s: string) =>
  s.toLowerCase().replace(/["'”“’·.,!?;:]/g, "").replace(/\s+/g, " ").trim();

const verdictKey = (line: string, lang: Lang, asOf?: string) =>
  `v1:${lang}:${asOf ?? "now"}:${norm(line)}`;

/** Step 1 — LLM extracts a structured claim per line (no web search). */
async function extractClaims(lines: SpokenLine[], lang: Lang): Promise<StatClaim[]> {
  const client = getAnthropic();
  const prompt = buildExtractionPrompt(lines, lang);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      temperature: attempt * 0.4, // ignored by Anthropic; varies local retries
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    } as any);
    const text = joinText(res);
    try {
      return extractJson<{ claims: StatClaim[] }>(text).claims ?? [];
    } catch {
      const claims = salvageObjects<StatClaim>(text, "claims");
      if (claims.length) return claims;
    }
  }
  // Never block Axis 2 on a parse failure — treat as "nothing checkable".
  return lines.map((l) => ({ line: l.text, isFactualClaim: false, isStatistical: false }));
}

/** Fetch the official figure for a registry entry (cached; dispatches to INSEE/KOSIS). */
async function resolveOfficial(
  entry: RegistryEntry,
  period?: string,
  blsPeriod?: string // month-aware period for BLS (present-tense claims use the month)
): Promise<StatValue | null> {
  const key = `${entry.key}:${period ?? "latest"}`;
  const cached = await cacheGet<StatValue>("statCache", key);
  if (cached) return cached;

  let value: StatValue | null = null;
  if (entry.provider === "INSEE" && entry.insee) {
    value = await inseeGetSeries(entry.insee.idbank, {
      period,
      unit: entry.unit,
      label: entry.label,
      sourceUrl: entry.sourceUrl,
    });
  } else if (entry.provider === "KOSIS" && entry.kosis) {
    value = await kosisGetSeries({
      ...entry.kosis,
      period,
      unit: entry.unit,
      label: entry.label,
      sourceUrl: entry.sourceUrl,
    });
  } else if (entry.provider === "BLS" && entry.bls) {
    value = await blsGetSeries(entry.bls.seriesId, {
      period: blsPeriod ?? period,
      unit: entry.unit,
      label: entry.label,
      sourceUrl: entry.sourceUrl,
    });
  }

  if (value) await cacheSet("statCache", key, value, STAT_TTL);
  return value;
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

/** Pull the REAL source links from Claude's web_search_tool_result blocks. */
function extractCitations(res: any): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const block of res?.content ?? []) {
    if (block?.type !== "web_search_tool_result") continue;
    const results = block?.content;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const url: string | undefined = r?.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ title: r?.title || url, url });
    }
  }
  return out;
}

/** Local-mode web fallback: WE search the web (DuckDuckGo, in code) and feed the
 *  snippets to the local model, which judges from that evidence only. The local
 *  model has no live-search tool, so the internet access lives in code. */
async function webSearchFallbackLocal(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactVerdict[]> {
  const evidences = await Promise.all(
    lines.map(async (l) => ({ line: l.text, hits: await webSearch(l.text, 4) }))
  );
  const evidenceBlock = evidences
    .map((e) =>
      e.hits.length
        ? `• LINE: ${e.line}\n${e.hits
            .map((h) => `   - ${h.title} — ${h.url}\n     ${h.snippet}`)
            .join("\n")}`
        : `• LINE: ${e.line}\n   (no search results)`
    )
    .join("\n\n");

  const prompt =
    buildFactPrompt(lines, lang, undefined, asOf) +
    "\n\n[WEB SEARCH EVIDENCE — you have NO live web access; judge ONLY from these " +
    "snippets. If they do not clearly confirm or refute a claim, use verdict " +
    "UNVERIFIABLE. Put the real URLs you relied on into sources.]\n" +
    evidenceBlock;

  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  } as any);

  const text = joinText(res);
  let facts: FactVerdict[] = [];
  try {
    facts = extractJson<{ facts?: FactVerdict[] }>(text).facts ?? [];
  } catch {
    facts = salvageObjects<FactVerdict>(text, "facts");
  }
  const allHits = evidences.flatMap((e) => e.hits);
  return facts.map((f) => {
    const modelSources = (f.sources ?? []).filter((s) =>
      /^https?:\/\//.test(s?.url ?? "")
    );
    return {
      ...f,
      sources: modelSources.length
        ? modelSources
        : allHits.slice(0, 3).map((h) => ({ title: h.title, url: h.url })),
      method: "web-search" as const,
    };
  });
}

/** Fallback — non-statistical or unresolved claims go to the LLM + web search. */
async function webSearchFallback(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactVerdict[]> {
  if (isLocalLLM()) return webSearchFallbackLocal(lines, lang, asOf);
  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    // Server-side web search tool: live search + cited sources.
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [
      { role: "user", content: buildFactPrompt(lines, lang, undefined, asOf) },
    ],
  } as any);

  const citations = extractCitations(res);
  let parsed: { facts?: FactVerdict[] } = {};
  try {
    parsed = extractJson<{ facts?: FactVerdict[] }>(joinText(res));
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

/** The full extract -> verify -> fallback pipeline for lines not served from cache. */
async function runPipeline(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactVerdict[]> {
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
        // BLS: if the claim states its own period use that, else the full spoken date
        // (so a present-tense "unemployment is 3.5%" checks that month, not a
        // COVID-distorted annual average).
        const official = await resolveOfficial(entry, effectivePeriod, c.period ?? asOf);
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

  return facts;
}

/** Public entry point used by /api/factcheck. Serves per-line verdicts from the
 *  cache when possible, runs the pipeline only for the misses, then caches them. */
export async function factCheck(
  lines: SpokenLine[],
  lang: Lang,
  asOf?: string
): Promise<FactCheckResult> {
  // 1. Look up each line's verdict in the cache.
  const cached = await Promise.all(
    lines.map((l) => cacheGet<FactVerdict>("factCache", verdictKey(l.text, lang, asOf)))
  );
  const misses = lines.filter((_, i) => !cached[i]);

  // 2. Run the pipeline only for cache misses, then store the fresh verdicts.
  let fresh: FactVerdict[] = [];
  if (misses.length > 0) {
    fresh = await runPipeline(misses, lang, asOf);
    await Promise.all(
      fresh.map((f) =>
        cacheSet("factCache", verdictKey(f.line, lang, asOf), f, VERDICT_TTL)
      )
    );
  }
  const freshByLine = new Map(fresh.map((f) => [norm(f.line), f] as const));

  // 3. Reassemble verdicts in the original line order (cache hits + fresh).
  const facts: FactVerdict[] = lines
    .map((l, i) => cached[i] ?? freshByLine.get(norm(l.text)))
    .filter((f): f is FactVerdict => Boolean(f));

  // Accuracy is scored ONLY over claims verified against OFFICIAL STATISTICS
  // (deterministic number comparison vs BLS / INSEE / KOSIS). Web-checked and
  // opinion lines still get per-line verdicts, but they don't drag the headline %
  // down just because we couldn't find hard evidence. statChecked lets the UI show
  // "no statistical claim" instead of a misleading 0%.
  const checked = facts.filter((f) => f.method === "official-stats");
  const trueCount = checked.filter((f) => f.verdict === "TRUE").length;
  const accuracyScore = checked.length
    ? Math.round((trueCount / checked.length) * 100)
    : 0;

  return { facts, accuracyScore, statChecked: checked.length };
}
