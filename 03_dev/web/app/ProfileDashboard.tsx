"use client";

import { useState, useEffect, useCallback } from "react";

type Lang = "ko" | "en";

// --- profile API shapes (served by /api/profile from data/profiles/<slug>.json) ---
type SectorKey = "geopolitics" | "economy" | "social" | "politics";

interface TopicRow {
  topic: string;
  count: number;
  reversalCount: number;
  note: string;
  statements: { text: string; date: string; sourceUrl: string }[];
}
interface SectorRow {
  key: SectorKey;
  statementCount: number;
  reversalCount: number;
  topics: TopicRow[];
}
interface Profile {
  politician: string;
  totalStatements: number;
  totalReversals: number;
  sectors: SectorRow[];
}

// --- sector presentation (label + icon + accent color token) ---
const SECTOR_META: Record<
  SectorKey,
  { ko: string; en: string; icon: string; color: string }
> = {
  geopolitics: { ko: "지정학·안보", en: "Geopolitics & Security", icon: "ti-world", color: "blue" },
  economy: { ko: "경제·통상", en: "Economy & Trade", icon: "ti-coin", color: "green" },
  social: { ko: "사회·정책", en: "Social & Domestic", icon: "ti-users-group", color: "orange" },
  politics: { ko: "정치·거버넌스", en: "Politics & Governance", icon: "ti-gavel", color: "red" },
};

const STR = {
  en: {
    kicker: "[ POLITICIAN_TRACK_RECORD // FLIP-FLOP_LEDGER ]",
    title: "Track Record",
    subtitle: "SECTOR_MAP // POSITION_REVERSAL_COUNT",
    searchPlaceholder: "Search a politician (e.g. Trump)...",
    searchBtn: "Trace",
    hint: "Demo dataset: Donald Trump — statements sourced & date-ordered.",
    loading: "Assembling track record...",
    notFound: (n: string) => `No profile available for "${n}". Try: Donald Trump.`,
    totalStatements: "Statements on record",
    totalReversals: "Position reversals",
    reversals: "reversals",
    reversal: "reversal",
    statements: "statements",
    noReversal: "No reversal detected — consistent stance.",
    timeline: "Statement timeline",
    viewTimeline: "Timeline",
    hide: "Hide",
    source: "SOURCE",
    back: "Back",
    analyze: "Verify a transcript instead",
    sortNote: "Sorted by number of position reversals",
    subject: "SUBJECT",
  },
  ko: {
    kicker: "[ 정치인_행적 // 말바꾸기_원장 ]",
    title: "발언 행적 추적",
    subtitle: "섹터 지도 // 입장 번복 횟수",
    searchPlaceholder: "정치인을 검색하세요 (예: 트럼프)...",
    searchBtn: "추적",
    hint: "데모 데이터: 도널드 트럼프 — 출처·날짜순으로 정리된 실제 발언.",
    loading: "행적을 정리하는 중...",
    notFound: (n: string) => `"${n}"의 프로필이 없습니다. 예시: 트럼프`,
    totalStatements: "수집된 발언",
    totalReversals: "입장 번복",
    reversals: "회 번복",
    reversal: "회 번복",
    statements: "개 발언",
    noReversal: "번복 없음 — 일관된 입장.",
    timeline: "발언 타임라인",
    viewTimeline: "타임라인",
    hide: "접기",
    source: "출처",
    back: "돌아가기",
    analyze: "대본으로 직접 검증하기",
    sortNote: "입장 번복 횟수 기준 정렬",
    subject: "대상",
  },
};

