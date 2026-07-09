"use client";

import { useState, useEffect, useRef } from "react";
import ProfileDashboard from "./ProfileDashboard";
import type {
  StatementResult,
  ConsistencyResult,
  FactCheckResult,
  FactualityStatus,
  ConsistencyStatus,
} from "@/lib/types";

type Lang = "ko" | "en";
type Theme = "light" | "dark";

// Names must match the `politician` field in data/statements.json exactly for
// Axis 1 (self-consistency) to find that person's past statements.
const POLITICIAN_OPTIONS = ["이재명", "Emmanuel Macron", "Donald Trump"];

// Verified working demo lines (used when the transcript box is left empty):
// line 1 -> contradicts Trump's on-record NATO/"obsolete" era statements,
// line 2 -> a checkable statistical claim for Axis 02.
const SAMPLE_TRANSCRIPT =
  "NATO is essential and I have always fully supported our NATO allies.\nThe United States has a 60 billion dollar trade deficit with Mexico.";

// Header "real-time activity" ticker (stylized code tokens — same in both languages).
const TICKER =
  "[ANALYZING] LEE_J.M. HOUSING_POLICY // [VERIFIED] MACRON EU_SPEECH // [ALERT] CONTRADICTION_DETECTED // [LIVE] TWO-AXIS VERIFICATION";

// --- i18n dictionary (prose only; UPPER_SNAKE code tokens stay as-is) ---

