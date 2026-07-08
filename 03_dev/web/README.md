# Web App — Contradiction & Fact Checker

Next.js (App Router) skeleton for the two-axis analysis:

- **`/api/analyze`** — Axis 1, self-consistency. Compares each spoken line against
  the politician's own past statements (`data/statements.sample.json`) using
  OpenAI (Chat Completions + JSON mode). Returns `{ verdicts, consistencyScore }`.
- **`/api/factcheck`** — Axis 2, factuality. Fact-checks checkable claims using
  OpenAI (Responses API + the built-in web-search tool). Returns
  `{ facts, accuracyScore }`. For Korean statistical claims it also looks up
  official **KOSIS** (Statistics Korea) tables via `lib/kosis.ts` and passes them
  as authoritative evidence (set `KOSIS_KEY`; no-op without it).
- **`app/page.tsx`** — UI: paste a transcript, click Analyze, see two score gauges
  and per-line badges (consistency + factuality) with sources.

Model is set in `lib/openai.ts` (`MODEL`, default `gpt-4o`) — swap it there.

## Setup
```bash
cd 03_dev/web
npm install
cp .env.local.example .env.local     # then set OPENAI_API_KEY
npm run dev                          # http://localhost:3000
```

Click **Load sample** then **Analyze** to see the flow end to end.

## Data flow
```
transcript lines ──┬─▶ POST /api/analyze   → contradictions + consistency %
                   └─▶ POST /api/factcheck → true/false/unverifiable + accuracy %
                          (merged per line in the UI)
```

## Notes / next steps
- Replace `data/statements.sample.json` with the real past-statement DB the team
  builds (same `Statement` shape in `lib/types.ts`).
- Feed the YouTube scraper's `02_data/{videoId}.json` `lines` straight into the
  transcript box (each `{ text }` is one line).
- Add `/api/transcribe` (Whisper) if you want to upload video directly instead of
  pasting a transcript.
- Wire INSEE / KOSIS as tools in `/api/factcheck` for official-stat cross-checks.
- Keep `openai` up to date (`npm i openai@latest`); the web-search tool lives on the
  Responses API.
