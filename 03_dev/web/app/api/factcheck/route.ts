import { NextResponse } from "next/server";
import { getOpenAI, MODEL, extractJson } from "@/lib/openai";
import { buildFactPrompt } from "@/lib/prompts";
import { kosisContextFor } from "@/lib/kosis";
import type { SpokenLine, FactCheckResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Axis 2 — factuality: verify checkable factual claims via OpenAI + web search.
// (Authoritative-stats plugins — INSEE / KOSIS — can be wired in as tools later.)
export async function POST(req: Request) {
  try {
    const { lines, lang } = (await req.json()) as {
      lines: SpokenLine[];
      lang?: "ko" | "en";
    };
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Body must be { lines: SpokenLine[] }" },
        { status: 400 }
      );
    }

    // For Korean statistical claims, look up official KOSIS tables to ground the
    // fact-check in government data (no-op if KOSIS_KEY is unset or search fails).
    const statsContext =
      (lang ?? "en") === "ko"
        ? await kosisContextFor(lines.map((l) => l.text))
        : "";

    const client = getOpenAI();
    // Responses API + built-in web search tool: live search with citations.
    const res = await client.responses.create({
      model: MODEL,
      tools: [{ type: "web_search" }],
      input: buildFactPrompt(lines, lang ?? "en", statsContext || undefined),
    } as any);

    // The model returns JSON as text after searching; parse defensively.
    const text = (res as any).output_text ?? "";
    const result = extractJson<FactCheckResult>(text);

    // Compute accuracy deterministically: TRUE / (checkable factual claims).
    const checked = (result.facts ?? []).filter((f) => f.isFactualClaim);
    const trueCount = checked.filter((f) => f.verdict === "TRUE").length;
    result.accuracyScore = checked.length
      ? Math.round((trueCount / checked.length) * 100)
      : 0;

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/factcheck]", err);
    return NextResponse.json(
      { error: err?.message ?? "factcheck failed" },
      { status: 500 }
    );
  }
}
