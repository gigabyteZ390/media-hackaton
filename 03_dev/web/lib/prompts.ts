import type { Statement, SpokenLine } from "./types";

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
