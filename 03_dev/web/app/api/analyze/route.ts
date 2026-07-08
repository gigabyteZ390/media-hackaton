import { NextResponse } from "next/server";
import { getOpenAI, MODEL, extractJson } from "@/lib/openai";
import { buildConsistencyPrompt } from "@/lib/prompts";
import statementsData from "@/data/statements.sample.json";
import type { Statement, SpokenLine, ConsistencyResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Axis 1 — self-consistency: does each line contradict the person's OWN past words?
export async function POST(req: Request) {
  try {
    const { politician, lines } = (await req.json()) as {
      politician: string;
      lines: SpokenLine[];
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
        { role: "user", content: buildConsistencyPrompt(politician, past, lines) },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const result = extractJson<ConsistencyResult>(text);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err?.message ?? "analyze failed" },
      { status: 500 }
    );
  }
}
