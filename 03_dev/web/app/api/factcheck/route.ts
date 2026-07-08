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
<<<<<<< HEAD
    const { lines } = (await req.json()) as { lines: SpokenLine[] };
=======
    const { lines, lang, asOf } = (await req.json()) as {
      lines: SpokenLine[];
      lang?: "ko" | "en";
      asOf?: string; // date the statement was made (YYYY-MM-DD); the truth basis
    };
>>>>>>> main
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Body must be { lines: SpokenLine[] }" },
        { status: 400 }
      );
    }

<<<<<<< HEAD
    const client = getAnthropic();
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // Server-side web search tool: live search + cited sources.
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [{ role: "user", content: buildFactPrompt(lines) }],
      // Cast: recent tool type not in every SDK type def.
=======
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
      // Low-ish temperature for a bit of nuance. Note: live web search still
      // introduces some run-to-run variation that can't be fully removed.
      temperature: 0.4,
      tools: [{ type: "web_search" }],
      input: buildFactPrompt(
        lines,
        lang ?? "en",
        statsContext || undefined,
        asOf || undefined
      ),
>>>>>>> main
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
