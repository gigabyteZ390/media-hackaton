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
  ["geopolitics", ["nato", "russia", "ukraine", "syria", "iran", "north korea", "china", "외교", "안보", "foreign", "국방", "defense", "trade"]],
  ["economy", ["crypto", "fed", "tax", "조세", "debt", "minimum wage", "economy", "경제", "energy", "에너지", "oil", "gas", "price", "inflation", "market", "job", "trade deficit", "ethanol", "ev", "부동산", "노동", "규제", "regulation"]],
  ["social", ["abortion", "gun", "healthcare", "entitlement", "lgbtq", "immigration", "covid", "vaccine", "daca", "복지", "교육", "인구", "border"]],
  ["politics", ["election", "jan6", "swamp", "정치", "통합", "국정"]],
];

export function classifySector(topic: string): SectorKey {
  const t = (topic || "").toLowerCase();
  for (const [sec, kws] of MAP) if (kws.some((k) => t.includes(k))) return sec;
  return "politics";
}
