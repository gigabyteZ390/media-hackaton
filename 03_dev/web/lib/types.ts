// Shared domain types for the Political Statement Contradiction & Fact Checker.

/** A past statement (element of statements.json / the DB the teammate builds). */
export interface Statement {
  id: string;
  politician: string;
  text: string;
  date: string; // "2022-03-15"
  sourceUrl: string;
  topic: string;
}

/** One spoken line extracted from a broadcast (matches the scraper output). */
export interface SpokenLine {
  text: string;
  start?: number;
  duration?: number;
}

/** Axis 1 — self-consistency verdict for a single spoken line. */
export interface ConsistencyVerdict {
  line: string;
  isContradiction: boolean;
  pastStatement?: string;
  reason: string;
  confidence: number; // 0..1
}

/** Axis 2 — factuality verdict for a single spoken line. */
export interface FactVerdict {
  line: string;
  isFactualClaim: boolean;
  verdict: "TRUE" | "FALSE" | "UNVERIFIABLE";
  reason: string;
  sources: { title: string; url: string }[];
  confidence: number; // 0..1
}

export interface ConsistencyResult {
  verdicts: ConsistencyVerdict[];
  consistencyScore: number; // 0..100
}

export interface FactCheckResult {
  facts: FactVerdict[];
  accuracyScore: number; // 0..100
}
