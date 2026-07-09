import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Politician profile dashboard data. The heavy per-topic reversal analysis is
// PRE-COMPUTED offline (scripts/build-profile.mjs) into data/profiles/<slug>.json,
// so this endpoint is a deterministic, instant file read — no live LLM call, no
// latency, no truncation risk during the demo. To refresh the numbers, re-run the
// generator and commit the JSON.

type ProfileFile = {
  politician: string;
  totalStatements: number;
  totalReversals: number;
  sectors: {
    key: string;
    statementCount: number;
    reversalCount: number;
    topics: {
      topic: string;
      count: number;
      reversalCount: number;
      note: { ko: string; en: string };
      statements: { text: string; date: string; sourceUrl: string }[];
    }[];
  }[];
};

// Search aliases → canonical profile slug.
const ALIASES: Record<string, string> = {
  trump: "donald-trump",
  "donald trump": "donald-trump",
  "donald j. trump": "donald-trump",
  트럼프: "donald-trump",
  도널드트럼프: "donald-trump",
  "도널드 트럼프": "donald-trump",
};

function resolveSlug(input: string): string {
  const raw = (input || "").trim().toLowerCase();
  if (ALIASES[raw]) return ALIASES[raw];
  const compact = raw.replace(/\s+/g, "");
  if (ALIASES[compact]) return ALIASES[compact];
  return raw.replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const { politician, lang } = (await req.json()) as {
      politician: string;
      lang?: "ko" | "en";
    };
    const L = lang === "ko" ? "ko" : "en";
    const slug = resolveSlug(politician);
    const file = path.join(process.cwd(), "data", "profiles", `${slug}.json`);

    if (!slug || !fs.existsSync(file)) {
      return NextResponse.json(
        {
          error: `No profile available for "${politician}".`,
          available: ["Donald Trump"],
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8")) as ProfileFile;

    // Localize each note to the requested language, keeping the response shape flat.
    const out = {
      politician: data.politician,
      totalStatements: data.totalStatements,
      totalReversals: data.totalReversals,
      sectors: data.sectors.map((s) => ({
        ...s,
        topics: s.topics.map((t) => ({
          topic: t.topic,
          count: t.count,
          reversalCount: t.reversalCount,
          note: t.note?.[L] ?? t.note?.en ?? "",
          statements: t.statements,
        })),
      })),
    };
    return NextResponse.json(out);
  } catch (err: any) {
    console.error("[/api/profile]", err);
    return NextResponse.json(
      { error: err?.message ?? "profile failed" },
      { status: 500 }
    );
  }
}