const STR = {
  en: {
    brandTitle: "Politrace",
    navConsistency: "Self-Consistency",
    navFactuality: "Factuality",
    login: "Login",
    methodology: "Methodology",
    publicApi: "Public API",
    statusLabel: "Status",
    uploadTitle: "Video · Audio · Transcript File",
    uploadDesc:
      "Drop a video/audio clip or a transcript (.txt / .srt / .docx). Text transcripts load straight in; video/audio STT is coming soon.",
    uploadBtn: "Select File",
    urlBoxTitle: "YouTube Link",
    previewLabel: "Extracted transcript (editable)",
    verifyKicker: "AXIS_02 // LIVE_VERIFY",
    heroTitle: ["Verification", "Through", "Precision"],
    heroPre:
      "We verify political statements instead of attacking them. The system extracts claims from broadcast footage, then separates ",
    heroTerm1: "self-consistency",
    heroMid: " from ",
    heroTerm2: "factual accuracy",
    heroPost:
      " using the speaker's past statements and authoritative sources.",
    heroStart: "Start Verification",
    homeKicker: "[ SELECT_MODE // TRACK_RECORD_OR_LIVE_VERIFY ]",
    homeTitle: "Where do you want to start?",
    homeSubtitle: "Trace a politician's record, or verify fresh footage.",
    pathTrackTitle: "Track a Politician",
    pathTrackDesc:
      "Search a name and see their statements mapped by sector, with a running count of position reversals over time.",
    pathTrackCta: "Open Track Record",
    presetLabel: "Quick pick",
    pathVerifyTitle: "Verify New Footage",
    profileLoad1: "Loading statement archive for the target...",
    profileLoad2: "Grouping statements by policy sector...",
    profileLoad3: "Counting position reversals along each timeline...",
    profileLoad4: "Rendering the track-record dashboard...",
    tracing: "Tracing",
    sampleClaim: "A spoken line from a broadcast transcript.",
    consistencyAxis: "Consistency Axis",
    consistencyAxisDesc: "Cross-checks against historical statement data",
    factualityAxis: "Factuality Axis",
    factualityAxisDesc: "Verifies facts against official and external sources",
    urlPlaceholder: "Paste a YouTube URL (speech, debate, press conference)...",
    fetchBtn: "Fetch Transcript",
    fetching: "Fetching transcript...",
    urlHint: "Captions are pulled automatically — no manual transcript needed.",
    textareaPlaceholder:
      "Enter the transcript to verify... (one statement per line). Leave empty to load a verified demo.",
    targetPolitician: "Target_Politician",
    searchPlaceholder: "Search politician...",
    noPresetMatch:
      "No preset match. This name is used as a custom target (Axis 01 needs it in the statement DB).",
    execute: "Execute_Process",
    log1: "Parsing transcript into discrete spoken lines...",
    log2: (n: number) =>
      `Matching ${n} claim(s) against the historical statement database...`,
    log3: "Running live web search + official statistics lookup (Axis 02)...",
    log4: "Generating final analysis report with AI reasoning...",
    pipeline: "Verification Pipeline",
    footerSub: "Media Hackathon 2026 // Two-Axis Verifier",
  },
  ko: {
    brandTitle: "Politrace",
    navConsistency: "자기 일관성",
    navFactuality: "사실성",
    login: "로그인",
    methodology: "방법론",
    publicApi: "공개 API",
    statusLabel: "상태",
    uploadTitle: "영상 · 음성 · 대본 파일",
    uploadDesc:
      "영상/음성 클립이나 대본 파일(.txt / .srt / .docx)을 올리세요. 텍스트 대본은 바로 로드되고, 영상/음성 STT는 곧 지원됩니다.",
    uploadBtn: "파일 선택",
    urlBoxTitle: "유튜브 링크",
    previewLabel: "추출된 대본 (수정 가능)",
    verifyKicker: "AXIS_02 // 실시간 검증",
    heroTitle: ["정치 발언을", "정밀하게", "검증합니다"],
    heroPre:
      "우리는 정치 발언을 공격하는 대신 검증합니다. 방송 영상에서 발언을 추출한 뒤, 발화자의 과거 발언과 공신력 있는 자료를 근거로 ",
    heroTerm1: "자기 일관성",
    heroMid: "과 ",
    heroTerm2: "사실 정확성",
    heroPost: "을 분리해 판정합니다.",
    heroStart: "검증 시작",
    homeKicker: "[ 모드 선택 // 행적추적 또는 실시간검증 ]",
    homeTitle: "어디서 시작할까요?",
    homeSubtitle: "정치인의 행적을 추적하거나, 새 영상을 검증하세요.",
    pathTrackTitle: "인물 행적 추적",
    pathTrackDesc:
      "이름을 검색하면 그 사람의 발언을 섹터별로 정리하고, 시간에 따른 입장 번복 횟수를 집계해 보여줍니다.",
    pathTrackCta: "행적 열기",
    presetLabel: "바로가기",
    pathVerifyTitle: "새 영상·대본 검증",
    profileLoad1: "대상 인물의 발언 아카이브 로딩 중...",
    profileLoad2: "발언을 정책 섹터별로 분류 중...",
    profileLoad3: "각 타임라인의 입장 번복 횟수 집계 중...",
    profileLoad4: "행적 대시보드 렌더링 중...",
    tracing: "추적 중",
    sampleClaim: "방송 대본에서 추출한 한 문장의 발언.",
    consistencyAxis: "일관성 축",
    consistencyAxisDesc: "과거 발언 데이터와 교차 대조",
    factualityAxis: "사실성 축",
    factualityAxisDesc: "공식·외부 출처로 사실 검증",
    urlPlaceholder: "유튜브 URL 붙여넣기 (연설·토론·기자회견)...",
    fetchBtn: "대본 가져오기",
    fetching: "대본 가져오는 중...",
    urlHint: "자막을 자동으로 가져옵니다 — 대본을 직접 붙여넣을 필요 없어요.",
    textareaPlaceholder:
      "검증할 대본을 입력하세요... (한 줄에 한 발언). 비워두면 검증된 데모가 로드됩니다.",
    targetPolitician: "Target_Politician",
    searchPlaceholder: "정치인 검색...",
    noPresetMatch:
      "사전 목록에 없음. 이 이름은 커스텀 대상으로 사용됩니다 (Axis 01은 발언 DB에 있어야 작동).",
    execute: "Execute_Process",
    log1: "대본을 개별 발언 단위로 분해 중...",
    log2: (n: number) => `발언 ${n}개를 과거 발언 DB와 대조 중...`,
    log3: "실시간 웹 검색 + 공식 통계 조회 중 (Axis 02)...",
    log4: "AI 추론으로 최종 분석 리포트 생성 중...",
    pipeline: "검증 파이프라인",
    footerSub: "Media Hackathon 2026 // Two-Axis Verifier",
  },
};

type Dict = typeof STR.en;

// --- API wiring ---

interface Analysis {
  results: StatementResult[];
  consistencyScore: number;
  factualityScore: number;
  breakdown: {
    total: number;
    contradictions: number;
    falseClaims: number;
    unverifiable: number;
    verified: number;
  };
  notice?: string;
}

// A single analysis pass covers at most this many lines. Long transcripts (e.g. a
// full speech) would overflow the model's output and produce truncated JSON, so we
// cap here and tell the user to trim to the part they care about.
const MAX_ANALYZE_LINES = 10;

