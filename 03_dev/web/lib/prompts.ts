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
  statsContext?: string,
  asOf?: string
): string {
  const when = asOf || "the present day";
  return [
    "You are a careful fact-checker. Rules:",
    "1) Check ONLY verifiable factual claims (numbers, statistics, historical facts).",
    '   Opinions / predictions / value judgments ("a tax hike is right") -> isFactualClaim=false, skip.',
    "2) Use web search to find trustworthy, authoritative sources (prefer official statistics offices).",
    "3) TIME ANCHORING (important for fairness):",
    `   - Judge each claim AS OF the moment it was spoken: ${when}.`,
    "   - Use the statistics that were current/available at THAT time, not merely today's latest.",
    '   - If the claim itself states a period (e.g. "as of 2023"), use that period instead.',
    '   - Put the exact basis you used in "referencePeriod" (e.g. "2023" or "Q1 2023").',
    "   - The main verdict reflects truth AT THAT TIME.",
    '   - If the LATEST data now differs from that verdict, briefly note the change in "currentNote"',
    '     (e.g. "Was highest in 2023, but fell to 3rd by 2025"). If nothing changed, leave "currentNote" as "".',
    "4) verdict is one of TRUE / FALSE / UNVERIFIABLE. Do not force true/false.",
    "5) Attach a reason and sources (title + url) to every verdict, and a confidence (0..1).",
    "6) accuracyScore = (number of TRUE verdicts / number of checked factual claims) * 100, rounded.",
    `7) Write the "reason", "referencePeriod" and "currentNote" fields in ${langName(
      lang
    )} (keep the verdict values as TRUE/FALSE/UNVERIFIABLE).`,
    statsContext
      ? `8) The following official KOSIS (Statistics Korea) tables were found for these claims. For Korean statistical claims, treat them as authoritative primary evidence and include their URLs in "sources":\n${statsContext}`
      : "",
    "",
    "Respond with ONLY a JSON object of this exact shape (no prose, no code fences):",
    '{ "facts": [ { "line": string, "isFactualClaim": boolean, "verdict": "TRUE"|"FALSE"|"UNVERIFIABLE", "referencePeriod": string, "currentNote": string, "reason": string, "sources": [{"title": string, "url": string}], "confidence": number } ], "accuracyScore": number }',
    "",
    "[Statements to verify]",
    JSON.stringify(lines.map((l) => l.text)),
  ].join("\n");
}
