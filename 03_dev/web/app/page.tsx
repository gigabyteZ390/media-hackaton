"use client";

import { useState, useEffect, useRef } from "react";
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
// line 1 -> a real 사드 contradiction, line 2 -> a false statistical claim.
const SAMPLE_TRANSCRIPT =
  "굳건한 한미동맹을 토대로 한미일 안보협력을 강화하겠다. 사드 철회는 추진하지 않는다.\n한국의 청년 실업률은 30퍼센트가 넘는다.";

// Header "real-time activity" ticker (stylized code tokens — same in both languages).
const TICKER =
  "[ANALYZING] LEE_J.M. HOUSING_POLICY // [VERIFIED] MACRON EU_SPEECH // [ALERT] CONTRADICTION_DETECTED // [LIVE] TWO-AXIS VERIFICATION";

// --- i18n dictionary (prose only; UPPER_SNAKE code tokens stay as-is) ---

const STR = {
  en: {
    brandTitle: "Politrace",
    navTwoAxis: "Two-Axis Verification:",
    navConsistency: "Self-Consistency",
    navFactuality: "Factuality",
    engine: "Engine:",
    login: "Login",
    methodology: "Methodology",
    publicApi: "Public API",
    statusLabel: "Status",
    uploadTitle: "Video / Audio Dossier",
    uploadDesc:
      "Drop a broadcast clip or a transcript file (.txt / .srt). Text files load straight into the box; video/audio STT is coming soon.",
    uploadBtn: "Select File",
    pdfReport: "PDF Report",
    heroTitle: ["Verification", "Through", "Precision"],
    heroPre:
      "We verify political statements instead of attacking them. The system extracts claims from broadcast footage, then separates ",
    heroTerm1: "self-consistency",
    heroMid: " from ",
    heroTerm2: "factual accuracy",
    heroPost:
      " using the speaker's past statements and authoritative sources.",
    heroStart: "Start Verification",
    sampleClaim: "A spoken line from a broadcast transcript.",
    consistencyAxis: "Consistency Axis",
    consistencyAxisDesc: "Cross-checks against historical statement data",
    factualityAxis: "Factuality Axis",
    factualityAxisDesc: "Verifies facts against official and external sources",
    intakeTitle: "Evidence Intake",
    manualEntry: "Manual_Entry",
    sourceLink: "Source_Link",
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
    subject: "SUBJECT:",
    dashboard: "Analytical Dashboard",
    exportJson: "Export JSON",
    newAnalysis: "New Analysis",
    consistencyScore: "Consistency Score",
    consistencyScoreDesc:
      "Percentage of lines that do not contradict the speaker's own past statements.",
    factualityScore: "Factuality Score",
    factualityScoreDesc:
      "Percentage of checkable factual claims verified TRUE against authoritative sources.",
    breakdown: "Statement Breakdown",
    totalLines: "Total Lines",
    contradictions: "Contradictions",
    falseClaims: "False Claims",
    unverifiable: "Unverifiable",
    verifiedCorrect: "Verified Correct",
    methodologyTitle: "Final Methodology Disclaimer",
    methodologyBody:
      "AI-based analytical models provide initial verification. Human verification by certified journalists is required for legal or editorial publication. All sources are publicly available.",
    expand: "Expand_Evidence",
    hide: "Hide_Evidence",
    axis01: "Axis 01: Consistency Analysis",
    axis02: "Axis 02: Factuality Analysis",
    detectedConflict: "Detected_Conflicting_Statement:",
    recorded: "RECORDED:",
    viewSource: "VIEW_SOURCE",
    verdict: "Verdict:",
    asOfLabel: "Judged as of",
    currentLabel: "Latest data",
    noPrior:
      "No directly comparable prior statement was found in the historical statement database.",
    statModel: "Statistical_Validation_Model:",
    noOfficialData: "No reliable official data was available for verification.",
    caution:
      "Caution: AI-driven preliminary analysis. Final journalistic verification is mandatory.",
    footerSub: "Media Hackathon 2026 // Two-Axis Verifier",
    cLabel: {
      CONSISTENT: "Consistent",
      CONTRADICTION: "Potential Contradiction",
      INSUFFICIENT_CONTEXT: "Needs Context",
    } as Record<ConsistencyStatus, string>,
    fLabel: {
      TRUE: "Verified",
      FALSE: "False",
      UNVERIFIABLE: "Unverifiable",
      NOT_FACTUAL: "Opinion",
    } as Record<FactualityStatus, string>,
  },
  ko: {
    brandTitle: "Politrace",
    navTwoAxis: "이중 축 검증:",
    navConsistency: "자기 일관성",
    navFactuality: "사실성",
    engine: "엔진:",
    login: "로그인",
    methodology: "방법론",
    publicApi: "공개 API",
    statusLabel: "상태",
    uploadTitle: "영상 / 음성 자료",
    uploadDesc:
      "방송 클립이나 대본 파일(.txt / .srt)을 올리세요. 텍스트 파일은 바로 입력창에 로드되고, 영상/음성 STT는 곧 지원됩니다.",
    uploadBtn: "파일 선택",
    pdfReport: "PDF 리포트",
    heroTitle: ["정치 발언을", "정밀하게", "검증합니다"],
    heroPre:
      "우리는 정치 발언을 공격하는 대신 검증합니다. 방송 영상에서 발언을 추출한 뒤, 발화자의 과거 발언과 공신력 있는 자료를 근거로 ",
    heroTerm1: "자기 일관성",
    heroMid: "과 ",
    heroTerm2: "사실 정확성",
    heroPost: "을 분리해 판정합니다.",
    heroStart: "검증 시작",
    sampleClaim: "방송 대본에서 추출한 한 문장의 발언.",
    consistencyAxis: "일관성 축",
    consistencyAxisDesc: "과거 발언 데이터와 교차 대조",
    factualityAxis: "사실성 축",
    factualityAxisDesc: "공식·외부 출처로 사실 검증",
    intakeTitle: "증거 입력",
    manualEntry: "Manual_Entry",
    sourceLink: "Source_Link",
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
    subject: "대상:",
    dashboard: "분석 대시보드",
    exportJson: "JSON 내보내기",
    newAnalysis: "새 분석",
    consistencyScore: "일관성 점수",
    consistencyScoreDesc:
      "발화자 자신의 과거 발언과 모순되지 않는 발언의 비율.",
    factualityScore: "사실성 점수",
    factualityScoreDesc:
      "검증 가능한 사실 주장 중 공신력 있는 출처로 사실로 확인된 비율.",
    breakdown: "발언 분석 내역",
    totalLines: "전체 발언",
    contradictions: "모순",
    falseClaims: "거짓 주장",
    unverifiable: "검증 불가",
    verifiedCorrect: "사실 확인",
    methodologyTitle: "최종 방법론 고지",
    methodologyBody:
      "AI 분석 모델은 1차 검증을 제공합니다. 법적·편집상 공표를 위해서는 공인 기자의 인간 검증이 필요합니다. 모든 출처는 공개 자료입니다.",
    expand: "증거 펼치기",
    hide: "증거 접기",
    axis01: "Axis 01: 자기 일관성 분석",
    axis02: "Axis 02: 사실성 분석",
    detectedConflict: "감지된 상충 발언:",
    recorded: "기록일:",
    viewSource: "출처 보기",
    verdict: "판정:",
    asOfLabel: "판정 기준 시점",
    currentLabel: "현재 최신 데이터",
    noPrior: "직접 비교할 만한 과거 발언을 DB에서 찾지 못했습니다.",
    statModel: "통계 검증 모델:",
    noOfficialData: "검증에 사용할 신뢰할 수 있는 공식 자료가 없습니다.",
    caution:
      "주의: AI 기반 예비 분석입니다. 최종 저널리즘 검증이 반드시 필요합니다.",
    footerSub: "Media Hackathon 2026 // Two-Axis Verifier",
    cLabel: {
      CONSISTENT: "일관됨",
      CONTRADICTION: "모순 가능성",
      INSUFFICIENT_CONTEXT: "맥락 부족",
    } as Record<ConsistencyStatus, string>,
    fLabel: {
      TRUE: "사실",
      FALSE: "거짓",
      UNVERIFIABLE: "검증 불가",
      NOT_FACTUAL: "의견",
    } as Record<FactualityStatus, string>,
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

// --- Sub-components ---

const Badge = ({
  status,
  label,
  axis,
}: {
  status: string;
  label: string;
  axis: "consistency" | "factuality";
}) => {
  const getColors = () => {
    if (status === "CONTRADICTION" || status === "FALSE")
      return "bg-red text-white";
    if (status === "CONSISTENT" || status === "TRUE")
      return axis === "consistency" ? "bg-blue text-white" : "bg-green text-white";
    if (status === "INSUFFICIENT_CONTEXT" || status === "UNVERIFIABLE")
      return "bg-orange text-white";
    return "bg-surface text-ink border border-line";
  };
  return (
    <div
      className={`${getColors()} border border-line px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap`}
    >
      {label}
    </div>
  );
};

const SegmentedBar = ({
  percentage,
  colorClass,
}: {
  percentage: number;
  colorClass: string;
}) => (
  <div className="mb-6 flex h-8 gap-1">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className={`h-full flex-1 border-r border-surface last:border-none ${
          i < percentage / 10 ? colorClass : "bg-slate/50"
        } transition-colors duration-500`}
        style={{ transitionDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);

const StatementCard = ({
  statement,
  t,
}: {
  statement: StatementResult;
  t: Dict;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { consistency, factuality } = statement;
  const cLabel = t.cLabel[consistency.status];
  const fLabel = t.fLabel[factuality.verdict];

  const getStatusColor = () => {
    if (consistency.status === "CONTRADICTION" || factuality.verdict === "FALSE")
      return "bg-red";
    if (
      consistency.status === "INSUFFICIENT_CONTEXT" ||
      factuality.verdict === "UNVERIFIABLE"
    )
      return "bg-orange";
    return "bg-blue";
  };

  return (
    <article className="border border-line bg-surface transition-all hover:bg-slate/[0.3] group">
      <div className="flex">
        <div className={`w-3 ${getStatusColor()} shrink-0`} />
        <div className="flex-grow p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-4">
              <span className="bg-accent px-3 py-1 font-mono text-xs uppercase text-accentfg">
                {statement.timestamp}
              </span>
              <span className="border border-line px-3 py-1 font-mono text-xs uppercase text-ink/60">
                {statement.speaker}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                status={consistency.status}
                label={cLabel}
                axis="consistency"
              />
              <Badge status={factuality.verdict} label={fLabel} axis="factuality" />
              <div className="border border-line bg-surface px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                CONF: {statement.factuality.confidence.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="max-w-4xl text-xl md:text-2xl font-black leading-tight text-ink">
              &ldquo;{statement.lineTranslation || statement.line}&rdquo;
            </h4>
            {statement.lineTranslation &&
              statement.lineTranslation.trim() !== statement.line.trim() && (
                <p className="mt-2 max-w-4xl font-mono text-xs leading-relaxed text-gray">
                  {statement.line}
                </p>
              )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-mono text-xs text-gray">
                <i className="ti ti-link text-blue" />
                <span>[{factuality.sources.length}_SOURCES]</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-gray">
                <i className="ti ti-history text-blue" />
                <span>[{consistency.pastStatement ? "1" : "0"}_PAST_STMT]</span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-blue transition-colors focus:outline-none"
              aria-expanded={expanded}
            >
              <span>{expanded ? t.hide : t.expand}</span>
              <i
                className={`ti ti-chevron-${
                  expanded ? "up" : "down"
                } text-lg transition-transform duration-300`}
              />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line bg-slate p-8 md:p-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Consistency Panel */}
            <div className="space-y-6">
              <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue">
                <i className="ti ti-git-branch" /> {t.axis01}
              </h5>
              {consistency.pastStatement ? (
                <>
                  <div>
                    <p className="mb-3 font-mono text-[10px] uppercase text-gray">
                      {t.detectedConflict}
                    </p>
                    <div className="relative border border-line bg-surface p-6 text-sm italic leading-relaxed">
                      <i className="ti ti-quote text-4xl text-ink/5 absolute top-2 left-2" />
                      &ldquo;
                      {consistency.pastStatement.textTranslation ||
                        consistency.pastStatement.text}
                      &rdquo;
                      {consistency.pastStatement.textTranslation &&
                        consistency.pastStatement.textTranslation.trim() !==
                          consistency.pastStatement.text.trim() && (
                          <span className="mt-2 block font-mono text-[11px] not-italic text-gray">
                            {consistency.pastStatement.text}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-line/10 pb-2 font-mono text-[10px]">
                    <span>
                      {t.recorded} {consistency.pastStatement.date || "ON_RECORD"}
                    </span>
                    {consistency.pastStatement.sourceUrl &&
                    consistency.pastStatement.sourceUrl !== "#" ? (
                      <a
                        href={consistency.pastStatement.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue underline hover:text-ink"
                      >
                        {t.viewSource}
                      </a>
                    ) : (
                      <span className="text-gray">ARCHIVE_ID: KB-HST-{statement.id}</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="border border-line/10 bg-surface/50 p-6 text-center italic text-gray text-sm">
                  {t.noPrior}
                </div>
              )}
              <div
                className={`border-l-4 p-4 ${
                  consistency.status === "CONTRADICTION"
                    ? "bg-red/5 border-red"
                    : "bg-blue/5 border-blue"
                }`}
              >
                <p className="text-xs leading-relaxed">
                  <span
                    className={`mr-2 font-bold uppercase ${
                      consistency.status === "CONTRADICTION"
                        ? "text-red"
                        : "text-blue"
                    }`}
                  >
                    {t.verdict}
                  </span>
                  {consistency.reason}
                </p>
              </div>
            </div>

            {/* Factuality Panel */}
            <div className="space-y-6">
              <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green">
                <i className="ti ti-database-check" /> {t.axis02}
              </h5>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase text-gray">
                  {t.statModel}
                </p>
                <div className="border border-line bg-surface p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tighter">
                      {factuality.sourceType || "GENERAL"} DATASET
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        factuality.verdict === "FALSE"
                          ? "text-red"
                          : "text-green"
                      }`}
                    >
                      CONF: {factuality.confidence.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex h-3 w-full border border-line/20 bg-slate p-[1px]">
                    <div
                      className={`h-full ${
                        factuality.verdict === "FALSE"
                          ? "w-[8%] bg-red"
                          : factuality.verdict === "TRUE"
                          ? "w-full bg-green"
                          : "w-1/2 bg-orange"
                      }`}
                    />
                  </div>
                  <div className="mt-4 flex justify-between font-mono text-[9px] text-gray uppercase">
                    <span>Verdict: {factuality.verdict}</span>
                    <span>Confidence</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {factuality.sources.length > 0 ? (
                  factuality.sources.map((src, i) => (
                    <div
                      key={i}
                      className="group flex items-center gap-3 font-mono text-[10px]"
                    >
                      <span className="bg-accent px-2 py-[2px] text-accentfg">
                        REF_{String(i + 1).padStart(2, "0")}
                      </span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-gray underline decoration-gray/30 group-hover:text-green transition-colors"
                      >
                        {src.title}
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="border border-line/10 bg-surface/50 p-6 text-center italic text-gray text-sm">
                    {t.noOfficialData}
                  </div>
                )}
              </div>
              <div
                className={`border-l-4 p-4 ${
                  factuality.verdict === "FALSE"
                    ? "bg-red/5 border-red"
                    : factuality.verdict === "TRUE"
                    ? "bg-green/5 border-green"
                    : "bg-orange/5 border-orange"
                }`}
              >
                <p className="text-xs leading-relaxed">
                  <span
                    className={`mr-2 font-bold uppercase ${
                      factuality.verdict === "FALSE"
                        ? "text-red"
                        : factuality.verdict === "TRUE"
                        ? "text-green"
                        : "text-orange"
                    }`}
                  >
                    {t.verdict}
                  </span>
                  {factuality.reason}
                </p>
              </div>
              {factuality.isFactualClaim &&
                (factuality.referencePeriod || factuality.currentNote) && (
                  <div className="space-y-2 border-t border-line/10 pt-4 font-mono text-[10px]">
                    {factuality.referencePeriod && (
                      <div className="flex items-center gap-2 uppercase tracking-wider text-gray">
                        <i className="ti ti-clock text-blue" />
                        <span>
                          {t.asOfLabel}: {factuality.referencePeriod}
                        </span>
                      </div>
                    )}
                    {factuality.currentNote && (
                      <div className="flex items-start gap-2 border-l-2 border-orange bg-orange/5 p-2 leading-relaxed text-orange">
                        <i className="ti ti-alert-triangle mt-[1px]" />
                        <span>
                          {t.currentLabel}: {factuality.currentNote}
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-3 border-t border-line/10 pt-6">
            <i className="ti ti-alert-circle text-lg text-orange" />
            <p className="font-mono text-[9px] text-gray uppercase tracking-wider leading-relaxed">
              {t.caution}
            </p>
          </div>
        </div>
      )}
    </article>
  );
};

// --- Main Page Sections ---

const Header = ({
  t,
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
}: {
  t: Dict;
  lang: Lang;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
}) => (
  <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-sm">
    <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
      <div className="flex items-center gap-4 cursor-pointer">
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

const Hero = ({ t, onScrollToPanel }: { t: Dict; onScrollToPanel: () => void }) => (
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
          <button onClick={onScrollToPanel} className="btn-primary">
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

// --- Main Component ---

export default function Home() {
  const [step, setStep] = useState<"landing" | "analysis" | "results">(
    "landing"
  );
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "url">("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [targetPolitician, setTargetPolitician] = useState(POLITICIAN_OPTIONS[0]);
  const [politicianQuery, setPoliticianQuery] = useState(POLITICIAN_OPTIONS[0]);
  const [isPoliticianSearchOpen, setIsPoliticianSearchOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lang, setLang] = useState<Lang>("ko");
  const [theme, setTheme] = useState<Theme>("light");
  const t = STR[lang];

  // Sync persisted preferences on mount + whenever they change.
  useEffect(() => {
    const l = (localStorage.getItem("lang") as Lang) || "ko";
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
  }>({
    politician: "",
    transcript: "",
    lang: "ko",
    asOf: "",
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
      .then((data) => {
        if (cancelled) return;
        clearInterval(interval);
        setAnalysis(data);
        setProgress(100);
        setTimeout(() => {
          if (cancelled) return;
          setStep("results");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 600);
      })
      .catch((err) => {
        if (cancelled) return;
        clearInterval(interval);
        setError(err?.message ?? "Analysis failed");
        setStep("landing");
      });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const exportJson = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verification_report.json";
    a.click();
    URL.revokeObjectURL(url);
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
    reader.onload = () => {
      const cleaned = String(reader.result || "")
        .replace(/^WEBVTT.*$/gm, "")
        .replace(/^\d+\s*$/gm, "") // SRT cue numbers
        .replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->.*$/gm, "") // timestamps
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");
      setTranscript(cleaned);
      setError(null);
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
      setTranscript(data.transcript || "");
      setInputMode("manual"); // show the fetched transcript so it can be reviewed
    } catch (err: any) {
      setError(err?.message ?? "Scrape failed");
    } finally {
      setFetching(false);
    }
  };

  return (
    <main className="min-h-screen blueprint-grid">
      <Header
        t={t}
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
        onToggleTheme={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
      />

      {step === "landing" && (
        <>
          <Hero
            t={t}
            onScrollToPanel={() =>
              document
                .getElementById("intake-panel")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          />

          <section
            id="intake-panel"
            className="border-b border-line bg-surface p-12 lg:p-24 scroll-mt-20"
          >
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    {t.intakeTitle}
                  </h2>
                  <p className="mt-2 font-mono text-[10px] font-bold text-gray uppercase tracking-widest">
                    TRANSCRIPT_MODULE // TWO_AXIS_ANALYZER
                  </p>
                </div>
                <div className="font-mono text-[10px] font-bold text-gray uppercase tracking-widest">
                  ONE_LINE = ONE_CLAIM
                </div>
              </div>

              {error && (
                <div className="mb-8 border-2 border-red bg-red/5 p-4 font-mono text-xs text-red">
                  ERROR: {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* File upload column (adopted from teammate frontend) */}
                <label className="group flex min-h-[420px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-line bg-slate/30 p-12 text-center shadow-sharp-sm transition-colors hover:bg-slate/60">
                  <input
                    type="file"
                    accept=".txt,.srt,.vtt,.md,video/*,audio/*"
                    className="hidden"
                    onChange={onFilePick}
                  />
                  <div className="mb-8 flex h-24 w-24 items-center justify-center border-2 border-line transition-transform group-hover:scale-110">
                    <i className="ti ti-file-upload text-4xl text-ink" />
                  </div>
                  <h3 className="mb-3 text-lg font-black uppercase tracking-widest text-ink">
                    {t.uploadTitle}
                  </h3>
                  <p className="max-w-xs font-mono text-[11px] leading-relaxed text-gray">
                    {t.uploadDesc}
                  </p>
                  <span className="btn-primary mt-8 py-3 text-[10px] tracking-[0.2em]">
                    {t.uploadBtn}
                  </span>
                </label>

                {/* Manual text-entry column */}
                <div className="flex flex-col">
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setInputMode("manual")}
                      className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                        inputMode === "manual"
                          ? "bg-accent text-accentfg shadow-sharp-sm"
                          : "border border-line bg-surface text-ink opacity-40 hover:opacity-100"
                      }`}
                    >
                      {t.manualEntry}
                    </button>
                    <button
                      onClick={() => setInputMode("url")}
                      className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                        inputMode === "url"
                          ? "bg-accent text-accentfg shadow-sharp-sm"
                          : "border border-line bg-surface text-ink opacity-40 hover:opacity-100"
                      }`}
                    >
                      {t.sourceLink}
                    </button>
                  </div>

                  {inputMode === "url" ? (
                    <div className="flex h-[268px] flex-col justify-center border-2 border-line bg-slate/30 p-8 shadow-sharp-sm">
                      <div className="flex items-center gap-3 border-2 border-line bg-surface px-4 py-3">
                        <i className="ti ti-brand-youtube text-xl text-red" />
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
                      <p className="mt-4 font-mono text-[10px] leading-relaxed text-gray">
                        {t.urlHint}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-line p-1 bg-slate/30 shadow-sharp-sm">
                      <textarea
                        className="h-64 w-full border border-line bg-surface p-6 font-mono text-sm outline-none resize-none focus:bg-slate/10 transition-colors text-ink"
                        placeholder={t.textareaPlaceholder}
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                      />
                    </div>
                  )}
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
                                    targetPolitician === name
                                      ? "text-blue"
                                      : "text-ink"
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
              </div>
            </div>
          </section>
        </>
      )}

      {step === "analysis" && (
        <AnalysisStepper t={t} progress={progress} lineCount={activeLineCount} />
      )}

      {step === "results" && analysis && (
        <section className="bg-surface border-b border-line p-12 lg:p-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <div className="mb-4 inline-block bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase text-accentfg tracking-widest">
                  {t.subject} {runRef.current.politician}
                </div>
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
                  {t.dashboard}
                </h2>
                <p className="mt-2 font-mono text-xs font-bold text-gray uppercase tracking-[0.2em]">
                  VERDICT_SUMMARY // TWO_AXIS_REPORT
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={exportJson}
                  className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"
                >
                  <i className="ti ti-download mr-2" />
                  {t.exportJson}
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"
                >
                  <i className="ti ti-printer mr-2" />
                  {t.pdfReport}
                </button>
                <button
                  onClick={() => {
                    setStep("landing");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"
                >
                  <i className="ti ti-arrow-left mr-2" />
                  {t.newAnalysis}
                </button>
              </div>
            </div>

            {analysis.notice && (
              <div className="mb-8 flex items-start gap-3 border-2 border-orange bg-orange/5 p-4 font-mono text-xs text-orange">
                <i className="ti ti-alert-triangle mt-[1px]" />
                <span className="leading-relaxed">{analysis.notice}</span>
              </div>
            )}

            <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="flex flex-col justify-between border-2 border-line bg-surface p-8 shadow-sharp-sm">
                <div>
                  <div className="mb-6 flex items-start justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue">
                      {t.consistencyScore}
                    </h3>
                    <span className="font-mono text-5xl font-black text-ink leading-none">
                      {analysis.consistencyScore}%
                    </span>
                  </div>
                  <SegmentedBar
                    percentage={analysis.consistencyScore}
                    colorClass="bg-blue"
                  />
                </div>
                <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                  {t.consistencyScoreDesc}
                </p>
              </div>
              <div className="flex flex-col justify-between border-2 border-line bg-surface p-8 shadow-sharp-sm">
                <div>
                  <div className="mb-6 flex items-start justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-green">
                      {t.factualityScore}
                    </h3>
                    <span className="font-mono text-5xl font-black text-ink leading-none">
                      {analysis.factualityScore}%
                    </span>
                  </div>
                  <SegmentedBar
                    percentage={analysis.factualityScore}
                    colorClass="bg-green"
                  />
                </div>
                <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                  {t.factualityScoreDesc}
                </p>
              </div>
              <div className="border-2 border-line bg-surface p-8 shadow-sharp-sm">
                <h3 className="mb-8 text-xs font-black uppercase tracking-widest text-ink">
                  {t.breakdown}
                </h3>
                <div className="space-y-4 font-mono text-[11px] font-bold">
                  <div className="flex justify-between border-b border-line/10 pb-2">
                    <span className="uppercase text-gray/60">{t.totalLines}</span>
                    <span className="text-ink">
                      {String(analysis.breakdown.total).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-line/10 pb-2">
                    <span className="uppercase text-red">{t.contradictions}</span>
                    <span>
                      {String(analysis.breakdown.contradictions).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-line/10 pb-2">
                    <span className="uppercase text-red">{t.falseClaims}</span>
                    <span>
                      {String(analysis.breakdown.falseClaims).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-line/10 pb-2">
                    <span className="uppercase text-orange">{t.unverifiable}</span>
                    <span>
                      {String(analysis.breakdown.unverifiable).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="uppercase text-green">
                      {t.verifiedCorrect}
                    </span>
                    <span>
                      {String(analysis.breakdown.verified).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-10 flex items-center gap-4">
              <div className="h-[1px] flex-grow bg-line/10" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
                End_of_Summary // Beginning_of_Claim_Ledger
              </span>
              <div className="h-[1px] flex-grow bg-line/10" />
            </div>

            <div className="space-y-10">
              {analysis.results.map((s) => (
                <StatementCard key={s.id} statement={s} t={t} />
              ))}
            </div>

            <div className="mt-24 flex flex-col items-center justify-between gap-8 bg-accent p-12 text-accentfg md:flex-row shadow-sharp">
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-widest">
                  {t.methodologyTitle}
                </h3>
                <p className="max-w-2xl font-mono text-xs font-bold leading-relaxed text-accentfg/50 tracking-widest">
                  {t.methodologyBody}
                </p>
              </div>
            </div>
          </div>
        </section>
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