async function runAnalysis(
  politician: string,
  transcript: string,
  lang: Lang,
  asOf: string
): Promise<Analysis> {
  const allLines = transcript
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  let lines: { text: string }[];
  let notice: string | undefined;

  if (allLines.length > MAX_ANALYZE_LINES) {
    // Long transcript: don't blindly take the first N (those are usually
    // greetings/intro). Let the LLM pick the substantive statements this
    // politician actually made (also filters out other speakers in debates).
    try {
      const ex = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          politician,
          lang,
          max: MAX_ANALYZE_LINES,
        }),
      }).then((r) => r.json());
      const picked: string[] = (ex.statements ?? []).slice(0, MAX_ANALYZE_LINES);
      if (picked.length) {
        lines = picked.map((text) => ({ text }));
        notice =
          lang === "ko"
            ? `긴 대본에서 ${politician}의 핵심 발언 ${lines.length}개를 자동으로 추려 분석했습니다.`
            : `Auto-selected ${lines.length} key statements by ${politician} from the long transcript.`;
      } else {
        lines = allLines.slice(0, MAX_ANALYZE_LINES).map((text) => ({ text }));
      }
    } catch {
      lines = allLines.slice(0, MAX_ANALYZE_LINES).map((text) => ({ text }));
    }
  } else {
    lines = allLines.map((text) => ({ text }));
  }

  const [aRes, fRes] = await Promise.all([
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ politician, lines, lang }),
    }).then((r) => r.json() as Promise<ConsistencyResult & { error?: string }>),
    fetch("/api/factcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // asOf = the date the statement was made; fact-check is judged as of then.
      body: JSON.stringify({ lines, lang, asOf }),
    }).then((r) => r.json() as Promise<FactCheckResult & { error?: string }>),
  ]);

  if ((aRes as any).error) throw new Error((aRes as any).error);
  if ((fRes as any).error) throw new Error((fRes as any).error);

  const verdicts = aRes.verdicts ?? [];
  const facts = fRes.facts ?? [];

  const results: StatementResult[] = lines.map((l, i) => {
    const v = verdicts[i];
    const f = facts[i];

    const isContra = !!v?.isContradiction;
    const consistency = {
      status: (isContra ? "CONTRADICTION" : "CONSISTENT") as ConsistencyStatus,
      label: isContra ? "Potential Contradiction" : "Consistent",
      reason: v?.reason ?? "",
      confidence: v?.confidence ?? 0,
      pastStatement:
        isContra && v?.pastStatement
          ? {
              text: v.pastStatement,
              textTranslation: v.pastStatementTranslation || undefined,
              date: v.pastDate ?? "",
              sourceTitle: "Historical statement DB",
              sourceUrl: v.pastSourceUrl || "#",
            }
          : undefined,
    };

    const isClaim = !!f?.isFactualClaim;
    const verdict: FactualityStatus = isClaim
      ? (f!.verdict as FactualityStatus)
      : "NOT_FACTUAL";
    const srcType = (f?.sources ?? []).some((s) => /kosis/i.test(s.url))
      ? "KOSIS"
      : "WEB";
    const factuality = {
      isFactualClaim: isClaim,
      verdict,
      label: verdict,
      reason: f?.reason ?? "",
      referencePeriod: f?.referencePeriod || undefined,
      currentNote: f?.currentNote || undefined,
      sourceType: isClaim ? (srcType as "KOSIS" | "WEB") : undefined,
      confidence: f?.confidence ?? 0,
      sources: f?.sources ?? [],
    };

    return {
      id: String(i + 1),
      timestamp: `CLAIM_${String(i + 1).padStart(2, "0")}`,
      speaker: politician,
      line: l.text,
      lineTranslation: v?.lineTranslation || undefined,
      consistency,
      factuality,
    };
  });

  return {
    results,
    consistencyScore: aRes.consistencyScore ?? 0,
    factualityScore: fRes.accuracyScore ?? 0,
    breakdown: {
      total: results.length,
      contradictions: results.filter(
        (r) => r.consistency.status === "CONTRADICTION"
      ).length,
      falseClaims: results.filter((r) => r.factuality.verdict === "FALSE")
        .length,
      unverifiable: results.filter(
        (r) => r.factuality.verdict === "UNVERIFIABLE"
      ).length,
      verified: results.filter((r) => r.factuality.verdict === "TRUE").length,
    },
    notice,
  };
}

// --- Main Page Sections ---

