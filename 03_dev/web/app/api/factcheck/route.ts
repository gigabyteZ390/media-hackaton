import { NextResponse } from "next/server";
import { factCheck } from "@/lib/factcheck";
import type { SpokenLine } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Axis 2 — factuality. Extract claims (LLM), verify statistics against official
// INSEE/KOSIS data (code), and fall back to web search for everything else.
export async function POST(req: Request) {
  try {
    const { lines, lang, asOf } = (await req.json()) as {
      lines: SpokenLine[];
      lang?: "ko" | "en";
      asOf?: string; // date the statement was made (YYYY-MM-DD); the truth basis
    };
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Body must be { lines: SpokenLine[] }" },
        { status: 400 }
      );
    }

    const result = await factCheck(lines, lang ?? "en");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/factcheck]", err);
    return NextResponse.json(
      { error: err?.message ?? "factcheck failed" },
      { status: 500 }
    );
  }
}
