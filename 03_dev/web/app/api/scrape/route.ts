import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Paste a YouTube URL -> run the Python scraper -> return the transcript so the
// user never has to paste a transcript by hand. Reuses youtube_scraper/scraper.py.

function extractVideoId(url: string): string | null {
  const s = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:v=|\/videos\/|embed\/|youtu\.be\/|\/v\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// Merge tiny caption fragments into sentence-per-line text the analyzer expects.
function toSentences(lines: { text: string }[]): string {
  const full = lines
    .map((l) => l.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return full
    .replace(/([.!?。])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const { url, lang } = (await req.json()) as {
      url: string;
      lang?: "ko" | "en";
    };
    const vid = extractVideoId(url || "");
    if (!vid) {
      return NextResponse.json(
        { error: "Could not find a YouTube video id in that URL." },
        { status: 400 }
      );
    }

    const scraperDir = path.join(process.cwd(), "..", "youtube_scraper");
    const py = path.join(scraperDir, ".venv", "bin", "python");
    const langArg = lang === "ko" ? "ko,en" : "en,ko";

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(py, ["scraper.py", url, "--lang", langArg], {
        cwd: scraperDir,
      });
      let err = "";
      proc.stderr.on("data", (d) => (err += d.toString()));
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) return resolve();
        reject(
          new Error(
            code === 2
              ? "No captions found for this video — try the file upload, or a different source."
              : `Scraper failed (exit ${code}). ${err.slice(-300)}`
          )
        );
      });
    });

    // scraper writes to <project>/02_data/<id>.json  (cwd here is .../03_dev/web)
    const outPath = path.join(process.cwd(), "..", "..", "02_data", `${vid}.json`);
    const data = JSON.parse(await readFile(outPath, "utf-8"));

    return NextResponse.json({
      transcript: toSentences(data.lines ?? []),
      title: data.source?.title ?? "",
      date: data.source?.uploadDate ?? "",
      channel: data.source?.channel ?? "",
      url: data.source?.url ?? url,
      language: data.language ?? "",
      fragments: (data.lines ?? []).length,
    });
  } catch (err: any) {
    console.error("[/api/scrape]", err);
    return NextResponse.json(
      { error: err?.message ?? "scrape failed" },
      { status: 500 }
    );
  }
}
