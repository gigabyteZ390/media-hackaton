"use client";

import { useEffect, useState } from "react";
import { DICT, LANG_LABEL, type Lang } from "@/lib/i18n";
import type {
  ConsistencyResult,
  FactCheckResult,
  ConsistencyVerdict,
  FactVerdict,
} from "@/lib/types";

type ThemeMode = "light" | "dark" | "system";

const SAMPLE_POLITICIAN = "이재명";
// Illustrative test lines (NOT real quotes) — to demo the mechanism.
const SAMPLE_TRANSCRIPT = [
  "기본소득은 현실성이 없어 도입할 수 없습니다.",
  "부동산 보유세는 오히려 낮춰야 합니다.",
  "청년 정책은 앞으로도 계속 확대하겠습니다.",
  "대한민국 인구의 절반이 서울에 살고 있습니다.",
].join("\n");

type Row = {
  line: string;
  consistency?: ConsistencyVerdict;
  fact?: FactVerdict;
};

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ko");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [politician, setPolitician] = useState(SAMPLE_POLITICIAN);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null);
  const [facts, setFacts] = useState<FactCheckResult | null>(null);

  const t = DICT[lang];

  // Load saved preferences.
  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang | null;
    const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
    if (savedLang) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme);
    const mode = savedTheme ?? "system";
    applyTheme(mode);
    // Follow system changes while in "system" mode.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("theme") ?? "system") === "system")
        applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function changeTheme(mode: ThemeMode) {
    setTheme(mode);
    localStorage.setItem("theme", mode);
    applyTheme(mode);
  }

  function toggleLang() {
    const next: Lang = lang === "ko" ? "en" : "ko";
    setLang(next);
    localStorage.setItem("lang", next);
  }

  async function analyze() {
    setError(null);
    setConsistency(null);
    setFacts(null);
    const lines = transcript
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
    if (lines.length === 0) {
      setError(t.errEmpty);
      return;
    }
    setLoading(true);
    try {
      const [cRes, fRes] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ politician, lines, lang }),
        }),
        fetch("/api/factcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines, lang }),
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

  const rows: Row[] = (() => {
    const map = new Map<string, Row>();
    for (const v of consistency?.verdicts ?? [])
      map.set(v.line, { line: v.line, consistency: v });
    for (const f of facts?.facts ?? []) {
      const row = map.get(f.line) ?? { line: f.line };
      row.fact = f;
      map.set(f.line, row);
    }
    return [...map.values()];
  })();

  const verdictLabel = (v: FactVerdict["verdict"]) =>
    v === "TRUE" ? t.verdictTRUE : v === "FALSE" ? t.verdictFALSE : t.verdictUNVERIFIABLE;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-4 flex items-center justify-end gap-2">
        <select
          aria-label={t.theme}
          value={theme}
          onChange={(e) => changeTheme(e.target.value as ThemeMode)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="light">{t.light}</option>
          <option value="dark">{t.dark}</option>
          <option value="system">{t.system}</option>
        </select>
        <button
          onClick={toggleLang}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {LANG_LABEL[lang]}
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-brand">{t.titleA}</span> {t.titleB}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t.subtitle}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="block text-sm font-semibold">{t.politician}</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={politician}
          onChange={(e) => setPolitician(e.target.value)}
        />

        <label className="mt-4 block text-sm font-semibold">
          {t.transcript}{" "}
          <span className="font-normal text-slate-400">{t.perLine}</span>
        </label>
        <textarea
          className="mt-1 h-40 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder={t.placeholder}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? t.analyzing : t.analyze}
          </button>
          <button
            onClick={() => {
              setPolitician(SAMPLE_POLITICIAN);
              setTranscript(SAMPLE_TRANSCRIPT);
            }}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            {t.loadSample}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </section>

      {(consistency || facts) && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-4">
            <ScoreCard
              label={t.consistency}
              value={consistency?.consistencyScore}
              hint={t.consistencyHint}
            />
            <ScoreCard
              label={t.accuracy}
              value={facts?.accuracyScore}
              hint={t.accuracyHint}
            />
          </section>

          <section className="mt-6 space-y-3">
            {rows.map((row, i) => (
              <article
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-sm font-medium">{row.line}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.consistency && (
                    <Badge
                      tone={row.consistency.isContradiction ? "red" : "blue"}
                      label={
                        row.consistency.isContradiction
                          ? t.contradiction
                          : t.consistent
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
                      label={`${t.factPrefix}: ${verdictLabel(row.fact.verdict)}`}
                    />
                  )}
                </div>
                {row.consistency?.isContradiction && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {row.consistency.reason}
                    {row.consistency.pastStatement
                      ? ` — "${row.consistency.pastStatement}"`
                      : ""}
                  </p>
                )}
                {row.fact?.isFactualClaim && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {row.fact.reason}
                    {row.fact.sources?.length > 0 &&
                      row.fact.sources.map((s, j) => (
                        <a
                          key={j}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 text-brand underline"
                        >
                          [{j + 1}]
                        </a>
                      ))}
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
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
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