const Header = ({
  t,
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onHome,
}: {
  t: Dict;
  lang: Lang;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onHome: () => void;
}) => (
  <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-sm">
    <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
      <div onClick={onHome} className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-10 w-10 items-center justify-center bg-accent text-accentfg shadow-sharp-sm">
          <i className="ti ti-git-merge text-2xl" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tighter leading-none">
            {t.brandTitle}
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase text-gray font-bold tracking-widest">
            Contradiction_Detector_v1.0
          </p>
        </div>
      </div>

      {/* Center: real-time activity ticker + nav (adopted from teammate frontend) */}
      <nav className="hidden lg:flex flex-1 items-center justify-center gap-6 px-6">
        <div className="relative h-4 w-64 overflow-hidden bg-slate/50 px-2">
          <div className="absolute whitespace-nowrap animate-marquee font-mono text-[9px] font-bold uppercase text-ink/70">
            {TICKER}
          </div>
        </div>
        <a
          href="#"
          className="text-[10px] font-black uppercase tracking-widest hover:text-blue transition-colors"
        >
          {t.methodology}
        </a>
        <a
          href="#"
          className="text-[10px] font-black uppercase tracking-widest hover:text-blue transition-colors"
        >
          {t.publicApi}
        </a>
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase text-gray">
          <span>
            {t.statusLabel}: <span className="text-green font-bold">STABLE</span>
          </span>
          <div className="h-2 w-2 bg-green shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
        </div>
        <button
          onClick={onToggleLang}
          className="flex items-center gap-2 border border-line px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate transition-colors"
          title="Toggle language"
        >
          <i className="ti ti-language text-sm" />
          {lang === "ko" ? "한국어" : "EN"}
        </button>
        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center border border-line hover:bg-slate transition-colors"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <i className={`ti ti-${theme === "dark" ? "sun" : "moon"} text-base`} />
        </button>
        <button className="hidden sm:block bg-accent px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-accentfg hover:bg-blue hover:text-white transition-colors">
          {t.login}
        </button>
      </div>
    </div>
  </header>
);

