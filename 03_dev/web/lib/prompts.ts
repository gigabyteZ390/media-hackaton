import type { Statement, SpokenLine } from "./types";
import { STAT_REGISTRY } from "./statRegistry";

type Lang = "ko" | "en";
const langName = (l: Lang) => (l === "ko" ? "Korean" : "English");

/** Axis 1 — self-consistency (compares a politician only against their own past words). */
export function buildConsistencyPrompt(
  politician: string,
  past: Statement[],
  lines: SpokenLine[],
  lang: Lang = "en"
): string {
  return [
    `You are a neutral analyzer that checks ONLY the self-consistency of political statements by ${politician}.`,
    "Rules:",
    "1) Compare ONLY against this person's own past statements below. Do not judge political side or truth.",
    "2) If context, timing, or premise differs, it is NOT a contradiction. Distinguish carefully.",
    "3) For a contradiction, give a reason and quote the specific past statement it conflicts with.",
    "4) Assign a confidence (0..1) to each verdict. Lower it when uncertain.",
    "5) consistencyScore = (number of non-contradicting lines / total lines) * 100, rounded.",
    `6) Write the "reason" field in ${langName(lang)}.`,
    "",
    "Respond with ONLY a JSON object of this exact shape (no prose, no code fences):",
    '{ "verdicts": [ { "line": string, "isContradiction": boolean, "pastStatement": string, "reason": string, "confidence": number } ], "consistencyScore": number }',
    "",
    "[Past statements]",
    JSON.stringify(past, null, 2),
    "",
    "[Spoken lines to check]",
    JSON.stringify(lines.map((l) => l.text)),
  ].join("\n");
}

/** Axis 2 — factuality (checkable factual claims only; uses web search for sources). */
export function buildFactPrompt(
  lines: SpokenLine[],
  lang: Lang = "en",
  statsContext?: string
): string {
  return [
    "You are a careful fact-checker. Rules:",
    "1) Check ONLY verifiable factual claims (numbers, statistics, historical facts).",
    '   Opinions / predictions / value judgments ("a tax hike is right") -> isFactualClaim=false, skip.',
    "2) Use web search to find trustworthy, authoritative sources (prefer official statistics offices).",
    "3) verdict is one of TRUE / FALSE / UNVERIFIABLE. Do not force true/false.",
    "4) Attach a reason and sources (title + url) to every verdict, and a confidence (0..1).",
    "5) accuracyScore = (number of TRUE verdicts / number of checked factual claims) * 100, rounded.",
    `6) Write the "reason" field in ${langName(lang)} (keep the verdict values as TRUE/FALSE/UNVERIFIABLE).`,
    statsContext
      ? `7) The following official KOSIS (Statistics Korea) tables were found for these claims. For Korean statistical claims, treat them as authoritative primary evidence and include their URLs in "sources":\n${statsContext}`
      : "",
    "",
    "Respond with ONLY a JSON object of this exact shape (no prose, no code fences):",
    '{ "facts": [ { "line": string, "isFactualClaim": boolean, "verdict": "TRUE"|"FALSE"|"UNVERIFIABLE", "reason": string, "sources": [{"title": string, "url": string}], "confidence": number } ], "accuracyScore": number }',
    "",
    "[Statements to verify]",
    JSON.stringify(lines.map((l) => l.text)),
  ].join("\n");
}

/**
 * Extraction pass — turn raw lines into structured claims so the *code* (not the
 * LLM) can do the numeric comparison against official stats. The LLM only does
 * what it is good at: understanding language and pulling out metric/value/period.
 */
export function buildExtractionPrompt(lines: SpokenLine[], lang: Lang = "en"): string {
  const registry = STAT_REGISTRY.map(
    (e) => `- ${e.key} — ${e.label} — aliases: ${e.aliases.join(", ")}`
  ).join("\n");
  return [
    "You extract checkable claims from political statements. Output ONE claim object per input line, in the same order.",
    "For each line set these fields:",
    "- line: the original text.",
    "- isFactualClaim: true if it contains a verifiable fact (number, statistic, historical fact); false for opinions/predictions/value judgements.",
    "- isStatistical: true ONLY if there is a concrete number an official statistics office could confirm (unemployment rate, inflation, population, etc.).",
    '- subject: a short ENGLISH description of the metric (e.g. "France unemployment rate").',
    '- claimedValue: the asserted number as a plain number ("5%" -> 5, "1.2 million" -> 1200000), or null.',
    '- unit: "%", "persons", "EUR", etc., or null.',
    '- geo: "FR", "KR", a region name, or null.',
    '- period: the time the claim refers to ("2025", "2025-Q1", "2025-09"), or null.',
    '- citedSource: a source the speaker explicitly names ("according to INSEE"), or null.',
    "- metricKey: EXACTLY one of the registry keys below if the metric clearly matches, otherwise null.",
    "",
    "[Registry keys]",
    registry,
    "",
    `Write the "subject" in English; keep all other values as-is. Input may be in ${langName(lang)}.`,
    "Respond with ONLY a JSON object of this exact shape (no prose, no code fences):",
    '{ "claims": [ { "line": string, "isFactualClaim": boolean, "isStatistical": boolean, "subject": string|null, "claimedValue": number|null, "unit": string|null, "geo": string|null, "period": string|null, "citedSource": string|null, "metricKey": string|null } ] }',
    "",
    "[Lines]",
    JSON.stringify(lines.map((l) => l.text)),
  ].join("\n");
}
