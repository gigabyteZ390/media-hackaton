import { NextResponse } from "next/server";
import { getOpenAI, MODEL, extractJson } from "@/lib/openai";
import { buildConsistencyPrompt } from "@/lib/prompts";
import statementsData from "@/data/statements.json";
import type { Statement, SpokenLine, ConsistencyResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err?.message ?? "analyze failed" },
      { status: 500 }
    );
  }
}
