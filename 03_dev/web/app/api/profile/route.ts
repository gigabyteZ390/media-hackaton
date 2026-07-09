import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resolveSlug } from "@/lib/profileSlug";
import { SECTOR_LABEL, topicLabel, type SectorKey } from "@/lib/sectors";
import { readAdded, type AddedStatement } from "@/lib/addedStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Politician profile dashboard data. The heavy per-topic reversal analysis is
// PRE-COMPUTED offline (scripts/build-profile.mjs) into data/profiles/<slug>.json.
// Statements verified from videos (data/added/<slug>.json, via /api/add-statements)
// are MERGED IN here so a person's track record accumulates over time — instant,
// no live LLM call.

type StatementRow = {
  text: string;
  date: string;
  sourceUrl: string;
  // present only on video-verified (accumulated) statements
  isContradiction?: boolean;
  factVerdict?: "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";
  factSources?: { title: string; url: string }[];
};
type Topic = {
  topic: string;
  count: number;
  reversalCount: number;
  note: string;
  statements: StatementRow[];
};
type Sector = {
  key: string;
  statementCount: number;
  reversalCount: number;
  topics: Topic[];
};
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

const VIDEO_TOPIC = { ko: "영상에서 추가된 발언", en: "Added from video" };

// Fold the accumulated video-verified statements into the base profile sectors.
function mergeAdded(sectors: Sector[], added: AddedStatement[], L: "ko" | "en") {
  if (!added.length) return;
  const bySector = new Map<string, AddedStatement[]>();
  for (const a of added) {
    const key = a.sector || "politics";
    if (!bySector.has(key)) bySector.set(key, []);
    bySector.get(key)!.push(a);
  }
  for (const [key, list] of bySector.entries()) {
    let sec = sectors.find((s) => s.key === key);
    if (!sec) {
      sec = { key, statementCount: 0, reversalCount: 0, topics: [] };
      sectors.push(sec);
    }
    const reversals = list.filter((a) => a.isContradiction).length;
    sec.statementCount += list.length;
    sec.reversalCount += reversals;
    const noteN =
      L === "ko"
        ? `영상 검증으로 추가된 발언 ${list.length}개 (과거와 모순 ${reversals}개)`
        : `${list.length} statement(s) added from video verification (${reversals} contradicting the record)`;
    // Show newest first, and put this topic at the top of its sector.
    sec.topics.unshift({
      topic: VIDEO_TOPIC[L],
      count: list.length,
      reversalCount: reversals,
      note: noteN,
      statements: list
        .slice()
        .reverse()
        .map((a) => ({
          text: a.text,
          date: a.date,
          sourceUrl: a.sourceUrl,
          isContradiction: a.isContradiction,
          factVerdict: a.factVerdict,
          factSources: a.factSources,
        })),
    });
  }
  // Keep sectors ordered by reversal count (added reversals can reorder them).
  sectors.sort((a, b) => b.reversalCount - a.reversalCount);
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
          available: ["Donald Trump", "이재명", "Emmanuel Macron"],
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8")) as ProfileFile;

    // Base sectors, notes localized.
    const sectors: Sector[] = data.sectors.map((s) => ({
      key: s.key,
      statementCount: s.statementCount,
      reversalCount: s.reversalCount,
      topics: s.topics.map((t) => ({
        topic: topicLabel(t.topic, L),
        count: t.count,
        reversalCount: t.reversalCount,
        note: t.note?.[L] ?? t.note?.en ?? "",
        statements: t.statements,
      })),
    }));

    // Merge accumulated video-verified statements.
    const added = readAdded(slug);
    mergeAdded(sectors, added, L);

    const addedReversals = added.filter((a) => a.isContradiction).length;

    // Attach sector display labels so the client needn't map keys.
    const sectorsOut = sectors.map((s) => ({
      ...s,
      label: SECTOR_LABEL[s.key as SectorKey]
        ? SECTOR_LABEL[s.key as SectorKey][L]
        : s.key,
    }));

    return NextResponse.json({
      politician: data.politician,
      totalStatements: data.totalStatements + added.length,
      totalReversals: data.totalReversals + addedReversals,
      addedCount: added.length,
      sectors: sectorsOut,
    });
  } catch (err: any) {
    console.error("[/api/profile]", err);
    return NextResponse.json(
      { error: err?.message ?? "profile failed" },
      { status: 500 }
    );
  }
}
