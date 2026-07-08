import { NextResponse } from "next/server";
import { getOpenAI, MODEL, extractJson } from "@/lib/openai";
import { buildConsistencyPrompt } from "@/lib/prompts";
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

    const past = (statementsData as Statement[]).filter(
      (s) => s.politician === politician
    );

    const client = getOpenAI();
    const res = await client.chat.completions.create({
      model: MODEL,
      // Low-ish temperature: mostly stable, with a little room for nuance.
      // seed keeps runs fairly reproducible despite temperature > 0.
      temperature: 0.4,
      seed: 7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildConsistencyPrompt(politician, past, lines, lang ?? "en"),
        },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const result = extractJson<ConsistencyResult>(text);

    // Compute the score deterministically in code (don't trust the model's number).
    const verdicts = result.verdicts ?? [];
    const consistent = verdicts.filter((v) => !v.isContradiction).length;
    result.consistencyScore = verdicts.length
      ? Math.round((consistent / verdicts.length) * 100)
      : 0;

    // Enrich each contradiction: match the model's quoted past statement back to
    // the DB record so the UI can show the real date + a working source link.
    for (const v of verdicts) {
      if (!v.isContradiction || !v.pastStatement) continue;
      const match = bestMatch(v.pastStatement, past);
      if (match) {
        v.pastDate = match.date;
        v.pastSourceUrl = match.sourceUrl;
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err?.message ?? "analyze failed" },
      { status: 500 }
    );
  }
}
