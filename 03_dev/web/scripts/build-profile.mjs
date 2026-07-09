// Offline profile pre-computation.
// Groups a politician's statements by (normalized) topic, asks Claude PER TOPIC
// (small, parallel, never-truncating calls) for a reversal count + bilingual note,
// aggregates into 4 sectors, and writes a static JSON the /api/profile route serves.
//
//   node scripts/build-profile.mjs "Donald Trump" > /dev/null
//
// Output: data/profiles/<slug>.json  (deterministic, instant, demo-safe)

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, "..");

// --- load ANTHROPIC_API_KEY from .env.local ---
const envPath = path.join(WEB, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing (.env.local)");
const client = new Anthropic({ apiKey });

// --- sector classification (mirror of lib/sectors.ts) ---
const SECTOR_MAP = [
  ["geopolitics", ["nato","russia","ukraine","syria","iran","north korea","china","외교","안보","foreign","국방","defense","trade","tariff","tiktok"]],
  ["economy", ["crypto","fed","tax","조세","debt","minimum wage","economy","경제","energy","에너지","ethanol","ev","부동산","노동","규제","regulation"]],
  ["social", ["abortion","gun","healthcare","entitlement","lgbtq","immigration","covid","vaccine","daca","복지","교육","인구","border"]],
  ["politics", ["election","jan6","swamp","정치","통합","국정","rhetoric","governance","행정"]],
];
function classifySector(topic) {
  const t = (topic || "").toLowerCase();
  for (const [sec, kws] of SECTOR_MAP) if (kws.some((k) => t.includes(k))) return sec;
  return "politics";
}

// --- normalize the noisy auto-generated topic labels ---
function normTopic(raw) {
  let s = raw;
  if (s.includes("/")) {
    const parts = s.split("/");
    const eng = parts.find((p) => /[a-z]/i.test(p));
    s = eng || parts[parts.length - 1];
  }
  s = s.trim().toLowerCase();
  const merge = {
    russia: "russia/ukraine",
    ukraine: "russia/ukraine",
    "russia/ukraine": "russia/ukraine",
    안보: "defense",
    "foreign-policy": "foreign-policy",
  };
  return merge[s] || s;
}

const politician = process.argv[2] || "Donald Trump";
const slug = politician.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const all = JSON.parse(fs.readFileSync(path.join(WEB, "data/statements.json"), "utf8"))
  .filter((s) => s.politician === politician);
if (!all.length) throw new Error(`No statements for "${politician}"`);

// group by normalized topic, date-ordered
const byTopic = new Map();
for (const s of all) {
  const t = normTopic(s.topic || "기타");
  if (!byTopic.has(t)) byTopic.set(t, []);
  byTopic.get(t).push(s);
}
for (const arr of byTopic.values())
  arr.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

console.error(`[build-profile] ${politician}: ${all.length} statements, ${byTopic.size} topics`);

const SCHEMA = {
  type: "object",
  properties: {
    reversalCount: { type: "number" },
    note_ko: { type: "string" },
    note_en: { type: "string" },
  },
  required: ["reversalCount", "note_ko", "note_en"],
  additionalProperties: false,
};

async function analyzeTopic(topic, arr) {
  // consistent single-statement topics can't reverse — skip the call
  if (arr.length < 2) {
    return { reversalCount: 0, note_ko: "", note_en: "" };
  }
  const lines = arr.map((s) => `(${s.date}) ${s.text}`).join("\n");
  const prompt = [
    `Below are ${politician}'s public statements on the topic "${topic}", in DATE ORDER.`,
    "Count how many times the stated position REVERSED over time — a reversal = a later",
    "statement clearly contradicts the position implied by an earlier one on this same issue.",
    "A steady, consistent stance = 0. Count each distinct flip (A→B is 1, A→B→A is 2).",
    "Write a ONE-sentence note (Korean in note_ko, English in note_en) describing the",
    'flip-flops concretely with rough dates. No double-quote characters inside the notes.',
    "",
    lines,
  ].join("\n");
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    try {
      const j = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      return JSON.parse(j);
    } catch (e) {
      lastErr = e; // truncated/malformed → retry
    }
  }
  throw lastErr;
}

// run in small parallel batches
const entries = [...byTopic.entries()];
const results = new Map();
const BATCH = 6;
for (let i = 0; i < entries.length; i += BATCH) {
  const slice = entries.slice(i, i + BATCH);
  const out = await Promise.all(
    slice.map(async ([topic, arr]) => {
      try {
        const r = await analyzeTopic(topic, arr);
        console.error(`  ✓ ${topic} (${arr.length}) → ${r.reversalCount} reversals`);
        return [topic, r];
      } catch (e) {
        console.error(`  ✗ ${topic}: ${e.message}`);
        return [topic, { reversalCount: 0, note_ko: "", note_en: "" }];
      }
    })
  );
  for (const [t, r] of out) results.set(t, r);
}

// aggregate into sectors
const sectors = new Map();
for (const [topic, arr] of byTopic.entries()) {
  const sec = classifySector(topic);
  if (!sectors.has(sec))
    sectors.set(sec, { key: sec, statementCount: 0, reversalCount: 0, topics: [] });
  const S = sectors.get(sec);
  const r = results.get(topic) || { reversalCount: 0, note_ko: "", note_en: "" };
  S.statementCount += arr.length;
  S.reversalCount += r.reversalCount;
  S.topics.push({
    topic,
    count: arr.length,
    reversalCount: r.reversalCount,
    note: { ko: r.note_ko, en: r.note_en },
    statements: arr.map((s) => ({ text: s.text, date: s.date, sourceUrl: s.sourceUrl })),
  });
}
for (const S of sectors.values())
  S.topics.sort((a, b) => b.reversalCount - a.reversalCount);

const out = {
  politician,
  generatedFrom: all.length,
  totalStatements: all.length,
  totalReversals: [...sectors.values()].reduce((a, s) => a + s.reversalCount, 0),
  sectors: [...sectors.values()].sort((a, b) => b.reversalCount - a.reversalCount),
};

const dir = path.join(WEB, "data/profiles");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${slug}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.error(`\n[build-profile] wrote ${file}`);
console.error(`  total reversals: ${out.totalReversals}`);
for (const s of out.sectors)
  console.error(`  [${s.key}] statements ${s.statementCount} · reversals ${s.reversalCount}`);
