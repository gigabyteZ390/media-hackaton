# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Epitech Summer School hackathon project: a **Political Statement Contradiction & Fact
Checker**. A web app checks a politician's statements along two independent axes:
**self-consistency** (does a statement contradict the person's own past words?) and
**factuality** (is the claim true, verified against web search + official statistics?).

This folder (`03_EPITECH 기말/`) is its own git repo, pushed to the team remote
`github.com/gigabyteZ390/media-hackaton`. It is nested inside the user's personal
EPITECH coursework repo but is a **separate repository** — do not commit it into the
outer repo.

## Repo conventions

- **All team-repo-facing content is English** (folder names, READMEs, code comments,
  commit messages) — a teammate reads it. Keep it that way.
- Fixed folder layout: `01_planning/` (plan PDFs), `02_data/` (scraper output),
  `03_dev/` (code), `04_design/`, `05_presentation/`, `06_references/` (research,
  incl. `flipflop-demo-scenarios.md`). Put new artifacts in the matching folder.
- **Git workflow:** `git fetch` and check `HEAD..origin/main` before developing;
  `git add -A` + commit (concise English message) before every `git push`.

## Commands

Two subprojects live under `03_dev/`.

### Web app — `03_dev/web/` (Next.js 14 App Router, TypeScript, Tailwind)
```bash
cd "03_dev/web"
npm install
cp .env.local.example .env.local     # set OPENAI_API_KEY (KOSIS_KEY optional)
npm run dev                          # http://localhost:3000
npm run build                        # production build == the typecheck gate
npm run lint                         # next lint
```
There is **no test suite** — `npm run build` (which runs `tsc` + Next type-checking)
is the verification gate; run it after changes. To exercise the APIs, run `npm run dev`
and use the UI (Load sample → Analyze) or POST to `/api/analyze` and `/api/factcheck`.

### YouTube scraper — `03_dev/youtube_scraper/` (Python)
```bash
cd "03_dev/youtube_scraper"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt      # needs ffmpeg for the --whisper fallback
python scraper.py "<youtube_url>" --lang ko     # → writes ../../02_data/{videoId}.json
```

## Architecture

### Two-axis analysis pipeline (the core idea)
A "transcript" is a list of spoken lines. Each line is checked on two independent axes,
run **in parallel** from `app/page.tsx` and merged per-line in the UI:

- **Axis 1 — self-consistency** (`app/api/analyze/route.ts`): filters
  `data/statements.json` to the target `politician` (exact-name match) and asks OpenAI
  (`chat.completions`, JSON mode, model in `lib/openai.ts` = `gpt-4o`) whether each line
  contradicts that person's own past statements. **No web access** — this axis is purely
  self-comparison, which is what keeps it politically neutral.
- **Axis 2 — factuality** (`app/api/factcheck/route.ts`): OpenAI **Responses API** with
  the built-in `web_search` tool for live, cited verification (TRUE/FALSE/UNVERIFIABLE).
  For Korean statistical claims it also queries **KOSIS** (`lib/kosis.ts`, integrated
  search) and passes matching official-stat tables into the prompt as authoritative
  evidence — a graceful no-op if `KOSIS_KEY` is unset or the call fails.

Scores (`consistencyScore`, `accuracyScore`) are **computed in the route code from the
verdicts**, not trusted from the model's own number.

### The statement DB
`data/statements.json` is the past-statements "DB" (currently ~90 web-collected,
sourced statements for 이재명, Emmanuel Macron, Donald Trump). Schema per entry:
`{ id, politician, text, date, sourceUrl, topic, (confidence?, era?) }`. The `politician`
field must match the UI input **exactly** for Axis 1 to find anything. The whole
politician-filtered set is injected into the prompt — **no embeddings/vector DB**, which
is intentional and works at this scale (tens of statements per politician). If the DB
grows to thousands, this must move to retrieval. The demo scenarios that trigger real
contradictions are in `06_references/flipflop-demo-scenarios.md`.

### Shared modules (`03_dev/web/lib/`)
- `openai.ts` — client factory (`getOpenAI`), `MODEL` constant, `extractJson` defensive parser.
- `prompts.ts` — prompt builders for both axes; **language-aware** (the `reason` field is
  written in the UI language) and accept an optional KOSIS `statsContext`.
- `i18n.ts` — KO/EN dictionary; `types.ts` — domain types.

### Client (`app/page.tsx`)
A single client component holds all state: politician, transcript, results, plus the
**language toggle (KO/EN)** and **theme (light/dark/system)**. Theme uses a `.dark` class
strategy (`tailwind.config.ts` darkMode: "class") with a no-FOUC init script in
`app/layout.tsx`; both prefs persist in `localStorage`. The selected `lang` is sent in the
request body so analysis output comes back in that language.

### Scraper → web
`youtube_scraper/scraper.py` pulls YouTube captions via yt-dlp (json3 format; falls back
to Whisper if `--whisper` and no captions) and emits `02_data/{videoId}.json` whose
`lines` are `{ text, start, duration }` — the same shape the web transcript box expects.
Captions arrive as short fragments; merging them into full statements is a known TODO.

## Important notes

- **LLM provider is OpenAI**, not Claude. The app was switched from the Anthropic SDK to
  `openai` (Chat Completions + Responses API). The plan PDFs in `01_planning/` still
  describe the earlier Claude/Opus design — the code is the source of truth.
- `web_search` (Responses API) and OpenAI JSON mode are the load-bearing API features;
  keep `openai` reasonably current.
- The statement DB is **auto-collected draft data** — quotes/dates should be spot-verified
  against their `sourceUrl` before any public/presentation use.
