import { NextResponse } from "next/server";
import { getAnthropic, joinText, extractJson, salvageObjects } from "@/lib/anthropic";
import { buildConsistencyPrompt, CONSISTENCY_SCHEMA } from "@/lib/prompts";
import statementsData from "@/data/statements.json";
import type { Statement, SpokenLine, ConsistencyResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const norm = (s: string) =>
  s.toLowerCase().replace(/["“”'’.,·!?]/g, "").replace(/\s+/g, " ").trim();

// Match the model's quoted past statement back to a DB record. Prefer substring
// containment (verbatim quote); otherwise fall back to best word-overlap.
function bestMatch(quote: string, past: Statement[]): Statement | undefined {
  const q = norm(quote);
  if (!q) return undefined;

  const contained = past.find((p) => {
    const t = norm(p.text);
    return t && (t.includes(q) || q.includes(t));
  });
  if (contained) return contained;

  const qWords = new Set(q.split(" ").filter((w) => w.length > 1));
  if (qWords.size === 0) return undefined;

  let best: Statement | undefined;
  let bestScore = 0;
  for (const p of past) {
    const tWords = new Set(norm(p.text).split(" ").filter((w) => w.length > 1));
    let overlap = 0;
    for (const w of qWords) if (tWords.has(w)) overlap++;
    const score = overlap / qWords.size;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 0.4 ? best : undefined;
}

// Inject only the past statements most RELEVANT to the lines being checked, instead
// of the person's entire history. Contradictions live on the same topic, so keyword
// overlap surfaces them — and this cuts prompt tokens (and latency) dramatically as
// the DB grows (e.g. Trump 173 -> ~35), which matters for both cost and local models.
function selectRelevant(
  lines: SpokenLine[],
  past: Statement[],
  maxTotal = 35
): Statement[] {
  if (past.length <= maxTotal) return past;
  const lineSets = lines.map(
    (l) => new Set(norm(l.text).split(" ").filter((w) => w.length > 2))
  );
  const scored = past.map((p) => {
    const tWords = new Set(norm(p.text).split(" ").filter((w) => w.length > 2));
    let best = 0;
    for (const lw of lineSets) {
      let overlap = 0;
      for (const w of lw) if (tWords.has(w)) overlap++;
      const score = lw.size ? overlap / lw.size : 0;
      if (score > best) best = score;
    }
    return { p, score: best };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxTotal).map((s) => s.p);
}

// Axis 1 — self-consistency: does each line contradict the person's OWN past words?
export async function POST(req: Request) {
  try {
    const { politician, lines, lang } = (await req.json()) as {
      politician: string;
      lines: SpokenLine[];
      lang?: "ko" | "en";
    };
    if (!politician || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Body must be { politician: string, lines: SpokenLine[] }" },
        { status: 400 }
      );
    }

    const allPast = (statementsData as Statement[]).filter(
      (s) => s.politician === politician
    );
    // Only the statements relevant to these lines go into the prompt.
    const past = selectRelevant(lines, allPast, 35);

    const client = getAnthropic();
    const prompt = buildConsistencyPrompt(politician, past, lines, lang ?? "en");

    // Try to get clean JSON; on a small model's runaway/truncation, retry (with a
    // temperature bump) and finally salvage whatever verdicts parsed.
    let result: ConsistencyResult | null = null;
    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      const res = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        temperature: attempt * 0.4, // ignored by Anthropic; varies local retries
        thinking: { type: "adaptive" },
        output_config: {
          format: { type: "json_schema", schema: CONSISTENCY_SCHEMA },
        },
        messages: [{ role: "user", content: prompt }],
      } as any);
      const text = joinText(res);
      try {
        result = extractJson<ConsistencyResult>(text);
      } catch {
        const verdicts = salvageObjects<ConsistencyResult["verdicts"][number]>(
          text,
          "verdicts"
        );
        if (verdicts.length) {
          const nonContra = verdicts.filter((v) => !v.isContradiction).length;
          result = {
            verdicts,
            consistencyScore: Math.round((nonContra / verdicts.length) * 100),
          };
        }
      }
    }
    if (!result) throw new Error("Could not parse consistency analysis JSON");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err?.message ?? "analyze failed" },
      { status: 500 }
    );
  }
}
