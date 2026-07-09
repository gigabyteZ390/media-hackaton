import { NextResponse } from "next/server";
import { resolveSlug } from "@/lib/profileSlug";
import { classifySector } from "@/lib/sectors";
import { readAdded, writeAdded, type AddedStatement } from "@/lib/addedStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persist statements verified from a video/transcript into a per-politician store so
// they ACCUMULATE onto that person's track record (merged back in by /api/profile).

export async function POST(req: Request) {
  try {
    const { politician, sourceUrl, statements } = (await req.json()) as {
      politician: string;
      sourceUrl?: string;
      statements: {
        text: string;
        isContradiction?: boolean;
        date?: string;
        topic?: string;
        factVerdict?: "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";
        factSources?: { title: string; url: string }[];
      }[];
    };
    if (!politician || !Array.isArray(statements) || statements.length === 0) {
      return NextResponse.json(
        { error: "Body must be { politician, statements: [...] }" },
        { status: 400 }
      );
    }
    const slug = resolveSlug(politician);
    if (!slug) {
      return NextResponse.json({ error: "Bad politician" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const existing = readAdded(slug);
    const seen = new Set(existing.map((s) => s.text.trim().toLowerCase()));

    const fresh: AddedStatement[] = [];
    statements.forEach((s, i) => {
      const text = (s.text || "").trim();
      if (!text || seen.has(text.toLowerCase())) return; // dedupe
      seen.add(text.toLowerCase());
      const topic = s.topic || "video";
      fresh.push({
        id: `added-${slug}-${Date.now()}-${i}`,
        politician,
        text,
        date: s.date || now.slice(0, 10),
        sourceUrl: sourceUrl || "",
        topic,
        sector: classifySector(topic === "video" ? text : topic),
        isContradiction: !!s.isContradiction,
        factVerdict: s.factVerdict,
        factSources: s.factSources,
        addedAt: now,
      });
    });

    writeAdded(slug, [...existing, ...fresh]);
    return NextResponse.json({ added: fresh.length, total: existing.length + fresh.length });
  } catch (err: any) {
    console.error("[/api/add-statements]", err);
    return NextResponse.json(
      { error: err?.message ?? "add failed" },
      { status: 500 }
    );
  }
}
