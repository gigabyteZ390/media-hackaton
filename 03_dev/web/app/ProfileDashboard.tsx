"use client";

import { useState, useEffect, useCallback } from "react";
import { getPoliticianPhoto } from "@/lib/wikipedia";

// Politician portrait (keyless Wikipedia lookup) with an initials fallback so a
// lookup miss never breaks the layout.
function PoliticianAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    setSrc(null);
    getPoliticianPhoto(name).then((s) => ok && setSrc(s));
    return () => {
      ok = false;
    };
  }, [name]);
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 overflow-hidden border-2 border-line bg-slate"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-black text-ink">
          {initials}
        </div>
      )}
    </div>
  );
}

type Lang = "ko" | "en";
type FactVerdict = "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";
type SectorKey = "geopolitics" | "economy" | "social" | "politics";

interface StatementRow {
  text: string;
  textOrig?: string;
  translated?: boolean;
  date: string;
  sourceUrl: string;
  isContradiction?: boolean;
  factVerdict?: FactVerdict;
  factSources?: { title: string; url: string }[];
}
interface TopicRow {
  topic: string;
  count: number;
  reversalCount: number;
  note: string;
  statements: StatementRow[];
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
  addedCount?: number;
  sectors: SectorRow[];
}
interface LastAnalysis {
  consistencyScore: number;
  factualityScore: number;
  factStatChecked?: number;
  breakdown?: { total: number; contradictions: number; verified: number };
}

const SECTOR_META: Record<
  SectorKey,
  { ko: string; en: string; icon: string; color: string }
> = {
  geopolitics: { ko: "지정학·안보", en: "Geopolitics", icon: "ti-world", color: "blue" },
  economy: { ko: "경제·통상", en: "Economy", icon: "ti-coin", color: "green" },
  social: { ko: "사회·정책", en: "Social", icon: "ti-users-group", color: "orange" },
  politics: { ko: "정치·거버넌스", en: "Politics", icon: "ti-gavel", color: "red" },
};

const STR = {
  en: {
    kicker: "[ POLITICIAN_TRACK_RECORD // FLIP-FLOP_LEDGER ]",
    title: "Track Record",
    subtitle: "SECTOR_MAP // POSITION_REVERSAL_COUNT",
    searchPlaceholder: "Search a politician (e.g. Trump)...",
    searchBtn: "Trace",
    hint: "Every statement is sourced and ordered by date.",
    loading: "Assembling track record...",
    notFound: (n: string) => `No profile available for "${n}". Try: Donald Trump.`,
    totalStatements: "Statements on record",
    totalReversals: "Position reversals",
    reversals: "reversals",
    statements: "statements",
    noReversal: "No reversal detected — consistent stance.",
    timeline: "Statement timeline",
    source: "SOURCE",
    subject: "SUBJECT",
    verifyResult: "This verification",
    verifyDesc: "Scores for the statements you just added from the video/transcript.",
    consistency: "Consistency",
    factuality: "Factuality",
    consistencyHint: "Share of lines that do NOT contradict the speaker's own past.",
    factualityHint: "TRUE share of claims checked against official statistics",
    noStatClaim: "No statistical claim to check against official data.",
    pickSector: "Select a category to see its statements",
    cBadge: (c: boolean): string => (c ? "Contradiction" : "Consistent"),
    fBadge: {
      TRUE: "Verified",
      FALSE: "False",
      UNVERIFIABLE: "Unverifiable",
      NOT_FACTUAL: "Opinion",
    } as Record<FactVerdict, string>,
  },
  ko: {
    kicker: "[ 정치인_행적 // 말바꾸기_원장 ]",
    title: "발언 행적 추적",
    subtitle: "섹터 지도 // 입장 번복 횟수",
    searchPlaceholder: "정치인을 검색하세요 (예: 트럼프)...",
    searchBtn: "추적",
    hint: "모든 발언은 출처가 있으며 날짜순으로 정리했습니다.",
    loading: "행적을 정리하는 중...",
    notFound: (n: string) => `"${n}"의 프로필이 없습니다. 예시: 트럼프`,
    totalStatements: "수집된 발언",
    totalReversals: "입장 번복",
    reversals: "회 번복",
    statements: "개 발언",
    noReversal: "번복 없음 — 일관된 입장.",
    timeline: "발언 타임라인",
    source: "출처",
    subject: "대상",
    verifyResult: "이번 검증 결과",
    verifyDesc: "방금 영상/대본에서 추가한 발언들의 점수입니다.",
    consistency: "일관성",
    factuality: "사실성",
    consistencyHint: "발화자 자신의 과거와 모순되지 않는 발언의 비율.",
    factualityHint: "공식 통계로 검증한 주장 중 사실 비율",
    noStatClaim: "공식 통계로 대조할 통계 주장이 없습니다.",
    pickSector: "카테고리를 선택하면 해당 발언이 표시됩니다",
    cBadge: (c: boolean): string => (c ? "모순" : "일관"),
    fBadge: {
      TRUE: "사실",
      FALSE: "거짓",
      UNVERIFIABLE: "검증불가",
      NOT_FACTUAL: "의견",
    } as Record<FactVerdict, string>,
  },
};

