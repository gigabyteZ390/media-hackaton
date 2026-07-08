import { NextResponse } from "next/server";
import { getAnthropic, joinText, extractJson } from "@/lib/anthropic";
import { buildFactPrompt } from "@/lib/prompts";
import type { SpokenLine, FactCheckResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Axis 2 — factuality: verify checkable factual claims via Claude + web search.
// (Authoritative-stats plugins — INSEE / KOSIS — can be wired in as tools later.)
export async function POST(req: Request) {
  try {
    const { lines } = (await req.json()) as { lines: SpokenLine[] };
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Body must be { lines: SpokenLine[] }" },
        { status: 400 }
      );
    }

    const client = getAnthropic();
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // Server-side web search tool: live search + cited sources.
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [{ role: "user", content: buildFactPrompt(lines) }],
      // Cast: recent tool type not in every SDK type def.
    } as any);

    // The model returns JSON as text after searching; parse defensively.
    const result = extractJson<FactCheckResult>(joinText(res));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/factcheck]", err);
    return NextResponse.json(
      { error: err?.message ?? "factcheck failed" },
      { status: 500 }
    );
  }
}
