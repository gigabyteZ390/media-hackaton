# Web App — Contradiction & Fact Checker

Next.js (App Router) skeleton for the two-axis analysis:

- **`/api/analyze`** — Axis 1, self-consistency. Compares each spoken line against
  the politician's own past statements (`data/statements.sample.json`) using
  Claude Opus 4.8 + structured outputs. Returns `{ verdicts, consistencyScore }`.
- **`/api/factcheck`** — Axis 2, factuality. Fact-checks checkable claims using
  Claude Opus 4.8 + the web-search server tool. Returns `{ facts, accuracyScore }`.
  (INSEE / KOSIS official-stats plugins can be wired in as tools later.)
- **`app/page.tsx`** — UI: paste a transcript, click Analyze, see two score gauges
  and per-line badges (consistency + factuality) with sources.

## Setup
```bash
cd 03_dev/web
npm install
cp .env.local.example .env.local     # then set ANTHROPIC_API_KEY
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
- `output_config` / `web_search_20260209` are recent API features — keep
  `@anthropic-ai/sdk` up to date (`npm i @anthropic-ai/sdk@latest`).
