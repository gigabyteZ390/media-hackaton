// Offline: add bilingual text to every statement in data/profiles/*.json so the
// track-record timeline can show a translation while keeping the verbatim original.
// Each statement gains { textEn, textKo, src }. Runs on the local Ollama model.
//
//   node scripts/translate-profiles.mjs [file.json ...]   (default: all profiles)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, "..");

// load OLLAMA_* from .env.local
const envPath = path.join(WEB, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:14b";

const hasKorean = (s) => /[가-힣]/.test(s);

const SCHEMA = {
  type: "object",
  properties: {
    translations: { type: "array", items: { type: "string" } },
  },
  required: ["translations"],
};

async function translateBatch(texts, targetLang) {
  const target = targetLang === "ko" ? "Korean" : "English";
  const prompt = [
    `Translate each of the following political statements into ${target}.`,
    "Keep the meaning faithful and natural; keep names, numbers and dates.",
    "Return ONLY the translations, in the SAME ORDER, one per input.",
    "",
    JSON.stringify(texts),
  ].join("\n");
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: SCHEMA,
        options: { temperature: attempt * 0.3, num_predict: 3000 },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    try {
      const out = JSON.parse(data.message.content).translations;
      if (Array.isArray(out) && out.length === texts.length) return out;
    } catch {
      /* retry */
    }
  }
  return texts.map(() => ""); // give up -> leave blank, UI falls back to original
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(WEB, "data/profiles")).map((f) => path.join(WEB, "data/profiles", f));

for (const file of files) {
  const prof = JSON.parse(fs.readFileSync(file, "utf8"));
  let done = 0;
  const total = prof.sectors.reduce(
    (a, s) => a + s.topics.reduce((b, t) => b + t.statements.length, 0),
    0
  );
  console.error(`\n[${path.basename(file)}] ${total} statements`);
  for (const sec of prof.sectors) {
    for (const topic of sec.topics) {
      const texts = topic.statements.map((s) => s.text);
      if (!texts.length) continue;
      const src = hasKorean(texts.join(" ")) ? "ko" : "en";
      const targetLang = src === "ko" ? "en" : "ko";
      const translated = await translateBatch(texts, targetLang);
      topic.statements = topic.statements.map((s, i) => ({
        text: s.text,
        textEn: src === "en" ? s.text : translated[i] || s.text,
        textKo: src === "ko" ? s.text : translated[i] || s.text,
        src,
        date: s.date,
        sourceUrl: s.sourceUrl,
      }));
      done += texts.length;
      console.error(`  ${sec.key}/${topic.topic}: +${texts.length} (${done}/${total})`);
    }
  }
  fs.writeFileSync(file, JSON.stringify(prof, null, 2));
  console.error(`[${path.basename(file)}] written`);
}
console.error("\nDONE");
