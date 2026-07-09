// Persistent per-politician store of statements verified from videos/transcripts.
// data/added/<slug>.json is a flat append-only list; /api/add-statements writes it
// and /api/profile merges it so a person's track record accumulates over time.
import fs from "node:fs";
import path from "node:path";

export interface AddedStatement {
  id: string;
  politician: string;
  text: string;
  date: string;
  sourceUrl: string;
  topic: string;
  sector: string;
  isContradiction: boolean;
  // Axis 2 (factuality) captured at verification time so the track record can show it.
  factVerdict?: "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";
  factSources?: { title: string; url: string }[];
  addedAt: string;
}

function storePath(slug: string) {
  return path.join(process.cwd(), "data", "added", `${slug}.json`);
}

export function readAdded(slug: string): AddedStatement[] {
  try {
    const p = storePath(slug);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8")) as AddedStatement[];
  } catch {
    return [];
  }
}

export function writeAdded(slug: string, all: AddedStatement[]): void {
  const p = storePath(slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(all, null, 2));
}
