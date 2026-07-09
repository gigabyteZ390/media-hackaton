// Map a fine-grained statement topic to one of four broad sectors, used by the
// politician profile dashboard.

export type SectorKey = "geopolitics" | "economy" | "social" | "politics";

export const SECTOR_LABEL: Record<
  SectorKey,
  { ko: string; en: string; icon: string }
> = {
  geopolitics: { ko: "지정학·안보", en: "Geopolitics & Security", icon: "ti-world" },
  economy: { ko: "경제·통상", en: "Economy & Trade", icon: "ti-coin" },
  social: { ko: "사회·정책", en: "Social & Domestic", icon: "ti-users-group" },
  politics: { ko: "정치·거버넌스", en: "Politics & Governance", icon: "ti-gavel" },
};

const MAP: [SectorKey, string[]][] = [
  ["geopolitics", ["nato", "russia", "ukraine", "우크라", "젤렌스키", "syria", "iran", "north korea", "china", "외교", "안보", "foreign", "국방", "defense", "trade"]],
  ["economy", ["crypto", "fed", "tax", "조세", "debt", "minimum wage", "economy", "경제", "energy", "에너지", "oil", "gas", "price", "inflation", "market", "job", "trade deficit", "ethanol", "ev", "부동산", "노동", "규제", "regulation"]],
  ["social", ["abortion", "gun", "healthcare", "entitlement", "lgbtq", "immigration", "covid", "vaccine", "daca", "복지", "교육", "인구", "border"]],
  ["politics", ["election", "jan6", "swamp", "정치", "통합", "국정"]],
];

export function classifySector(topic: string): SectorKey {
  const t = (topic || "").toLowerCase();
  for (const [sec, kws] of MAP) if (kws.some((k) => t.includes(k))) return sec;
  return "politics";
}

// Bilingual display labels for the fine-grained topic keys used across the profiles.
// Some keys arrive in English (Trump/Macron) and some in Korean (이재명), so both
// directions are covered; unknown topics fall back to the raw key.
const TOPIC_LABEL: Record<string, { ko: string; en: string }> = {
  // English-origin
  abortion: { ko: "낙태", en: "Abortion" },
  china: { ko: "중국", en: "China" },
  covid: { ko: "코로나19", en: "COVID-19" },
  crypto: { ko: "가상자산", en: "Crypto" },
  debt: { ko: "국가부채", en: "National debt" },
  defense: { ko: "국방", en: "Defense" },
  "domestic politics": { ko: "국내 정치", en: "Domestic politics" },
  economy: { ko: "경제", en: "Economy" },
  election: { ko: "선거", en: "Election" },
  energy: { ko: "에너지", en: "Energy" },
  entitlements: { ko: "복지수급", en: "Entitlements" },
  environment: { ko: "환경", en: "Environment" },
  ethanol: { ko: "에탄올", en: "Ethanol" },
  evs: { ko: "전기차", en: "Electric vehicles" },
  fed: { ko: "연준", en: "Federal Reserve" },
  "foreign policy": { ko: "외교", en: "Foreign policy" },
  "foreign-policy": { ko: "외교", en: "Foreign policy" },
  governance: { ko: "국정운영", en: "Governance" },
  guns: { ko: "총기", en: "Guns" },
  healthcare: { ko: "의료", en: "Healthcare" },
  identity: { ko: "정체성", en: "Identity" },
  immigration: { ko: "이민", en: "Immigration" },
  iran: { ko: "이란", en: "Iran" },
  jan6: { ko: "1·6 의사당 사태", en: "Jan 6" },
  labor: { ko: "노동", en: "Labor" },
  lgbtq: { ko: "성소수자", en: "LGBTQ" },
  "minimum wage": { ko: "최저임금", en: "Minimum wage" },
  nato: { ko: "나토", en: "NATO" },
  "north korea": { ko: "북한", en: "North Korea" },
  nuclear: { ko: "핵", en: "Nuclear" },
  pension: { ko: "연금", en: "Pension" },
  regulation: { ko: "규제", en: "Regulation" },
  rhetoric: { ko: "정치 수사", en: "Rhetoric" },
  "russia/ukraine": { ko: "러시아·우크라이나", en: "Russia / Ukraine" },
  우크라이나: { ko: "우크라이나", en: "Ukraine" },
  swamp: { ko: "기득권 청산", en: "The swamp" },
  syria: { ko: "시리아", en: "Syria" },
  tariffs: { ko: "관세", en: "Tariffs" },
  tax: { ko: "세금", en: "Tax" },
  taxes: { ko: "세금", en: "Taxes" },
  tiktok: { ko: "틱톡", en: "TikTok" },
  trade: { ko: "무역", en: "Trade" },
  vaccines: { ko: "백신", en: "Vaccines" },
  // Korean-origin (이재명)
  개헌: { ko: "개헌", en: "Constitutional reform" },
  검찰개혁: { ko: "검찰개혁", en: "Prosecution reform" },
  경제: { ko: "경제", en: "Economy" },
  국방: { ko: "국방", en: "Defense" },
  기본소득: { ko: "기본소득", en: "Basic income" },
  노동: { ko: "노동", en: "Labor" },
  대북: { ko: "대북 정책", en: "North Korea policy" },
  복지: { ko: "복지", en: "Welfare" },
  부동산: { ko: "부동산", en: "Real estate" },
  사법: { ko: "사법", en: "Judiciary" },
  선거제도: { ko: "선거제도", en: "Electoral system" },
  언론: { ko: "언론", en: "Media" },
  에너지: { ko: "에너지", en: "Energy" },
  외교: { ko: "외교", en: "Foreign policy" },
  재난지원금: { ko: "재난지원금", en: "Disaster relief funds" },
  저출생: { ko: "저출생", en: "Low birth rate" },
  정치: { ko: "정치", en: "Politics" },
  정치개혁: { ko: "정치개혁", en: "Political reform" },
  조세: { ko: "조세", en: "Taxation" },
  지역화폐: { ko: "지역화폐", en: "Local currency" },
  청년: { ko: "청년", en: "Youth" },
  통합: { ko: "통합", en: "National unity" },
  한일관계: { ko: "한일관계", en: "Korea–Japan relations" },
};

export function topicLabel(topic: string, lang: "ko" | "en"): string {
  const hit = TOPIC_LABEL[(topic || "").toLowerCase()] || TOPIC_LABEL[topic || ""];
  return hit ? hit[lang] : topic;
}
