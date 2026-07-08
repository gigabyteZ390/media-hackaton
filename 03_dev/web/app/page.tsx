"use client";

import { useState } from "react";
import type {
  ConsistencyResult,
  FactCheckResult,
  ConsistencyVerdict,
  FactVerdict,
} from "@/lib/types";

const SAMPLE_POLITICIAN = "Hong Gil-dong";
const SAMPLE_TRANSCRIPT = [
  "We now need a significant tax increase to fund our new programs.",
  "Welfare remains our single top priority.",
  "We should build several more nuclear power plants right away.",
  "50% of religious Koreans are Muslim.",
].join("\n");

type Row = {
  line: string;
  consistency?: ConsistencyVerdict;
  fact?: FactVerdict;
};

export default function Home() {
  const [politician, setPolitician] = useState(SAMPLE_POLITICIAN);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null);
  const [facts, setFacts] = useState<FactCheckResult | null>(null);

  async function analyze() {
    setError(null);
    setConsistency(null);
    setFacts(null);
    const lines = transcript
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
    if (lines.length === 0) {
      setError("Paste a transcript first (one statement per line).");
      return;
    }
    setLoading(true);
    try {
      const [cRes, fRes] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ politician, lines }),
        }),
        fetch("/api/factcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines }),
        }),
      ]);
      const cJson = await cRes.json();
      const fJson = await fRes.json();
      if (!cRes.ok) throw new Error(cJson.error || "analyze failed");
      if (!fRes.ok) throw new Error(fJson.error || "factcheck failed");
      setConsistency(cJson);
      setFacts(fJson);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  // Merge the two axes by line text.
  const rows: Row[] = (() => {
    const map = new Map<string, Row>();
    for (const v of consistency?.verdicts ?? []) {
      map.set(v.line, { line: v.line, consistency: v });
    }
    for (const f of facts?.facts ?? []) {
      const row = map.get(f.line) ?? { line: f.line };
      row.fact = f;
      map.set(f.line, row);
    }
    return [...map.values()];
  })();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-brand">Political Statement</span> Contradiction &amp;
          Fact Checker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Two independent axes — self-consistency (vs. the person&apos;s own past
          words) and factuality (fact-check with sources).
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold">Politician</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          value={politician}
          onChange={(e) => setPolitician(e.target.value)}
        />

        <label className="mt-4 block text-sm font-semibold">
          Broadcast transcript{" "}
          <span className="font-normal text-slate-400">(one statement per line)</span>
        </label>
        <textarea
          className="mt-1 h-40 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand"
          placeholder={"e.g. paste a scraper JSON's lines here, one per row"}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <button
            onClick={() => {
              setPolitician(SAMPLE_POLITICIAN);
              setTranscript(SAMPLE_TRANSCRIPT);
            }}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Load sample
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {(consistency || facts) && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-4">
            <ScoreCard
              label="Consistency"
              value={consistency?.consistencyScore}
              hint="% of lines that don't contradict past words"
            />
            <ScoreCard
              label="Accuracy"
              value={facts?.accuracyScore}
              hint="% of checked factual claims that are true"
            />
          </section>

          <section className="mt-6 space-y-3">
            {rows.map((row, i) => (
              <article
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-medium">{row.line}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.consistency && (
                    <Badge
                      tone={row.consistency.isContradiction ? "red" : "blue"}
                      label={
                        row.consistency.isContradiction
                          ? "Contradiction"
                          : "Consistent"
                      }
                    />
                  )}
                  {row.fact && row.fact.isFactualClaim && (
                    <Badge
                      tone={
                        row.fact.verdict === "TRUE"
                          ? "green"
                          : row.fact.verdict === "FALSE"
                          ? "red"
                          : "gray"
                      }
                      label={`Fact: ${row.fact.verdict}`}
                    />
                  )}
                </div>
                {row.consistency?.isContradiction && (
                  <p className="mt-2 text-xs text-slate-500">
                    {row.consistency.reason}
                    {row.consistency.pastStatement
                      ? ` — vs "${row.consistency.pastStatement}"`
                      : ""}
                  </p>
                )}
                {row.fact?.isFactualClaim && (
                  <p className="mt-1 text-xs text-slate-500">
                    {row.fact.reason}
                    {row.fact.sources?.length > 0 && (
                      <>
                        {" "}
                        {row.fact.sources.map((s, j) => (
                          <a
                            key={j}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand underline"
                          >
                            [{j + 1}]
                          </a>
                        ))}
                      </>
                    )}
                  </p>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function ScoreCard({
  label,
  value,
  hint,
}: {
  label: string;
  value?: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold text-brand">
        {value == null ? "—" : `${Math.round(value)}%`}
      </div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function Badge({
  tone,
  label,
}: {
  tone: "blue" | "green" | "red" | "gray";
  label: string;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
