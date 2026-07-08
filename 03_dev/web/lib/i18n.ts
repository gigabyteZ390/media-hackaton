export type Lang = "ko" | "en";

export const DICT = {
  en: {
    titleA: "Political Statement",
    titleB: "Contradiction & Fact Checker",
    subtitle:
      "Two independent axes — self-consistency (vs. the person's own past words) and factuality (fact-check with sources).",
    politician: "Politician",
    transcript: "Broadcast transcript",
    perLine: "(one statement per line)",
    placeholder: "e.g. paste a scraper JSON's lines here, one per row",
    analyze: "Analyze",
    analyzing: "Analyzing…",
    loadSample: "Load sample",
    errEmpty: "Paste a transcript first (one statement per line).",
    consistency: "Consistency",
    accuracy: "Accuracy",
    consistencyHint: "% of lines that don't contradict past words",
    accuracyHint: "% of checked factual claims that are true",
    contradiction: "Contradiction",
    consistent: "Consistent",
    factPrefix: "Fact",
    verdictTRUE: "TRUE",
    verdictFALSE: "FALSE",
    verdictUNVERIFIABLE: "UNVERIFIABLE",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  ko: {
    titleA: "정치 발언",
    titleB: "모순 · 팩트체크",
    subtitle:
      "두 개의 독립 축 — 자기 일관성(본인 과거 발언 대조)과 사실성(출처 기반 팩트체크).",
    politician: "정치인",
    transcript: "방송 대본",
    perLine: "(한 줄에 한 발언씩)",
    placeholder: "예: 스크래퍼 JSON의 lines를 한 줄에 하나씩 붙여넣기",
    analyze: "분석",
    analyzing: "분석 중…",
    loadSample: "예시 불러오기",
    errEmpty: "먼저 대본을 붙여넣어 주세요 (한 줄에 한 발언).",
    consistency: "일관성",
    accuracy: "정확성",
    consistencyHint: "과거 발언과 모순되지 않는 발언 비율",
    accuracyHint: "검증한 사실 주장 중 사실인 비율",
    contradiction: "모순",
    consistent: "일관",
    factPrefix: "사실성",
    verdictTRUE: "사실",
    verdictFALSE: "거짓",
    verdictUNVERIFIABLE: "검증불가",
    theme: "테마",
    light: "라이트",
    dark: "다크",
    system: "시스템",
  },
} as const;

export type Dict = (typeof DICT)["en"];

export const LANG_LABEL: Record<Lang, string> = { en: "한국어로", ko: "EN" };
