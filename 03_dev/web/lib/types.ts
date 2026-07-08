// Shared domain types for the Political Statement Contradiction & Fact Checker.

export type ConsistencyStatus = "CONSISTENT" | "CONTRADICTION" | "INSUFFICIENT_CONTEXT";
export type FactualityStatus = "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";

export interface PastStatement {
  text: string;
  date: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface StatementSource {
  title: string;
  url: string;
}

/** A single transcript line extracted from a broadcast or entered manually. */
export interface SpokenLine {
  text: string;
  start?: number;
  duration?: number;
}

<<<<<<< HEAD
/** Historical statement database record used for self-consistency checks. */
export interface Statement {
  id: string;
  politician: string;
  text: string;
  date: string;
  sourceUrl: string;
  topic?: string;
}

/** Axis 1 — self-consistency verdict for a single spoken line. */
export interface ConsistencyVerdict {
  status: ConsistencyStatus;
  label: string;
=======
/** Axis 1 — self-consistency verdict for a single spoken line (API shape). */
export interface ConsistencyVerdict {
  line: string;
  isContradiction: boolean;
  pastStatement?: string;
  /** Enriched in the route by matching the quote back to the DB record. */
  pastDate?: string;
  pastSourceUrl?: string;
>>>>>>> main
  reason: string;
  confidence: number;
  pastStatement?: PastStatement;
}

<<<<<<< HEAD
/** Axis 2 — factuality verdict for a single spoken line. */
export interface FactualityVerdict {
  isFactualClaim: boolean;
  verdict: FactualityStatus;
  label: string;
=======
/** Axis 2 — factuality verdict for a single spoken line (API shape). */
export interface FactVerdict {
  line: string;
  isFactualClaim: boolean;
  verdict: "TRUE" | "FALSE" | "UNVERIFIABLE";
  /** The time basis the verdict was judged against (e.g. "2023"). */
  referencePeriod?: string;
  /** How the latest data differs from the verdict, if it does ("" if unchanged). */
  currentNote?: string;
>>>>>>> main
  reason: string;
  sourceType?: "KOSIS" | "WEB";
  confidence: number;
  sources: StatementSource[];
}

/** A single spoken line analysis result. */
export interface StatementResult {
  id: string;
  timestamp: string;
  speaker: string;
  line: string;
  consistency: ConsistencyVerdict;
  factuality: FactualityVerdict;
}

export interface ConsistencyResult {
  verdicts: StatementResult[];
  consistencyScore: number; // 0..100
}

export interface FactCheckResult {
  facts: StatementResult[];
  accuracyScore: number; // 0..100
}

// --- UI view-model (Evidence Desk dashboard) ---
// The client merges the two API responses (per line) into these richer shapes.

export type ConsistencyStatus =
  | "CONSISTENT"
  | "CONTRADICTION"
  | "INSUFFICIENT_CONTEXT";
export type FactualityStatus = "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";

export interface StatementSource {
  title: string;
  url: string;
}

export interface PastStatement {
  text: string;
  date: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface UIConsistency {
  status: ConsistencyStatus;
  label: string;
  reason: string;
  confidence: number;
  pastStatement?: PastStatement;
}

export interface UIFactuality {
  isFactualClaim: boolean;
  verdict: FactualityStatus;
  label: string;
  reason: string;
  referencePeriod?: string;
  currentNote?: string;
  sourceType?: "KOSIS" | "WEB";
  confidence: number;
  sources: StatementSource[];
}

/** One fully-merged spoken-line result rendered as a card in the dashboard. */
export interface StatementResult {
  id: string;
  timestamp: string;
  speaker: string;
  line: string;
  consistency: UIConsistency;
  factuality: UIFactuality;
}
