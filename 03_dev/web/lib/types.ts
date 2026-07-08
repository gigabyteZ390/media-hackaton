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
  reason: string;
  confidence: number;
  pastStatement?: PastStatement;
}

/** Axis 2 — factuality verdict for a single spoken line. */
export interface FactualityVerdict {
  isFactualClaim: boolean;
  verdict: FactualityStatus;
  label: string;
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
