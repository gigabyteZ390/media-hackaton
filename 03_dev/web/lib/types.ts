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
  /** How this verdict was reached. */
  method?: "official-stats" | "web-search" | "none";
  /** The number the speaker asserted (statistical claims). */
  claimedValue?: number;
  /** The official figure we compared against (INSEE / KOSIS). */
  officialValue?: number;
  unit?: string;
  /** Reference period of the official figure, e.g. "2025-09". */
  period?: string;
}

/** A checkable claim extracted from one spoken line by the LLM (extraction pass). */
export interface StatClaim {
  line: string;
  isFactualClaim: boolean; // any verifiable fact at all?
  isStatistical: boolean; // a concrete number official stats could confirm?
  subject?: string; // short EN description ("France unemployment rate")
  claimedValue?: number; // the number asserted (e.g. 5 for "5%")
  unit?: string; // "%", "persons", "EUR", ...
  geo?: string; // "FR", "KR", a region, ...
  period?: string; // "2025", "2025-Q1", "2025-09", ...
  citedSource?: string; // a source the speaker explicitly named, if any
  metricKey?: string; // a STAT_REGISTRY key when the metric clearly matches
}

/** One official figure fetched from a government statistics API. */
export interface StatValue {
  provider: "INSEE" | "KOSIS";
  value: number;
  period: string;
  unit?: string;
  sourceUrl: string;
  label?: string;
}

export interface ConsistencyResult {
  verdicts: ConsistencyVerdict[];
  consistencyScore: number; // 0..100
}

export interface FactCheckResult {
  facts: FactVerdict[];
  accuracyScore: number; // 0..100
}