const Hero = ({ t, onStart }: { t: Dict; onStart: () => void }) => (
  <section className="grid grid-cols-1 border-b border-line lg:grid-cols-2">
    <div className="flex flex-col justify-center border-r border-line bg-surface p-12 lg:p-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue/5 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative z-10">
        <div className="mb-8 inline-block border border-line px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase">
          [ SYSTEM_LEVEL: PUBLIC_VERIFICATION_DESK ]
        </div>
        <h2 className="hero-title mb-8 text-7xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase">
          {t.heroTitle[0]}
          <br />
          <span className="text-blue">{t.heroTitle[1]}</span>
          <br />
          {t.heroTitle[2]}
        </h2>
        <p className="mb-12 max-w-lg text-lg md:text-xl leading-relaxed text-gray font-medium">
          {t.heroPre}
          <span className="text-ink font-bold underline decoration-blue decoration-2 underline-offset-4">
            {t.heroTerm1}
          </span>
          {t.heroMid}
          <span className="text-ink font-bold underline decoration-green decoration-2 underline-offset-4">
            {t.heroTerm2}
          </span>
          {t.heroPost}
        </p>
        <div className="flex flex-wrap gap-4">
          <button onClick={onStart} className="btn-primary">
            {t.heroStart}
          </button>
        </div>
      </div>
    </div>

    <div className="relative flex items-center justify-center bg-slate p-12 overflow-hidden">
      <div className="blueprint-grid absolute inset-0" />
      <div className="relative z-10 w-full max-w-xl">
        <div className="relative border-2 border-line bg-surface p-12 shadow-sharp transition-transform hover:-translate-x-1 hover:-translate-y-1">
          <div className="absolute -left-4 -top-4 bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase text-accentfg tracking-widest">
            TOPOLOGY_V2
          </div>
          <div className="absolute -right-4 -bottom-4 bg-blue px-3 py-1 font-mono text-[10px] font-bold uppercase text-white tracking-widest">
            AXIS_01 // AXIS_02
          </div>

          <div className="relative mb-20 text-center">
            <div className="relative inline-block border-2 border-line bg-surface p-8 shadow-sharp">
              <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
                Target_Input_Claim
              </p>
              <p className="text-lg md:text-xl font-black leading-tight tracking-tight">
                &ldquo;{t.sampleClaim}&rdquo;
              </p>
            </div>
            <div className="absolute left-1/2 top-full h-16 w-[2px] -translate-x-1/2 bg-ink/20" />
          </div>

          <div className="relative grid grid-cols-2 gap-12 pt-8">
            <div className="absolute left-1/2 top-0 h-[1px] w-full -translate-x-1/2 bg-ink/20" />
            <div className="relative flex flex-col items-end space-y-4 text-right">
              <div className="absolute -right-[6.5px] -top-1.5 h-3 w-3 bg-blue border border-surface" />
              <i className="ti ti-history text-4xl text-blue" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue">
                  {t.consistencyAxis}
                </h3>
                <p className="font-mono text-[9px] font-bold uppercase text-gray mt-1 leading-relaxed">
                  {t.consistencyAxisDesc}
                </p>
              </div>
            </div>
            <div className="relative flex flex-col items-start space-y-4 text-left">
              <div className="absolute -left-[6.5px] -top-1.5 h-3 w-3 bg-green border border-surface" />
              <i className="ti ti-database-check text-4xl text-green" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-green">
                  {t.factualityAxis}
                </h3>
                <p className="font-mono text-[9px] font-bold uppercase text-gray mt-1 leading-relaxed">
                  {t.factualityAxisDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const AnalysisStepper = ({
  t,
  progress,
  lineCount,
}: {
  t: Dict;
  progress: number;
  lineCount: number;
}) => {
  const [logs, setLogs] = useState<
    { msg: string; status: string; active?: boolean }[]
  >([]);

  useEffect(() => {
    const fullLogs = [
      { msg: t.log1, status: "DONE" },
      { msg: t.log2(lineCount), status: "PROCESSING", active: true },
      { msg: t.log3, status: "WAITING" },
      { msg: t.log4, status: "WAITING" },
    ];

    const interval = setInterval(() => {
      setLogs((prev) => {
        if (prev.length < fullLogs.length) {
          const nextIndex = prev.length;
          return fullLogs.slice(0, nextIndex + 1).map((log, i) => ({
            ...log,
            status:
              i < nextIndex ? "DONE" : i === nextIndex ? "PROCESSING" : "WAITING",
            active: i === nextIndex,
          }));
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineCount]);

  return (
    <section className="bg-slate border-b border-line p-12 lg:p-24 min-h-[700px] flex items-center">
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden border-2 border-line bg-surface shadow-sharp">
          <div className="flex items-center justify-between bg-accent p-4 text-accentfg">
            <div className="flex items-center gap-3">
              <i className="ti ti-terminal text-xl" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
                System_Analyzer_Core
              </span>
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-3 border border-accentfg" />
              <div className="h-3 w-3 bg-accentfg" />
            </div>
          </div>

          <div className="h-[320px] space-y-4 overflow-y-auto p-8 font-mono text-sm bg-ink/[0.02]">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 transition-all duration-300 ${
                  log.active
                    ? "border-l-4 border-orange bg-orange/5 pl-4 py-2"
                    : "text-gray/80"
                }`}
              >
                <span
                  className={`flex-grow ${
                    log.active ? "text-ink font-bold" : "text-ink/60"
                  }`}
                >
                  {log.msg}
                </span>
                <span
                  className={`font-bold text-[10px] ${
                    log.status === "DONE"
                      ? "text-green"
                      : log.status === "PROCESSING"
                      ? "text-orange animate-pulse"
                      : "text-gray/20"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-line bg-slate p-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-ink">
                  {t.pipeline}
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold text-gray uppercase tracking-widest">
                  AXIS_01_HST // AXIS_02_FACT
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-black text-ink">
                  {progress}%
                </p>
              </div>
            </div>
            <div className="flex h-12 w-full gap-1 border-2 border-line bg-surface p-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-grow ${
                    i < progress / 5 ? "bg-accent" : "bg-accent/10"
                  } transition-all duration-300`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Staged "analysis" animation played while the (instant) profile loads, purely for
// the demo's dramatic effect. Auto-advances then calls onDone.
const ProfileLoader = ({
  t,
  name,
  onDone,
}: {
  t: Dict;
  name: string;
  onDone: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const lines = [t.profileLoad1, t.profileLoad2, t.profileLoad3, t.profileLoad4];

  useEffect(() => {
    const p = setInterval(
      () => setProgress((v) => (v < 100 ? v + 4 : v)),
      90
    );
    const s = setInterval(
      () => setStage((v) => Math.min(v + 1, lines.length - 1)),
      560
    );
    const done = setTimeout(onDone, 2500);
    return () => {
      clearInterval(p);
      clearInterval(s);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-slate border-b border-line p-12 lg:p-24 min-h-[700px] flex items-center">
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden border-2 border-line bg-surface shadow-sharp">
          <div className="flex items-center justify-between bg-accent p-4 text-accentfg">
            <div className="flex items-center gap-3">
              <i className="ti ti-terminal text-xl" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
                {t.tracing}: {name}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-3 border border-accentfg" />
              <div className="h-3 w-3 bg-accentfg" />
            </div>
          </div>

          <div className="h-[320px] space-y-4 overflow-y-auto p-8 font-mono text-sm bg-ink/[0.02]">
            {lines.slice(0, stage + 1).map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 transition-all duration-300 ${
                  i === stage
                    ? "border-l-4 border-orange bg-orange/5 pl-4 py-2"
                    : "text-gray/80"
                }`}
              >
                <span
                  className={`flex-grow ${
                    i === stage ? "text-ink font-bold" : "text-ink/60"
                  }`}
                >
                  {msg}
                </span>
                <span
                  className={`font-bold text-[10px] ${
                    i < stage
                      ? "text-green"
                      : "text-orange animate-pulse"
                  }`}
                >
                  {i < stage ? "DONE" : "PROCESSING"}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-line bg-slate p-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-ink">
                  {t.pipeline}
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold text-gray uppercase tracking-widest">
                  AXIS_01_TRACK_RECORD
                </p>
              </div>
              <p className="font-mono text-2xl font-black text-ink">{progress}%</p>
            </div>
            <div className="flex h-12 w-full gap-1 border-2 border-line bg-surface p-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-grow ${
                    i < progress / 5 ? "bg-accent" : "bg-accent/10"
                  } transition-all duration-300`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Main Component ---

export default function Home() {
  const [step, setStep] = useState<
    "start" | "home" | "profileLoading" | "profile" | "analysis"
  >("start");
  const [profileName, setProfileName] = useState("Donald Trump");
  const [profileQuery, setProfileQuery] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [targetPolitician, setTargetPolitician] = useState("Donald Trump");
  const [politicianQuery, setPoliticianQuery] = useState("Donald Trump");
  const [isPoliticianSearchOpen, setIsPoliticianSearchOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const t = STR[lang];

  // Sync persisted preferences on mount + whenever they change.
  useEffect(() => {
    const l = (localStorage.getItem("lang") as Lang) || "en";
    const th = (localStorage.getItem("theme") as Theme) || "light";
    setLang(l);
    setTheme(th);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("lang-ko", lang === "ko");
    localStorage.setItem("lang", lang);
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const runRef = useRef<{
    politician: string;
    transcript: string;
    lang: Lang;
    asOf: string;
    sourceUrl: string;
  }>({
    politician: "",
    transcript: "",
    lang: "ko",
    asOf: "",
    sourceUrl: "",
  });

  const filteredPoliticians = POLITICIAN_OPTIONS.filter((name) =>
    name.toLowerCase().includes(politicianQuery.trim().toLowerCase())
  );

  const activeLineCount = runRef.current.transcript
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean).length;

  const handleStartAnalysis = () => {
    const effectiveTranscript = transcript.trim() || SAMPLE_TRANSCRIPT;
    if (!transcript.trim()) setTranscript(SAMPLE_TRANSCRIPT);
    runRef.current = {
      politician: targetPolitician,
      transcript: effectiveTranscript,
      lang,
      // Manual entry: judged as of today. A scraper would supply the video date.
      asOf: new Date().toISOString().slice(0, 10),
      sourceUrl: sourceUrl.trim(),
    };
    setError(null);
    setAnalysis(null);
    setProgress(0);
    setStep("analysis");
  };

  useEffect(() => {
    if (step !== "analysis") return;
    let cancelled = false;

    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 3 : p));
    }, 200);

    runAnalysis(
      runRef.current.politician,
      runRef.current.transcript,
      runRef.current.lang,
      runRef.current.asOf
    )
      .then(async (data) => {
        if (cancelled) return;
        clearInterval(interval);
        setAnalysis(data);
        setProgress(100);
        // Persist the verified statements onto the person's record so they ACCUMULATE
        // on the track record (and stay there next time it's opened).
        try {
          const statements = data.results.map((r) => ({
            text: r.line,
            isContradiction: r.consistency.status === "CONTRADICTION",
            factVerdict: r.factuality.verdict,
            factSources: r.factuality.sources,
            date: runRef.current.asOf,
          }));
          if (statements.length) {
            await fetch("/api/add-statements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                politician: runRef.current.politician,
                sourceUrl: runRef.current.sourceUrl,
                statements,
              }),
            });
          }
        } catch {
          /* non-fatal: still show the track record */
        }
        if (cancelled) return;
        setProfileName(runRef.current.politician);
        setTimeout(() => {
          if (cancelled) return;
          setStep("profile");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 500);
      })
      .catch((err) => {
        if (cancelled) return;
        clearInterval(interval);
        setError(err?.message ?? "Analysis failed");
        setStep("home");
      });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const distillTranscript = async (raw: string): Promise<string> => {
    const count = raw.split("\n").map((l) => l.trim()).filter(Boolean).length;
    if (count <= MAX_ANALYZE_LINES) return raw;
    try {
      const ex = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: raw,
          politician: targetPolitician,
          lang,
          max: MAX_ANALYZE_LINES,
        }),
      }).then((r) => r.json());
      const picked: string[] = (ex.statements ?? []).slice(0, MAX_ANALYZE_LINES);
      return picked.length ? picked.join("\n") : raw;
    } catch {
      return raw;
    }
  };

  // File upload: text/subtitle files load straight into the transcript box.
  // Video/audio would need STT (not wired) — so we guide the user instead.
  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isText =
      /\.(txt|srt|vtt|md)$/i.test(file.name) || file.type.startsWith("text");
    if (!isText) {
      setError(
        lang === "ko"
          ? "영상/음성 STT는 아직 연결 전이에요 — .txt/.srt 대본을 올리거나 텍스트를 붙여넣어 주세요."
          : "Video/audio STT is not wired yet — upload a .txt/.srt transcript or paste text."
      );
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const cleaned = String(reader.result || "")
        .replace(/^WEBVTT.*$/gm, "")
        .replace(/^\d+\s*$/gm, "") // SRT cue numbers
        .replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->.*$/gm, "") // timestamps
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");
      setError(null);
      setFetching(true);
      try {
        setTranscript(await distillTranscript(cleaned));
      } finally {
        setFetching(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Paste a YouTube URL -> scraper pulls the captions -> fill the transcript box.
  const fetchFromUrl = async () => {
    if (!sourceUrl.trim() || fetching) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim(), lang }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Scrape failed");
      // Distill to the target politician's key statements before showing the box.
      setTranscript(await distillTranscript(data.transcript || ""));
    } catch (err: any) {
      setError(err?.message ?? "Scrape failed");
    } finally {
      setFetching(false);
    }
  };

  // Track-record path: from the home search box / presets to the profile dashboard.
  const startTrack = (nm: string) => {
    const q = nm.trim();
    if (!q) return;
    setProfileName(q);
    setStep("profileLoading");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen blueprint-grid">
      <Header
        t={t}
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
        onToggleTheme={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
        onHome={() => {
          setStep("start");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {step === "start" && (
        <Hero
          t={t}
          onStart={() =>
            document
              .getElementById("choice")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
      )}

      {(step === "start" || step === "home") && (
        <section
          id="choice"
          className="scroll-mt-20 border-b border-line bg-surface p-8 md:p-12 lg:p-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 inline-block border border-line px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
              {t.homeKicker}
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
              {t.homeTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-gray font-medium">
              {t.homeSubtitle}
            </p>

            {error && (
              <div className="mt-8 border-2 border-red bg-red/5 p-4 font-mono text-xs text-red">
                ERROR: {error}
              </div>
            )}

            {/* --- Path A: track a politician (full width) --- */}
            <div className="mt-10 border-2 border-line bg-surface p-6 md:p-8 shadow-sharp-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-blue text-white">
                  <i className="ti ti-history text-3xl" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-ink">
                    {t.pathTrackTitle}
                  </h3>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-blue">
                    AXIS_01 // TRACK_RECORD
                  </p>
                </div>
              </div>
              <p className="mb-6 max-w-3xl text-sm leading-relaxed text-gray">
                {t.pathTrackDesc}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 border-2 border-line bg-slate/30 px-4 py-3">
                  <i className="ti ti-search text-lg text-blue" />
                  <input
                    value={profileQuery}
                    onChange={(e) => setProfileQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startTrack(profileQuery)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-transparent text-sm font-black uppercase tracking-wide text-ink outline-none placeholder:text-gray/40"
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={() => startTrack(profileQuery)}
                  className="shrink-0 bg-accent px-8 py-3 text-[11px] font-black uppercase tracking-widest text-accentfg shadow-sharp-sm hover:bg-blue hover:text-white transition-colors"
                >
                  {t.pathTrackCta}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-gray">
                  {t.presetLabel}:
                </span>
                {(lang === "ko"
                  ? ([["트럼프", "트럼프"], ["이재명", "이재명"], ["마크롱", "마크롱"]] as [string, string][])
                  : ([["Trump", "Donald Trump"], ["Lee Jae-myung", "이재명"], ["Macron", "Macron"]] as [string, string][])
                ).map(([label, query]) => (
                  <button
                    key={label}
                    onClick={() => startTrack(query)}
                    className="border border-line px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-slate transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* --- Path B: verify new footage (two input boxes) --- */}
            <div className="mt-10 mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-green text-white">
                <i className="ti ti-file-search text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-ink">
                  {t.pathVerifyTitle}
                </h3>
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-green">
                  {t.verifyKicker}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left box: YouTube URL */}
              <div className="flex flex-col border-2 border-line bg-slate/30 p-6 shadow-sharp-sm">
                <div className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                  <i className="ti ti-brand-youtube text-lg text-red" />
                  {t.urlBoxTitle}
                </div>
                <div className="flex items-center gap-3 border-2 border-line bg-surface px-4 py-3">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchFromUrl()}
                    placeholder={t.urlPlaceholder}
                    className="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-gray/50"
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={fetchFromUrl}
                  disabled={fetching || !sourceUrl.trim()}
                  className="btn-primary mt-4 flex items-center justify-center gap-2 py-3 text-[11px] tracking-[0.2em] disabled:opacity-50"
                >
                  {fetching ? (
                    <>
                      <i className="ti ti-loader-2 animate-spin" />
                      {t.fetching}
                    </>
                  ) : (
                    <>
                      <i className="ti ti-download" />
                      {t.fetchBtn}
                    </>
                  )}
                </button>
                <p className="mt-3 font-mono text-[10px] leading-relaxed text-gray">
                  {t.urlHint}
                </p>
              </div>

              {/* Right box: file upload */}
              <label className="group flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-line bg-slate/30 p-6 text-center shadow-sharp-sm transition-colors hover:bg-slate/60">
                <input
                  type="file"
                  accept=".txt,.srt,.vtt,.md,.docx,video/*,audio/*"
                  className="hidden"
                  onChange={onFilePick}
                />
                <div className="mb-4 flex h-16 w-16 items-center justify-center border-2 border-line transition-transform group-hover:scale-110">
                  <i className="ti ti-file-upload text-3xl text-ink" />
                </div>
                <h4 className="mb-2 text-base font-black uppercase tracking-widest text-ink">
                  {t.uploadTitle}
                </h4>
                <p className="max-w-xs font-mono text-[10px] leading-relaxed text-gray">
                  {t.uploadDesc}
                </p>
                <span className="btn-primary mt-5 py-2 text-[10px] tracking-[0.2em]">
                  {t.uploadBtn}
                </span>
              </label>
            </div>

            {/* transcript preview (fetched / uploaded / manually pasted) */}
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
                {t.previewLabel}
              </p>
              <div className="border-2 border-line p-1 bg-slate/30 shadow-sharp-sm">
                <textarea
                  className="h-40 w-full border border-line bg-surface p-5 font-mono text-sm outline-none resize-none focus:bg-slate/10 transition-colors text-ink"
                  placeholder={t.textareaPlaceholder}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
            </div>

            {/* target politician + execute */}
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="relative flex min-w-[280px] flex-grow items-center gap-4 border-2 border-line bg-surface px-6 py-4">
                <label
                  htmlFor="target-politician"
                  className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-gray"
                >
                  {t.targetPolitician}
                </label>
                <div className="relative min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <i className="ti ti-search text-base text-blue" />
                    <input
                      id="target-politician"
                      type="search"
                      value={politicianQuery}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setPoliticianQuery(nextValue);
                        setTargetPolitician(nextValue.trim());
                        setIsPoliticianSearchOpen(true);
                      }}
                      onFocus={() => setIsPoliticianSearchOpen(true)}
                      onBlur={() => {
                        window.setTimeout(
                          () => setIsPoliticianSearchOpen(false),
                          120
                        );
                      }}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-transparent text-xs font-black uppercase outline-none placeholder:text-gray/40 text-ink"
                      autoComplete="off"
                    />
                  </div>
                  {isPoliticianSearchOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-4 max-h-56 overflow-y-auto border-2 border-line bg-surface shadow-sharp-sm">
                      {filteredPoliticians.length > 0 ? (
                        filteredPoliticians.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setTargetPolitician(name);
                              setPoliticianQuery(name);
                              setIsPoliticianSearchOpen(false);
                            }}
                            className={`flex w-full items-center justify-between border-b border-line/10 px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest transition-colors last:border-b-0 hover:bg-slate ${
                              targetPolitician === name ? "text-blue" : "text-ink"
                            }`}
                          >
                            <span>{name}</span>
                            {targetPolitician === name && (
                              <i className="ti ti-check text-sm" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-widest text-gray">
                          {t.noPresetMatch}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleStartAnalysis}
                className="bg-accent px-12 py-4 font-black uppercase tracking-widest text-accentfg shadow-sharp hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                {t.execute}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "profileLoading" && (
        <ProfileLoader
          t={t}
          name={profileName}
          onDone={() => setStep("profile")}
        />
      )}

      {step === "profile" && (
        <ProfileDashboard
          lang={lang}
          initialName={profileName}
          lastAnalysis={
            analysis
              ? {
                  consistencyScore: analysis.consistencyScore,
                  factualityScore: analysis.factualityScore,
                  breakdown: analysis.breakdown,
                }
              : undefined
          }
          onAnalyze={() => {
            setStep("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}


      {step === "analysis" && (
        <AnalysisStepper t={t} progress={progress} lineCount={activeLineCount} />
      )}


      <footer className="border-t border-line bg-surface px-8 py-16">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-12 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center bg-accent shadow-sharp-sm">
              <i className="ti ti-git-fork text-xl text-accentfg" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-tighter block leading-none">
                Politrace
              </span>
              <span className="font-mono text-[9px] font-bold text-gray uppercase mt-1 tracking-widest">
                {t.footerSub}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-10 font-mono text-[10px] font-bold uppercase text-gray tracking-widest">
            <span className="text-ink">&copy; 2026 Politrace</span>
            <span>{t.navConsistency}</span>
            <span>{t.navFactuality}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