function TopicItem({ topic, t, lang, color }: { topic: TopicRow; t: typeof STR.en; lang: Lang; color: string }) {
  const [open, setOpen] = useState(false);
  const hasReversal = topic.reversalCount > 0;
  return (
    <div className={`border border-line ${hasReversal ? "bg-surface" : "bg-surface/40"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate/40"
      >
        {/* reversal count chip */}
        <div
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-line font-mono ${
            hasReversal ? `bg-${color} text-white` : "bg-slate/50 text-gray"
          }`}
        >
          <span className="text-lg font-black leading-none">{topic.reversalCount}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wide text-ink">
              {topic.topic}
            </span>
            <span className="font-mono text-[9px] font-bold uppercase text-gray">
              [{topic.count} {t.statements}]
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray">
            {topic.note || t.noReversal}
          </p>
        </div>
        <i className={`ti ti-chevron-${open ? "up" : "down"} shrink-0 text-lg text-gray`} />
      </button>

      {open && (
        <div className="border-t border-line bg-slate/30 p-4">
          <p className="mb-4 font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
            {t.timeline}
          </p>
          <ol className="relative space-y-4 border-l-2 border-line/40 pl-5">
            {topic.statements.map((s, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[27px] top-1 h-3 w-3 border-2 border-surface bg-${color}`}
                />
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue">{s.date}</span>
                  {s.sourceUrl && s.sourceUrl !== "#" && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[9px] font-bold uppercase text-gray underline decoration-gray/30 hover:text-blue"
                    >
                      {t.source}
                    </a>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function ProfileDashboard({
  lang,
  initialName,
  onAnalyze,
}: {
  lang: Lang;
  initialName: string;
  onAnalyze: () => void;
}) {
  const t = STR[lang];
  const [query, setQuery] = useState(initialName);
  const [active, setActive] = useState(initialName);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ politician: clean, lang }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setProfile(null);
          setError(t.notFound(clean));
        } else {
          setProfile(data);
        }
      } catch {
        setProfile(null);
        setError(t.notFound(clean));
      } finally {
        setLoading(false);
      }
    },
    [lang, t]
  );

  // (re)load when the active name or language changes
  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lang]);

  const submit = () => setActive(query);

  const maxSectorReversals = profile
    ? Math.max(1, ...profile.sectors.map((s) => s.reversalCount))
    : 1;

  return (
    <section className="min-h-[80vh] border-b border-line bg-surface p-8 md:p-12 lg:p-20">
      <div className="mx-auto max-w-6xl">
        {/* header + search */}
        <div className="mb-4 inline-block border border-line px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
          {t.kicker}
        </div>
        <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
          {t.title}
        </h2>
        <p className="mt-2 font-mono text-xs font-bold text-gray uppercase tracking-[0.2em]">
          {t.subtitle}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 border-2 border-line bg-surface px-5 py-4 shadow-sharp-sm">
            <i className="ti ti-search text-xl text-blue" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={t.searchPlaceholder}
              className="w-full bg-transparent text-sm font-black uppercase tracking-wide text-ink outline-none placeholder:text-gray/40"
              autoComplete="off"
            />
          </div>
          <button
            onClick={submit}
            className="bg-accent px-10 py-4 font-black uppercase tracking-widest text-accentfg shadow-sharp transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            {t.searchBtn}
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-gray">{t.hint}</p>

        {/* states */}
        {loading && (
          <div className="mt-16 flex items-center justify-center gap-3 py-24 font-mono text-sm text-gray">
            <i className="ti ti-loader-2 animate-spin text-xl" />
            {t.loading}
          </div>
        )}

        {!loading && error && (
          <div className="mt-16 border-2 border-orange bg-orange/5 p-6 font-mono text-sm text-orange">
            {error}
          </div>
        )}

        {!loading && profile && (
          <>
            {/* summary numbers */}
            <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="border-2 border-line bg-surface p-6 shadow-sharp-sm">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
                  {t.totalStatements}
                </p>
                <p className="mt-2 font-mono text-5xl font-black text-ink">
                  {profile.totalStatements}
                </p>
              </div>
              <div className="border-2 border-line bg-accent p-6 text-accentfg shadow-sharp-sm">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                  {t.totalReversals}
                </p>
                <p className="mt-2 font-mono text-5xl font-black">
                  {profile.totalReversals}
                </p>
              </div>
              <div className="col-span-2 flex items-center border-2 border-line bg-surface px-6 py-4 shadow-sharp-sm md:col-span-1">
                <span className="font-mono text-[9px] font-bold uppercase leading-relaxed tracking-widest text-gray">
                  {t.subject}
                </span>
                <span className="ml-auto text-lg font-black uppercase tracking-tight text-ink">
                  {profile.politician}
                </span>
              </div>
            </div>

            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
              {t.sortNote}
            </p>

            {/* sector cards */}
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {profile.sectors.map((sec) => {
                const meta = SECTOR_META[sec.key];
                return (
                  <div
                    key={sec.key}
                    className="flex flex-col border-2 border-line bg-surface shadow-sharp-sm"
                  >
                    {/* sector header */}
                    <div className="flex items-center gap-4 border-b border-line p-5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center bg-${meta.color} text-white`}
                      >
                        <i className={`ti ${meta.icon} text-2xl`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black uppercase tracking-tight text-ink">
                          {lang === "ko" ? meta.ko : meta.en}
                        </h3>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
                          {sec.statementCount} {t.statements}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-4xl font-black leading-none text-ink">
                          {sec.reversalCount}
                        </span>
                        <p className="font-mono text-[9px] font-bold uppercase text-gray">
                          {t.reversals}
                        </p>
                      </div>
                    </div>

                    {/* sector reversal bar */}
                    <div className="px-5 pt-4">
                      <div className="flex h-2 w-full bg-slate/50">
                        <div
                          className={`h-full bg-${meta.color} transition-all duration-700`}
                          style={{
                            width: `${(sec.reversalCount / maxSectorReversals) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* topics */}
                    <div className="space-y-2 p-5">
                      {sec.topics.map((topic) => (
                        <TopicItem
                          key={topic.topic}
                          topic={topic}
                          t={t}
                          lang={lang}
                          color={meta.color}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* secondary action: the transcript analyzer (kept, demoted) */}
            <div className="mt-16 flex justify-center">
              <button
                onClick={onAnalyze}
                className="btn-secondary px-8 py-3 text-[10px] shadow-sharp-sm"
              >
                <i className="ti ti-file-text mr-2" />
                {t.analyze}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
