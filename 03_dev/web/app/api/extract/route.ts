import { NextResponse } from "next/server";
import { getAnthropic, joinText, extractJson } from "@/lib/anthropic";
import { buildSelectionPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Selection pass: pick the substantive statements a given politician actually made
// out of a long/raw transcript (skips intros/filler, ignores other speakers), so
// the two-axis analysis runs on meaningful claims instead of the first N lines.
export async function POST(req: Request) {
  try {
    const { transcript, politician, lang, max } = (await req.json()) as {
      transcript: string;
      politician: string;
      lang?: "ko" | "en";
      max?: number;
    };
    if (!transcript || !politician) {
      return NextResponse.json(
        { error: "Body must be { transcript, politician }" },
        { status: 400 }
      );
    }

    const client = getAnthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: buildSelectionPrompt(
            politician,
            transcript,
            lang ?? "en",
            Math.min(Math.max(max ?? 10, 1), 15)
          ),
        },
      ],
    } as any);

    const parsed = extractJson<{ statements: string[] }>(joinText(res));
    const statements = (parsed.statements ?? [])
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);

    return NextResponse.json({ statements });
  } catch (err: any) {
    console.error("[/api/extract]", err);
    return NextResponse.json(
      { error: err?.message ?? "extract failed" },
      { status: 500 }
    );
  }
}
