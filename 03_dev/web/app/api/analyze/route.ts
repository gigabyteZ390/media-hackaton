import { NextResponse } from "next/server";
import { getAnthropic, joinText, extractJson } from "@/lib/anthropic";
import { buildConsistencyPrompt, CONSISTENCY_SCHEMA } from "@/lib/prompts";
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

    const client = getAnthropic();
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // Structured output: constrain the response to our JSON schema.
      output_config: { format: { type: "json_schema", schema: CONSISTENCY_SCHEMA } },
      messages: [
        { role: "user", content: buildConsistencyPrompt(politician, past, lines) },
      ],
      // Cast: output_config is newer than some SDK type defs.
    } as any);

    const result = extractJson<ConsistencyResult>(joinText(res));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err?.message ?? "analyze failed" },
      { status: 500 }
    );
  }
}
