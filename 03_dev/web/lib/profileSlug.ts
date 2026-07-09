// Shared politician-name -> profile-slug resolution (used by /api/profile and
// /api/add-statements so the pre-computed record and the accumulated statements
// live under the same key).

const ALIASES: Record<string, string> = {
  trump: "donald-trump",
  "donald trump": "donald-trump",
  "donald j. trump": "donald-trump",
  트럼프: "donald-trump",
  도널드트럼프: "donald-trump",
  "도널드 트럼프": "donald-trump",
  이재명: "lee-jae-myung",
  lee: "lee-jae-myung",
  "lee jae-myung": "lee-jae-myung",
  "lee jae myung": "lee-jae-myung",
  macron: "emmanuel-macron",
  마크롱: "emmanuel-macron",
  "emmanuel macron": "emmanuel-macron",
  "에마뉘엘 마크롱": "emmanuel-macron",
};

export function resolveSlug(input: string): string {
  const raw = (input || "").trim().toLowerCase();
  if (ALIASES[raw]) return ALIASES[raw];
  const compact = raw.replace(/\s+/g, "");
  if (ALIASES[compact]) return ALIASES[compact];
  return raw.replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}
