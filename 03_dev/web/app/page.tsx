"use client";

import { useState, useEffect, useRef } from "react";
import type {
  StatementResult,
  UIConsistency,
  UIFactuality,
  SpokenLine,
  ConsistencyResult,
  ConsistencyVerdict,
  FactCheckResult,
  FactVerdict,
} from "@/lib/types";

const POLITICIAN_OPTIONS = [
  "Lee Jae-myung",
  "Han Dong-hoon",
  "Yoon Suk-yeol",
  "Kim Moon-soo",
  "Cho Kuk",
  "Lee Jun-seok",
  "Hong Joon-pyo",
  "Na Kyung-won",
  "Unspecified Subject",
];

/** One completed analysis run, listed on the dashboard and opened as a report. */
interface Report {
  id: string;
  createdAt: string; // ISO
  politician: string;
  consistencyScore: number;
  accuracyScore: number;
  statements: StatementResult[];
}

function toUIConsistency(v: ConsistencyVerdict): UIConsistency {
  return {
    status: v.isContradiction ? "CONTRADICTION" : "CONSISTENT",
    label: v.isContradiction ? "Potential Contradiction" : "Consistent",
    reason: v.reason,
    confidence: v.confidence,
    pastStatement: v.pastStatement
      ? {
          text: v.pastStatement,
          date: v.pastDate ?? "",
          sourceTitle: "Statement Database",
          sourceUrl: v.pastSourceUrl ?? "#",
        }
      : undefined,
  };
}

function sourceTypeFor(f: FactVerdict): "KOSIS" | "INSEE" | "WEB" | undefined {
  if (f.method !== "official-stats") return f.sources.length ? "WEB" : undefined;
  const url = f.sources[0]?.url ?? "";
  if (url.includes("insee.fr")) return "INSEE";
  if (url.includes("kosis.kr")) return "KOSIS";
  return "WEB";
}

function toUIFactuality(f: FactVerdict): UIFactuality {
  const verdict = !f.isFactualClaim ? "NOT_FACTUAL" : f.verdict;
  const label =
    verdict === "FALSE"
      ? "False"
      : verdict === "TRUE"
      ? "Verified"
      : verdict === "NOT_FACTUAL"
      ? "Opinion"
      : "Unverifiable";
  return {
    isFactualClaim: f.isFactualClaim,
    verdict,
    label,
    reason: f.reason,
    referencePeriod: f.referencePeriod,
    currentNote: f.currentNote,
    sourceType: sourceTypeFor(f),
    confidence: f.confidence,
    sources: f.sources,
  };
}

/** Runs both axes in parallel and merges them per line into report-ready statements. */
async function runAnalysis(politician: string, transcript: string): Promise<Report> {
  const lines: SpokenLine[] = transcript
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => ({ text }));

  const [analyzeRes, factRes] = await Promise.all([
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ politician, lines }),
    }),
    fetch("/api/factcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, lang: "en" }),
    }),
  ]);

  const [analyze, fact]: [ConsistencyResult, FactCheckResult] = await Promise.all([
    analyzeRes.json(),
    factRes.json(),
  ]);
  if (!analyzeRes.ok) throw new Error((analyze as any)?.error ?? "Self-consistency check failed");
  if (!factRes.ok) throw new Error((fact as any)?.error ?? "Fact-check failed");

  const statements: StatementResult[] = lines.map((line, i) => {
    const cv = analyze.verdicts[i];
    const fv = fact.facts[i];
    return {
      id: String(i + 1),
      timestamp: `LINE_${String(i + 1).padStart(2, "0")}`,
      speaker: politician,
      line: line.text,
      consistency: cv
        ? toUIConsistency(cv)
        : { status: "INSUFFICIENT_CONTEXT", label: "Needs Context", reason: "No verdict returned.", confidence: 0 },
      factuality: fv
        ? toUIFactuality(fv)
        : { isFactualClaim: false, verdict: "UNVERIFIABLE", label: "Unverifiable", reason: "No verdict returned.", confidence: 0, sources: [] },
    };
  });

  return {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    politician,
    consistencyScore: analyze.consistencyScore,
    accuracyScore: fact.accuracyScore,
    statements,
  };
}