// 10-segment percentage bar (matches the brutalist result gauges).
function SegBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex h-7 gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-full flex-1 transition-colors duration-500 ${
            i < Math.round(pct / 10) ? `bg-${color}` : "bg-slate/50"
          }`}
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}

function FactBadge({ v, t }: { v?: FactVerdict; t: typeof STR.en }) {
  if (!v) return null;
  const color =
    v === "TRUE" ? "green" : v === "FALSE" ? "red" : v === "UNVERIFIABLE" ? "orange" : "gray";
  const cls =
    v === "NOT_FACTUAL"
      ? "border border-line text-gray"
      : `bg-${color} text-white`;
  return (
    <span
      className={`${cls} px-2 py-[2px] font-mono text-[9px] font-bold uppercase tracking-widest`}
    >
      {t.fBadge[v]}
    </span>
  );
}

function TopicItem({
  topic,
  t,
  color,
  defaultOpen,
}: {
  topic: TopicRow;
  t: typeof STR.en;
  color: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const hasReversal = topic.reversalCount > 0;
  return (
    <div className={`border border-line ${hasReversal ? "bg-surface" : "bg-surface/40"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate/40"
      >
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
          {topic.note && (
            <div
              className={`mb-5 border-l-4 border-${color} bg-${color}/5 p-4 text-sm leading-relaxed text-ink`}
            >
              {topic.note}
            </div>
          )}
          <p className="mb-4 font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
            {t.timeline}
          </p>
          <ol className="relative space-y-4 border-l-2 border-line/40 pl-5">
            {topic.statements.map((s, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[27px] top-1 h-3 w-3 border-2 border-surface ${
                    s.isContradiction ? "bg-red" : `bg-${color}`
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue">{s.date}</span>
                  {s.isContradiction !== undefined && (
                    <span
                      className={`px-2 py-[2px] font-mono text-[9px] font-bold uppercase tracking-widest ${
                        s.isContradiction ? "bg-red text-white" : "bg-blue text-white"
                      }`}
                    >
                      {t.cBadge(s.isContradiction)}
                    </span>
                  )}
                  <FactBadge v={s.factVerdict} t={t} />
                  {(s.factSources ?? []).slice(0, 1).map((src, j) => (
                    <a
                      key={j}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[9px] font-bold uppercase text-gray underline decoration-gray/30 hover:text-green"
                    >
                      {t.source}
                    </a>
                  ))}
                  {s.sourceUrl && s.sourceUrl !== "#" && !(s.factSources ?? []).length && (
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
                {s.translated && s.textOrig && s.textOrig !== s.text && (
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-gray">
                    {s.textOrig}
                  </p>
                )}
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
  lastAnalysis,
  onAnalyze,
}: {
  lang: Lang;
  initialName: string;
  lastAnalysis?: LastAnalysis;
  onAnalyze: () => void;
}) {
  const t = STR[lang];
  const [query, setQuery] = useState(initialName);
  const [active, setActive] = useState(initialName);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<SectorKey | null>(null);
  // charts reflect the last verification; hide once the user searches someone else
  const [showCharts, setShowCharts] = useState(!!lastAnalysis);

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
          setActiveSector(data.sectors?.[0]?.key ?? null);
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

  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lang]);

  const submit = () => {
    setShowCharts(false); // a fresh search isn't "this verification"
    setActive(query);
  };

  const sel = profile?.sectors.find((s) => s.key === activeSector) ?? null;

  return (
    <section className="min-h-[80vh] border-b border-line bg-surface p-8 md:p-12 lg:p-20">
      <div className="mx-auto max-w-6xl">
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
              <div className="col-span-2 flex items-center gap-4 border-2 border-line bg-surface px-6 py-4 shadow-sharp-sm md:col-span-1">
                <PoliticianAvatar name={profile.politician} size={44} />
                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
                    {t.subject}
                  </p>
                  <p className="text-base font-black uppercase leading-tight tracking-tight text-ink">
                    {profile.politician}
                  </p>
                </div>
              </div>
            </div>

            {/* this-verification charts */}
            {showCharts && lastAnalysis && (
              <div className="mt-8 border-2 border-line bg-slate/20 p-6 shadow-sharp-sm">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                  {t.verifyResult}
                </p>
                <p className="mt-1 mb-6 font-mono text-[10px] leading-relaxed text-gray">
                  {t.verifyDesc}
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="border-2 border-line bg-surface p-5">
                    <div className="mb-3 flex items-end justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-blue">
                        {t.consistency}
                      </h4>
                      <span className="font-mono text-4xl font-black leading-none text-ink">
                        {lastAnalysis.consistencyScore}%
                      </span>
                    </div>
                    <SegBar pct={lastAnalysis.consistencyScore} color="blue" />
                    <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-wider text-gray/70">
                      {t.consistencyHint}
                    </p>
                  </div>
                  <div className="border-2 border-line bg-surface p-5">
                    <div className="mb-3 flex items-end justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-green">
                        {t.factuality}
                      </h4>
                      <span className="font-mono text-4xl font-black leading-none text-ink">
                        {lastAnalysis.factStatChecked === 0
                          ? "—"
                          : `${lastAnalysis.factualityScore}%`}
                      </span>
                    </div>
                    <SegBar
                      pct={
                        lastAnalysis.factStatChecked === 0
                          ? 0
                          : lastAnalysis.factualityScore
                      }
                      color="green"
                    />
                    <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-wider text-gray/70">
                      {lastAnalysis.factStatChecked === 0
                        ? t.noStatClaim
                        : `${t.factualityHint} (${lastAnalysis.factStatChecked})`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* category tab bar */}
            <div className="mt-10 flex flex-wrap gap-2">
              {profile.sectors.map((sec) => {
                const meta = SECTOR_META[sec.key];
                const on = sec.key === activeSector;
                return (
                  <button
                    key={sec.key}
                    onClick={() => setActiveSector(sec.key)}
                    className={`flex items-center gap-2 border-2 px-4 py-3 transition-all ${
                      on
                        ? `bg-${meta.color} border-${meta.color} text-white shadow-sharp-sm`
                        : "border-line bg-surface text-ink hover:bg-slate/40"
                    }`}
                  >
                    <i className={`ti ${meta.icon} text-lg`} />
                    <span className="text-xs font-black uppercase tracking-tight">
                      {lang === "ko" ? meta.ko : meta.en}
                    </span>
                    <span
                      className={`ml-1 font-mono text-xs font-black ${
                        on ? "text-white" : "text-gray"
                      }`}
                    >
                      {sec.reversalCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* selected sector panel */}
            {sel ? (
              <div className="mt-4 border-2 border-line bg-surface shadow-sharp-sm">
                <div className="flex items-center gap-4 border-b border-line p-5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center bg-${
                      SECTOR_META[sel.key].color
                    } text-white`}
                  >
                    <i className={`ti ${SECTOR_META[sel.key].icon} text-2xl`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black uppercase tracking-tight text-ink">
                      {lang === "ko" ? SECTOR_META[sel.key].ko : SECTOR_META[sel.key].en}
                    </h3>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
                      {sel.statementCount} {t.statements}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-4xl font-black leading-none text-ink">
                      {sel.reversalCount}
                    </span>
                    <p className="font-mono text-[9px] font-bold uppercase text-gray">
                      {t.reversals}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 p-5">
                  {sel.topics.map((topic, i) => (
                    <TopicItem
                      key={topic.topic + i}
                      topic={topic}
                      t={t}
                      color={SECTOR_META[sel.key].color}
                      defaultOpen={i === 0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 border-2 border-dashed border-line p-12 text-center font-mono text-xs text-gray">
                {t.pickSector}
              </div>
            )}

            <div className="mt-16 flex justify-center">
              <button
                onClick={onAnalyze}
                className="btn-secondary px-8 py-3 text-[10px] shadow-sharp-sm"
              >
                <i className="ti ti-file-text mr-2" />
                {lang === "ko" ? "대본으로 직접 검증하기" : "Verify a transcript instead"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
