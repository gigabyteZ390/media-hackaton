"use client";

import { useState, useEffect, useRef } from "react";
import type { StatementResult } from "@/lib/types";

// --- Mock Data ---

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

const SAMPLE_STATEMENTS: StatementResult[] = [
  {
    id: "1",
    timestamp: "00:01:24",
    speaker: "Politician A",
    line: "Youth unemployment has fallen to less than half of the previous administration's level.",
    consistency: {
      status: "CONTRADICTION",
      label: "Potential Contradiction",
      reason: "Four months ago, during a National Assembly inquiry, the same politician described the situation as 'the worst employment crisis since the 1997 IMF crisis.'",
      confidence: 0.82,
      pastStatement: {
        text: "Current youth economic indicators are the worst since the 1997 IMF crisis. A full-scale overhaul is needed.",
        date: "2024-03-12",
        sourceTitle: "National Assembly Inquiry",
        sourceUrl: "#"
      }
    },
    factuality: {
      isFactualClaim: true,
      verdict: "FALSE",
      label: "False",
      reason: "According to KOSIS data, the unemployment rate changed by only 0.2 percentage points compared with the previous administration, so the 'less than half' claim is not statistically supported.",
      sourceType: "KOSIS",
      confidence: 0.98,
      sources: [
        { title: "KOSIS 2024 Q2 Employment Trends", url: "#" },
        { title: "OECD Korea Employment Indicators Report", url: "#" }
      ]
    }
  },
  {
    id: "2",
    timestamp: "00:04:15",
    speaker: "Politician A",
    line: "Semiconductor exports to Southeast Asia grew 14% year over year.",
    consistency: {
      status: "CONSISTENT",
      label: "Consistent",
      reason: "The figure matches the politician's previous regular briefing and budget explanation.",
      confidence: 0.95
    },
    factuality: {
      isFactualClaim: true,
      verdict: "TRUE",
      label: "Verified",
      reason: "The claim aligns with the latest semiconductor export statistics from the Ministry of Trade, Industry and Energy and the Korea Customs Service, which reported 14.2% growth.",
      sourceType: "WEB",
      confidence: 0.96,
      sources: [
        { title: "Ministry of Trade, Industry and Energy 2024 First-Half Export Trends", url: "#" }
      ]
    }
  },
  {
    id: "3",
    timestamp: "00:07:30",
    speaker: "Politician A",
    line: "Our government's regional infrastructure investment is higher than that of any neighboring country.",
    consistency: {
      status: "INSUFFICIENT_CONTEXT",
      label: "Needs Context",
      reason: "The scope of 'neighboring country' and the comparison standard differ from previous statements, making a direct comparison unreliable.",
      confidence: 0.54
    },
    factuality: {
      isFactualClaim: true,
      verdict: "UNVERIFIABLE",
      label: "Unverifiable",
      reason: "Infrastructure budget definitions and fiscal years vary by country, so a statistical comparison across all neighboring countries cannot be verified cleanly.",
      confidence: 0.45,
      sources: []
    }
  },
  {
    id: "4",
    timestamp: "00:10:05",
    speaker: "Politician A",
    line: "Restoring political trust is the most urgent task of our time.",
    consistency: {
      status: "CONSISTENT",
      label: "Consistent",
      reason: "This has been a core value the politician has emphasized consistently since entering politics.",
      confidence: 0.92
    },
    factuality: {
      isFactualClaim: false,
      verdict: "NOT_FACTUAL",
      label: "Opinion",
      reason: "Value judgments are excluded from factual verification.",
      confidence: 1.0,
      sources: []
    }
  },
  {
    id: "5",
    timestamp: "00:12:40",
    speaker: "Politician A",
    line: "The effective corporate tax rate has risen every year for the last three years.",
    consistency: {
      status: "CONTRADICTION",
      label: "Potential Contradiction",
      reason: "During last year's budget review, the politician warned that the effective rate was falling because of corporate tax relief.",
      confidence: 0.78,
      pastStatement: {
        text: "The current tax reform proposal will lower the effective corporate tax rate for large companies.",
        date: "2023-11-15",
        sourceTitle: "Special Committee on Budget and Accounts",
        sourceUrl: "#"
      }
    },
    factuality: {
      isFactualClaim: true,
      verdict: "UNVERIFIABLE",
      label: "Unverifiable",
      reason: "Because finalized tax data is published with a delay, the recent upward trend cannot be confirmed with available official data.",
      confidence: 0.62,
      sources: []
    }
  }
];

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
      { time: '14:02:11', msg: 'Speech-to-text engine instance activated...', status: 'DONE' },
      { time: '14:02:15', msg: 'Extracting verifiable claims from audio data...', status: 'DONE' },
      { time: '14:02:22', msg: 'Matching 18 extracted claims against the historical statement database...', status: 'PROCESSING', active: true },
      { time: '14:02:35', msg: 'Fetching live data from KOSIS / Korea Customs Service / OECD APIs...', status: 'WAITING' },
      { time: '14:02:48', msg: 'Generating final analysis report with AI reasoning...', status: 'WAITING' }
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