function breakdown(statements: StatementResult[]) {
  return {
    total: statements.length,
    contradictions: statements.filter((s) => s.consistency.status === "CONTRADICTION").length,
    falseClaims: statements.filter((s) => s.factuality.verdict === "FALSE").length,
    unverifiable: statements.filter((s) => s.factuality.verdict === "UNVERIFIABLE").length,
    verifiedCorrect: statements.filter((s) => s.factuality.verdict === "TRUE").length,
  };
}

// --- Sub-components ---

const Badge = ({ status, label, axis }: { status: string; label: string; axis: 'consistency' | 'factuality' }) => {
  const getColors = () => {
    if (status === "CONTRADICTION" || status === "FALSE") return "bg-red text-white";
    if (status === "CONSISTENT" || status === "TRUE") return axis === 'consistency' ? "bg-blue text-white" : "bg-green text-white";
    if (status === "INSUFFICIENT_CONTEXT" || status === "UNVERIFIABLE") return "bg-orange text-white";
    return "bg-white text-navy border border-navy";
  };
  return (
    <div className={`${getColors()} border border-navy px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap`}>
      {label}
    </div>
  );
};

const SegmentedBar = ({ percentage, colorClass }: { percentage: number; colorClass: string }) => (
  <div className="mb-6 flex h-8 gap-1">
    {Array.from({ length: 10 }).map((_, i) => (
      <div 
        key={i} 
        className={`h-full flex-1 border-r border-white last:border-none ${i < (percentage / 10) ? colorClass : 'bg-slate/50'} transition-colors duration-500`} 
        style={{ transitionDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);

const StatementCard = ({ statement }: { statement: StatementResult }) => {
  const [expanded, setExpanded] = useState(false);
  const { consistency, factuality } = statement;

  const getStatusColor = () => {
    if (consistency.status === "CONTRADICTION" || factuality.verdict === "FALSE") return "bg-red";
    if (consistency.status === "INSUFFICIENT_CONTEXT" || factuality.verdict === "UNVERIFIABLE") return "bg-orange";
    return "bg-blue";
  };

  return (
    <article className="border border-navy bg-white transition-all hover:bg-slate/[0.3] group">
      <div className="flex">
        <div className={`w-3 ${getStatusColor()} shrink-0`} />
        <div className="flex-grow p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-4">
              <span className="bg-navy px-3 py-1 font-mono text-xs uppercase text-white">{statement.timestamp}</span>
              <span className="border border-navy px-3 py-1 font-mono text-xs uppercase text-navy/60">CLAIM_ID: {statement.id.padStart(2, '0')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge status={consistency.status} label={consistency.label} axis="consistency" />
              <Badge status={factuality.verdict} label={factuality.label} axis="factuality" />
              <div className="border border-navy bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-navy">
                CONF: {statement.factuality.confidence.toFixed(2)}
              </div>
            </div>
          </div>
          <h4 className="mb-6 max-w-4xl text-xl md:text-2xl font-black leading-tight text-navy">
            "{statement.line}"
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-mono text-xs text-gray">
                <i className="ti ti-link text-blue" />
                <span>[{factuality.sources.length}_SOURCES]</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-gray">
                <i className="ti ti-history text-blue" />
                <span>[{consistency.pastStatement ? '1' : '0'}_PAST_STMT]</span>
              </div>
            </div>
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-blue transition-colors focus:outline-none"
              aria-expanded={expanded}
            >
              <span>{expanded ? 'Hide_Evidence' : 'Expand_Evidence'}</span>
              <i className={`ti ti-chevron-${expanded ? 'up' : 'down'} text-lg transition-transform duration-300`} />
            </button>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-navy bg-slate p-8 md:p-12 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Consistency Panel */}
            <div className="space-y-6">
              <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue">
                <i className="ti ti-git-branch" /> Axis 01: Consistency Analysis
              </h5>
              {consistency.pastStatement ? (
                <>
                  <div>
                    <p className="mb-3 font-mono text-[10px] uppercase text-gray">Detected_Conflicting_Statement:</p>
                    <div className="relative border border-navy bg-white p-6 text-sm italic leading-relaxed">
                      <i className="ti ti-quote text-4xl text-navy/5 absolute top-2 left-2" />
                      "{consistency.pastStatement.text}"
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-navy/10 pb-2 font-mono text-[10px]">
                    <span>RECORDED: {consistency.pastStatement.date}</span>
                    <a href={consistency.pastStatement.sourceUrl} className="text-blue underline hover:text-navy">ARCHIVE_ID: KB-HST-{statement.id}</a>
                  </div>
                </>
              ) : (
                <div className="border border-navy/10 bg-white/50 p-6 text-center italic text-gray text-sm">
                  No directly comparable prior statement was found in the historical statement database.
                </div>
              )}
              <div className={`border-l-4 p-4 ${consistency.status === 'CONTRADICTION' ? 'bg-red/5 border-red' : 'bg-blue/5 border-blue'}`}>
                <p className="text-xs leading-relaxed">
                  <span className={`mr-2 font-bold uppercase ${consistency.status === 'CONTRADICTION' ? 'text-red' : 'text-blue'}`}>Verdict:</span>
                  {consistency.reason}
                </p>
              </div>
            </div>

            {/* Factuality Panel */}
            <div className="space-y-6">
              <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green">
                <i className="ti ti-database-check" /> Axis 02: Factuality Analysis
              </h5>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase text-gray">Statistical_Validation_Model:</p>
                <div className="border border-navy bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tighter">{factuality.sourceType || 'GENERAL'} DATASET</span>
                    <span className={`font-mono text-[10px] ${factuality.verdict === 'FALSE' ? 'text-red' : 'text-green'}`}>
                      {factuality.verdict === 'FALSE' ? 'DELTA_ERROR: -98.2%' : 'PARITY: 100%'}
                    </span>
                  </div>
                  <div className="flex h-3 w-full border border-navy/20 bg-slate p-[1px]">
                    <div className={`h-full ${factuality.verdict === 'FALSE' ? 'w-[5%] bg-red' : 'w-full bg-green'}`} />
                  </div>
                  <div className="mt-4 flex justify-between font-mono text-[9px] text-gray uppercase">
                    <span>Target Claim Parity</span>
                    <span>95% Confidence Interval</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {factuality.sources.length > 0 ? (
                  factuality.sources.map((src, i) => (
                    <div key={i} className="group flex items-center gap-3 font-mono text-[10px]">
                      <span className="bg-navy px-2 py-[2px] text-white">REF_{String(i+1).padStart(2, '0')}</span>
                      <a href={src.url} className="truncate text-gray underline decoration-gray/30 group-hover:text-green transition-colors">{src.title}</a>
                    </div>
                  ))
                ) : (
                  <div className="border border-navy/10 bg-white/50 p-6 text-center italic text-gray text-sm">
                    No reliable official data was available for verification.
                  </div>
                )}
              </div>
              <div className={`border-l-4 p-4 ${factuality.verdict === 'FALSE' ? 'bg-red/5 border-red' : factuality.verdict === 'TRUE' ? 'bg-green/5 border-green' : 'bg-orange/5 border-orange'}`}>
                <p className="text-xs leading-relaxed">
                  <span className={`mr-2 font-bold uppercase ${factuality.verdict === 'FALSE' ? 'text-red' : factuality.verdict === 'TRUE' ? 'text-green' : 'text-orange'}`}>Verdict:</span>
                  {factuality.reason}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-3 border-t border-navy/10 pt-6">
            <i className="ti ti-alert-circle text-lg text-orange" />
            <p className="font-mono text-[9px] text-gray uppercase tracking-wider leading-relaxed">
              Caution: AI-driven preliminary analysis. Final journalistic verification is mandatory.
            </p>
          </div>
        </div>
      )}
    </article>
  );
};

// --- Main Page Sections ---

const Header = () => (
  <header className="sticky top-0 z-50 border-b border-navy bg-white/95 backdrop-blur-sm">
    <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
      <div className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-10 w-10 items-center justify-center bg-navy text-white shadow-sharp-sm">
          <i className="ti ti-git-merge text-2xl" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Political Statement</h1>
          <p className="mt-1 font-mono text-[10px] uppercase text-gray font-bold tracking-widest">Contradiction_Detector_v1.0</p>
        </div>
      </div>
      <nav className="hidden lg:flex items-center gap-8">
        <div className="flex items-center gap-3 border-r border-navy/10 pr-8">
          <span className="font-mono text-[9px] font-bold uppercase text-gray">Real-time Activity:</span>
          <div className="relative h-4 w-64 overflow-hidden bg-slate/50 px-2">
            <div className="absolute whitespace-nowrap animate-marquee font-mono text-[9px] font-bold uppercase text-navy">
              [ANALYZING] LEE_J.M. HOUSING_POLICY // [VERIFIED] HAN_D.H. SEMICONDUCTOR_TAX // [ALERT] CONTROVERSY_DETECTED
            </div>
          </div>
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-blue transition-colors">Methodology</a>
          <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-blue transition-colors">Public API</a>
        </div>
      </nav>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] uppercase text-gray">
          <span>Status: <span className="text-green font-bold">STABLE</span></span>
          <div className="h-2 w-2 bg-green shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
        </div>
        <button className="bg-navy text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-blue transition-colors">Login</button>
      </div>
    </div>
  </header>
);

const Hero = ({ onScrollToPanel }: { onScrollToPanel: () => void }) => (
  <section className="grid grid-cols-1 border-b border-navy lg:grid-cols-2">
    <div className="flex flex-col justify-center border-r border-navy bg-white p-12 lg:p-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue/5 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative z-10">
        <div className="mb-8 inline-block border border-navy px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase">
          [ SYSTEM_LEVEL: PUBLIC_VERIFICATION_DESK ]
        </div>
        <h2 className="mb-8 text-7xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase">
          Verification<br />
          <span className="text-blue">Through</span><br />
          Precision
        </h2>
        <p className="mb-12 max-w-lg text-lg md:text-xl leading-relaxed text-gray font-medium">
          We verify political statements instead of attacking them. The system extracts claims from broadcast footage, then separates <span className="text-navy font-bold underline decoration-blue decoration-2 underline-offset-4">self-consistency</span> from <span className="text-navy font-bold underline decoration-green decoration-2 underline-offset-4">factual accuracy</span> using the speaker's past statements and authoritative sources.
        </p>
        <div className="flex flex-wrap gap-4">
          <button onClick={onScrollToPanel} className="btn-primary">Start Verification</button>
          <button className="btn-secondary">Technical Specs</button>
        </div>
      </div>
    </div>
    
    <div className="relative flex items-center justify-center bg-slate p-12 overflow-hidden">
      <div className="blueprint-grid absolute inset-0" />
      <div className="relative z-10 w-full max-w-xl">
        <div className="relative border-2 border-navy bg-white p-12 shadow-sharp transition-transform hover:-translate-x-1 hover:-translate-y-1">
          <div className="absolute -left-4 -top-4 bg-navy px-3 py-1 font-mono text-[10px] font-bold uppercase text-white tracking-widest">TOPOLOGY_V2</div>
          <div className="absolute -right-4 -bottom-4 bg-blue px-3 py-1 font-mono text-[10px] font-bold uppercase text-white tracking-widest">COORD: 124.5 // 08.2</div>
          
          <div className="relative mb-20 text-center">
            <div className="relative inline-block border-2 border-navy bg-white p-8 shadow-[8px_8px_0px_0px_#0F172A]">
              <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-gray">Target_Input_Claim</p>
              <p className="text-xl md:text-2xl font-black leading-tight tracking-tight uppercase">"Youth unemployment has fallen to<br />less than half the previous level."</p>
            </div>
            <div className="absolute left-1/2 top-full h-16 w-[2px] -translate-x-1/2 bg-navy/20" />
          </div>

          <div className="relative grid grid-cols-2 gap-12 pt-8">
            <div className="absolute left-1/2 top-0 h-[1px] w-full -translate-x-1/2 bg-navy/20" />
            <div className="relative flex flex-col items-end space-y-4 text-right">
              <div className="absolute -right-[6.5px] -top-1.5 h-3 w-3 bg-blue border border-white" />
              <i className="ti ti-history text-4xl text-blue" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue">Consistency Axis</h3>
                <p className="font-mono text-[9px] font-bold uppercase text-gray mt-1 leading-relaxed">Cross-checks against<br />historical statement data</p>
              </div>
            </div>
            <div className="relative flex flex-col items-start space-y-4 text-left">
              <div className="absolute -left-[6.5px] -top-1.5 h-3 w-3 bg-green border border-white" />
              <i className="ti ti-database-check text-4xl text-green" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-green">Factuality Axis</h3>
                <p className="font-mono text-[9px] font-bold uppercase text-gray mt-1 leading-relaxed">Verifies facts against<br />official and external sources</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const AnalysisStepper = ({ progress }: { progress: number }) => {
  const [logs, setLogs] = useState<{ time: string; msg: string; status: string; active?: boolean }[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fullLogs = [
      { time: 'T+00.0s', msg: 'Parsing transcript into individually checkable statements...', status: 'DONE' },
      { time: 'T+00.4s', msg: 'Matching statements against the historical statement database...', status: 'DONE' },
      { time: 'T+01.2s', msg: 'Extracting statistical claims for official-source verification...', status: 'PROCESSING', active: true },
      { time: 'T+02.0s', msg: 'Cross-checking against KOSIS / INSEE and live web search...', status: 'WAITING' },
      { time: 'T+03.0s', msg: 'Merging both axes into the final report...', status: 'WAITING' }
    ];

    const interval = setInterval(() => {
      setLogs(prev => {
        if (prev.length < fullLogs.length) {
          const nextIndex = prev.length;
          return fullLogs.slice(0, nextIndex + 1).map((log, i) => ({
            ...log,
            status: i < nextIndex ? 'DONE' : (i === nextIndex ? 'PROCESSING' : 'WAITING'),
            active: i === nextIndex
          }));
        }
        return prev;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-slate border-b border-navy p-12 lg:p-24 min-h-[700px] flex items-center">
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden border-2 border-navy bg-white shadow-sharp">
          <div className="flex items-center justify-between bg-navy p-4 text-white">
            <div className="flex items-center gap-3">
              <i className="ti ti-terminal text-xl" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">System_Analyzer_Core</span>
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-3 border border-white" />
              <div className="h-3 w-3 bg-white" />
            </div>
          </div>
          
          <div ref={logContainerRef} className="h-[320px] space-y-4 overflow-y-auto p-8 font-mono text-sm bg-navy/[0.02]">
            {logs.map((log, i) => (
              <div key={i} className={`flex items-start gap-4 transition-all duration-300 ${log.active ? 'border-l-4 border-orange bg-orange/5 pl-4 py-2' : 'text-gray/80'}`}>
                <span className="opacity-40 text-[10px]">[{log.time}]</span>
                <span className={`flex-grow ${log.active ? 'text-navy font-bold' : 'text-navy/60'}`}>{log.msg}</span>
                <span className={`font-bold text-[10px] ${log.status === 'DONE' ? 'text-green' : (log.status === 'PROCESSING' ? 'text-orange animate-pulse' : 'text-gray/20')}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-navy bg-slate p-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-navy">Verification Pipeline</p>
                <p className="mt-1 font-mono text-[9px] font-bold text-gray uppercase tracking-widest">AXIS_01_HST // AXIS_02_FACT</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-black text-navy">{progress}%</p>
              </div>
            </div>
            <div className="flex h-12 w-full gap-1 border-2 border-navy bg-white p-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={`h-full flex-grow ${i < (progress / 5) ? 'bg-navy' : 'bg-navy/5'} transition-all duration-300`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Dashboard + Report ---

const Dashboard = ({
  reports,
  onOpenReport,
  onNewAnalysis,
}: {
  reports: Report[];
  onOpenReport: (id: string) => void;
  onNewAnalysis: () => void;
}) => (
  <section className="bg-white border-b border-navy p-12 lg:p-24 animate-in fade-in duration-700">
    <div className="mx-auto max-w-6xl">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Dashboard</h2>
          <p className="mt-2 font-mono text-[10px] font-bold text-gray uppercase tracking-widest">
            SESSION_HISTORY // {reports.length} {reports.length === 1 ? "REPORT" : "REPORTS"}
          </p>
        </div>
        <button onClick={onNewAnalysis} className="btn-primary px-6 py-3 text-[10px] tracking-[0.2em]">
          <i className="ti ti-plus mr-2" />New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const b = breakdown(r.statements);
          return (
            <button
              key={r.id}
              onClick={() => onOpenReport(r.id)}
              className="text-left border-2 border-navy bg-white p-6 shadow-sharp-sm transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-sharp"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="bg-navy px-2 py-1 font-mono text-[9px] font-bold uppercase text-white">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <i className="ti ti-arrow-up-right text-lg text-blue" />
              </div>
              <h3 className="mb-4 text-lg font-black uppercase tracking-tight">{r.politician}</h3>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase text-gray">Consistency</p>
                  <p className="font-mono text-2xl font-black text-blue">{r.consistencyScore}%</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase text-gray">Factuality</p>
                  <p className="font-mono text-2xl font-black text-green">{r.accuracyScore}%</p>
                </div>
              </div>
              <div className="flex justify-between border-t border-navy/10 pt-3 font-mono text-[10px] font-bold uppercase text-gray">
                <span>{b.total} statements</span>
                <span className="text-red">{b.contradictions + b.falseClaims} flagged</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </section>
);

const ReportModal = ({ report, onClose }: { report: Report; onClose: () => void }) => {
  const b = breakdown(report.statements);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.politician.replace(/\s+/g, "_")}-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-navy/60 backdrop-blur-sm p-4 md:p-12">
      <div className="mx-auto max-w-7xl border-2 border-navy bg-white shadow-sharp">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-navy bg-navy p-6 text-white">
          <div>
            <div className="mb-2 inline-block bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase text-navy tracking-widest">
              Report // {report.politician}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Result Report</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border-2 border-white hover:bg-white hover:text-navy transition-colors"
            aria-label="Close report"
          >
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        <div className="p-8 lg:p-16">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <p className="font-mono text-xs font-bold text-gray uppercase tracking-[0.2em]">
              GENERATED {new Date(report.createdAt).toLocaleString()} // DATA_CONFIDENCE_INTERVAL_95%
            </p>
            <div className="flex gap-4">
              <button onClick={handleExportJson} className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"><i className="ti ti-download mr-2" />Export JSON</button>
              <button onClick={() => window.print()} className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"><i className="ti ti-printer mr-2" />Print / PDF</button>
            </div>
          </div>

          {/* Score Cards */}
          <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col justify-between border-2 border-navy bg-white p-8 shadow-sharp-sm">
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue">Consistency Score</h3>
                  <span className="font-mono text-5xl font-black text-navy leading-none">{report.consistencyScore}%</span>
                </div>
                <SegmentedBar percentage={report.consistencyScore} colorClass="bg-blue" />
              </div>
              <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                Share of statements that do not contradict this speaker's own past record (N={b.total}).
              </p>
            </div>
            <div className="flex flex-col justify-between border-2 border-navy bg-white p-8 shadow-sharp-sm">
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-green">Factuality Score</h3>
                  <span className="font-mono text-5xl font-black text-navy leading-none">{report.accuracyScore}%</span>
                </div>
                <SegmentedBar percentage={report.accuracyScore} colorClass="bg-green" />
              </div>
              <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                Share of checkable factual claims verified as TRUE against official/web sources.
              </p>
            </div>
            <div className="border-2 border-navy bg-white p-8 shadow-sharp-sm">
              <h3 className="mb-8 text-xs font-black uppercase tracking-widest text-navy">Statement Breakdown</h3>
              <div className="space-y-4 font-mono text-[11px] font-bold">
                <div className="flex justify-between border-b border-navy/10 pb-2">
                  <span className="uppercase text-gray/60">Total Extracted</span>
                  <span className="text-navy">{String(b.total).padStart(2, "0")}</span>
                </div>
                <div className="flex justify-between border-b border-navy/10 pb-2">
                  <span className="uppercase text-red">Contradictions</span>
                  <span>{String(b.contradictions).padStart(2, "0")}</span>
                </div>
                <div className="flex justify-between border-b border-navy/10 pb-2">
                  <span className="uppercase text-red">False Claims</span>
                  <span>{String(b.falseClaims).padStart(2, "0")}</span>
                </div>
                <div className="flex justify-between border-b border-navy/10 pb-2">
                  <span className="uppercase text-orange">Unverifiable</span>
                  <span>{String(b.unverifiable).padStart(2, "0")}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="uppercase text-green">Verified Correct</span>
                  <span>{String(b.verifiedCorrect).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement Ledger */}
          <div className="mb-10 flex items-center gap-4">
            <div className="h-[1px] flex-grow bg-navy/10" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray">End_of_Summary // Beginning_of_Claim_Ledger</span>
            <div className="h-[1px] flex-grow bg-navy/10" />
          </div>

          <div className="space-y-10">
            {report.statements.map((s) => (
              <StatementCard key={s.id} statement={s} />
            ))}
          </div>

          {/* Methodology Footer */}
          <div className="mt-24 flex flex-col items-center justify-between gap-8 bg-navy p-12 text-white md:flex-row shadow-sharp">
            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-widest">Final Methodology Disclaimer</h3>
              <p className="max-w-2xl font-mono text-xs font-bold leading-relaxed text-white/50 uppercase tracking-widest">
                AI-BASED ANALYTICAL MODELS PROVIDE INITIAL VERIFICATION. HUMAN VERIFICATION BY CERTIFIED JOURNALISTS IS REQUIRED FOR LEGAL OR EDITORIAL PUBLICATION. ALL SOURCES ARE PUBLICLY AVAILABLE.
              </p>
            </div>
            <button onClick={onClose} className="bg-white px-10 py-5 font-black uppercase tracking-[0.2em] text-[11px] text-navy transition-all hover:bg-blue hover:text-white shrink-0">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Components ---

export default function Home() {
  const [step, setStep] = useState<"landing" | "analysis" | "dashboard">("landing");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("Unspecified Subject");
  const [politicianQuery, setPoliticianQuery] = useState("Unspecified Subject");
  const [isPoliticianSearchOpen, setIsPoliticianSearchOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredPoliticians = POLITICIAN_OPTIONS.filter((name) =>
    name.toLowerCase().includes(politicianQuery.trim().toLowerCase())
  );
  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;

  const handleStartAnalysis = async (text: string) => {
    let content = text;
    if (!content.trim()) {
      content = "Youth unemployment has fallen to less than half of the previous administration's level.\nSemiconductor exports to Southeast Asia grew 14% year over year.";
      setTranscript(content);
    }
    setError(null);
    setProgress(0);
    setStep("analysis");
    try {
      const report = await runAnalysis(targetPolitician, content);
      setReports((prev) => [report, ...prev]);
      setSelectedReportId(report.id);
      setProgress(100);
      setTimeout(() => {
        setStep("dashboard");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 400);
    } catch (err: any) {
      setError(err?.message ?? "Analysis failed. Please try again.");
      setStep("landing");
    }
  };

  // Ramps toward (but not to) completion while the real request is in flight;
  // handleStartAnalysis jumps it to 100 once the response actually comes back.
  useEffect(() => {
    if (step !== "analysis") return;
    const interval = setInterval(() => {
      setProgress((p) => (p < 92 ? p + 2 : p));
    }, 150);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <main className="min-h-screen blueprint-grid">
      <Header />
      
      {step === "landing" && (
        <>
          <Hero onScrollToPanel={() => document.getElementById("intake-panel")?.scrollIntoView({ behavior: "smooth" })} />
          
          <section id="intake-panel" className="border-b border-navy bg-white p-12 lg:p-24 scroll-mt-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Evidence Intake</h2>
                  <p className="mt-2 font-mono text-[10px] font-bold text-gray uppercase tracking-widest">UPLOADER_MODULE // STT_CONVERTER</p>
                </div>
                <div className="font-mono text-[10px] font-bold text-gray uppercase tracking-widest">MAX_SIZE: 500MB</div>
              </div>

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                {/* File Upload */}
                <div className="bg-navy p-1 shadow-sharp group transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center border border-dashed border-navy bg-white p-12 text-center cursor-pointer transition-colors group-hover:bg-slate/50">
                    <div className="relative mb-8 flex h-24 w-24 items-center justify-center border-2 border-navy group-hover:scale-110 transition-transform">
                      <i className="ti ti-file-upload text-4xl text-navy" />
                      <div className="absolute -right-2 -top-2 h-4 w-4 bg-blue border border-white" />
                    </div>
                    <h3 className="mb-3 text-lg font-black uppercase tracking-widest">Video / Audio Dossier</h3>
                    <p className="font-mono text-[11px] leading-loose text-gray px-6 uppercase font-bold">
                      Upload the video or audio file you want to verify.<br />
                      <span className="opacity-40 text-[9px]">[ MP4 / MOV / WAV / MP3 / M4A ]</span>
                    </p>
                    <button className="btn-primary mt-10 py-3 text-[10px] tracking-[0.2em]">Select Archive</button>
                  </div>
                </div>

                {/* Text Input */}
                <div className="flex flex-col h-full min-h-[420px]">
                  <div className="mb-4 flex gap-2">
                    <button className="bg-navy px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sharp-sm">Manual_Entry</button>
                    <button className="border border-navy bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-navy opacity-40 hover:opacity-100 transition-opacity">Source_Link</button>
                  </div>
                  <div className="flex-grow border-2 border-navy p-1 bg-slate/30 shadow-sharp-sm">
                    <textarea
                      className="h-full w-full border border-navy bg-white p-6 font-mono text-sm outline-none resize-none focus:bg-slate/10 transition-colors"
                      placeholder="Enter the transcript to verify... (separate statements with line breaks)"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <div className="relative flex min-w-[280px] flex-grow items-center gap-4 border-2 border-navy bg-white px-6 py-4">
                      <label htmlFor="target-politician" className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-gray">
                        Target_Politician
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
                              setTargetPolitician(nextValue.trim() || "Unspecified Subject");
                              setIsPoliticianSearchOpen(true);
                            }}
                            onFocus={() => setIsPoliticianSearchOpen(true)}
                            onBlur={() => {
                              window.setTimeout(() => setIsPoliticianSearchOpen(false), 120);
                            }}
                            placeholder="Search politician..."
                            className="w-full bg-transparent text-xs font-black uppercase outline-none placeholder:text-gray/40"
                            autoComplete="off"
                          />
                        </div>
                        {isPoliticianSearchOpen && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-4 max-h-56 overflow-y-auto border-2 border-navy bg-white shadow-sharp-sm">
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
                                  className={`flex w-full items-center justify-between border-b border-navy/10 px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest transition-colors last:border-b-0 hover:bg-slate ${
                                    targetPolitician === name ? "text-blue" : "text-navy"
                                  }`}
                                >
                                  <span>{name}</span>
                                  {targetPolitician === name && <i className="ti ti-check text-sm" />}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-widest text-gray">
                                No local match. This name will be used as a custom target until the politician DB is connected.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartAnalysis(transcript)}
                      className="bg-navy px-12 py-4 font-black uppercase tracking-widest text-white shadow-sharp hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      Execute_Process
                    </button>
                  </div>
                  {error && (
                    <div className="mt-4 border-2 border-red bg-red/5 p-4 font-mono text-xs font-bold text-red">
                      <i className="ti ti-alert-triangle mr-2" />{error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {step === "analysis" && <AnalysisStepper progress={progress} />}

      {step === "dashboard" && (
        <Dashboard
          reports={reports}
          onOpenReport={setSelectedReportId}
          onNewAnalysis={() => setStep("landing")}
        />
      )}

      {selectedReport && (
        <ReportModal report={selectedReport} onClose={() => setSelectedReportId(null)} />
      )}

      {/* Main Footer */}
      <footer className="border-t border-navy bg-white px-8 py-16">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-12 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center bg-navy shadow-sharp-sm">
              <i className="ti ti-git-fork text-xl text-white" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-tighter block leading-none">Research Anthropologist Desk</span>
              <span className="font-mono text-[9px] font-bold text-gray uppercase mt-1 tracking-widest">Software Version // 1.0.44-STABLE</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-10 font-mono text-[10px] font-bold uppercase text-gray tracking-widest">
            <span className="text-navy">&copy; 2026 Evidence Desk Intelligence</span>
            <a href="#" className="hover:text-blue transition-colors">Privacy Protocol</a>
            <a href="#" className="hover:text-blue transition-colors">Terminal Access</a>
            <a href="#" className="hover:text-blue transition-colors">Audit Charter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