// --- Main Components ---

export default function Home() {
  const [step, setStep] = useState<"landing" | "analysis" | "results">("landing");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("Unspecified Subject");
  const [politicianQuery, setPoliticianQuery] = useState("Unspecified Subject");
  const [isPoliticianSearchOpen, setIsPoliticianSearchOpen] = useState(false);

  const filteredPoliticians = POLITICIAN_OPTIONS.filter((name) =>
    name.toLowerCase().includes(politicianQuery.trim().toLowerCase())
  );

  const handleStartAnalysis = (text: string) => {
    if (!text.trim() && step === "landing") {
      setTranscript("Youth unemployment has fallen to less than half of the previous administration's level.\nSemiconductor exports to Southeast Asia grew 14% year over year.");
    }
    setStep("analysis");
  };

  useEffect(() => {
    if (step === "analysis") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 100) return prev + 2;
          clearInterval(interval);
          setTimeout(() => {
            setStep("results");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 1000);
          return 100;
        });
      }, 100);
      return () => clearInterval(interval);
    }
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
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {step === "analysis" && <AnalysisStepper progress={progress} />}

      {step === "results" && (
        <section className="bg-white border-b border-navy p-12 lg:p-24 animate-in fade-in duration-700">
          <div className="mx-auto max-w-7xl">
            {/* Summary Header */}
            <div className="mb-16 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <div className="mb-4 inline-block bg-navy px-3 py-1 font-mono text-[10px] font-bold uppercase text-white tracking-widest">Report_ID: AUDIT_2024_0708_V1</div>
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight">Analytical Dashboard</h2>
                <p className="mt-2 font-mono text-xs font-bold text-gray uppercase tracking-[0.2em]">VERDICT_SUMMARY // DATA_CONFIDENCE_INTERVAL_95%</p>
              </div>
              <div className="flex gap-4">
                <button className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"><i className="ti ti-download mr-2" />Export JSON</button>
                <button className="btn-secondary px-6 py-2 text-[10px] shadow-sharp-sm"><i className="ti ti-printer mr-2" />PDF Report</button>
              </div>
            </div>

            {/* Score Cards */}
            <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="flex flex-col justify-between border-2 border-navy bg-white p-8 shadow-sharp-sm">
                <div>
                  <div className="mb-6 flex items-start justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue">Consistency Score</h3>
                    <span className="font-mono text-5xl font-black text-navy leading-none">72%</span>
                  </div>
                  <SegmentedBar percentage={72} colorClass="bg-blue" />
                </div>
                <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                  Percentage of statements that do not contradict historical database records (N=452).
                </p>
              </div>
              <div className="flex flex-col justify-between border-2 border-navy bg-white p-8 shadow-sharp-sm">
                <div>
                  <div className="mb-6 flex items-start justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-green">Factuality Score</h3>
                    <span className="font-mono text-5xl font-black text-navy leading-none">64%</span>
                  </div>
                  <SegmentedBar percentage={64} colorClass="bg-green" />
                </div>
                <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-gray/60 tracking-wider">
                  Percentage of factual claims verified as TRUE against official statistical repositories.
                </p>
              </div>
              <div className="border-2 border-navy bg-white p-8 shadow-sharp-sm">
                <h3 className="mb-8 text-xs font-black uppercase tracking-widest text-navy">Statement Breakdown</h3>
                <div className="space-y-4 font-mono text-[11px] font-bold">
                  <div className="flex justify-between border-b border-navy/10 pb-2">
                    <span className="uppercase text-gray/60">Total Extracted</span>
                    <span className="text-navy">18</span>
                  </div>
                  <div className="flex justify-between border-b border-navy/10 pb-2">
                    <span className="uppercase text-red">Contradictions</span>
                    <span>05</span>
                  </div>
                  <div className="flex justify-between border-b border-navy/10 pb-2">
                    <span className="uppercase text-red">False Claims</span>
                    <span>03</span>
                  </div>
                  <div className="flex justify-between border-b border-navy/10 pb-2">
                    <span className="uppercase text-orange">Unverifiable</span>
                    <span>04</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="uppercase text-green">Verified Correct</span>
                    <span>06</span>
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
              {SAMPLE_STATEMENTS.map((s) => (
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
              <button className="bg-white px-10 py-5 font-black uppercase tracking-[0.2em] text-[11px] text-navy transition-all hover:bg-blue hover:text-white shrink-0">
                Submit for Human Review
              </button>
            </div>
          </div>
        </section>
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
