# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Epitech Summer School hackathon project — **Politrace**, a political statement
track-record & verification web app. Two products in one flow:

1. **Track record (primary demo)**: search a politician → their statements grouped
   into 4 sectors (geopolitics/economy/social/politics) with a **position-reversal
   count (flip-flops)** per topic, expandable to dated, sourced timelines.
2. **Two-axis verification**: paste a YouTube URL / transcript → key statements are
   extracted and checked for **self-consistency** (contradicts their own past?) and
   **factuality** (true, per web search + official statistics). Verified statements
   are **persisted** and accumulate onto that person's track record.

This folder (`03_EPITECH 기말/`) is its own git repo, pushed to the team remote
`github.com/gigabyteZ390/media-hackaton` (working branch: `feat/politrace-i18n`).
It is nested inside the user's personal EPITECH coursework repo but is a **separate
repository** — do not commit it into the outer repo.

## Repo conventions

- **All team-repo-facing content is English** (folder names, READMEs, code comments,
  commit messages) — a teammate reads it. Keep it that way.
- Fixed folder layout: `01_planning/` (plan PDFs), `02_data/` (scraper output cache,
  gitignored content), `03_dev/` (code), `04_design/`, `05_presentation/`,
  `06_references/`. Put new artifacts in the matching folder.
- **Git workflow:** `git fetch` and check teammates' branches before developing;
  commit (concise English message) before every `git push`.

## Commands

### Web app — `03_dev/web/` (Next.js 14 App Router, TypeScript, Tailwind)
```bash
cd "03_dev/web"
npm install
cp .env.local.example .env.local     # see LLM backend below
npm run dev                          # http://localhost:3000
npm run build                        # production build == the typecheck gate
npm run lint
```
No test suite — `npm run build` is the verification gate. Never run `npm run build`
while `npm run dev` is running (it clobbers `.next` and breaks the dev server; stop
dev, build, restart).

### YouTube scraper — `03_dev/youtube_scraper/` (Python, yt-dlp captions)
```bash
cd "03_dev/youtube_scraper"
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
python scraper.py "<youtube_url>" --lang en    # → ../../02_data/{videoId}.json
```
Transcript capture is **yt-dlp captions, not Whisper/OpenAI**. The `.venv/bin/yt-dlp`
console script has a stale shebang (folder was renamed) — irrelevant to the app,
which invokes `.venv/bin/python scraper.py`.

## LLM backend (the key switch)

Every reasoning call goes through `getAnthropic().messages.create(...)` in
`lib/anthropic.ts`. `.env.local` picks the backend:

- **`LLM_BACKEND=local`** (demo default): an Ollama adapter that mimics the Anthropic
  response shape — zero API credits. `OLLAMA_MODEL=qwen2.5:14b`. Anthropic
  `output_config.format.schema` maps to Ollama constrained `format`; `thinking`/
  `temperature` params are ignored/repurposed. "Local model" ≠ offline: the server
  still uses the internet.
- **Anthropic cloud** (`claude-sonnet-5`) otherwise: needs `ANTHROPIC_API_KEY` and
  credits. Sonnet rejects `temperature`; web search uses the provider tool.

Axis 2 web evidence in local mode is searched **in code** (`lib/websearch.ts`,
keyless DuckDuckGo) and fed to the model as snippets; KOSIS/INSEE official-stat
lookups are plain HTTP either way. Small local models emit broken JSON on big
outputs — routes retry ×3 and fall back to `salvageObjects()` partial parses.

## Architecture

### Data
- `data/statements.json` — the past-statement DB (~250 sourced statements; Trump is
  the deep one incl. a 77-entry Iran timeline 2011→2026). Schema:
  `{ id, politician, text, date, sourceUrl, topic, era? }`. `politician` must match
  the UI target exactly.
- `data/profiles/<slug>.json` — **pre-computed** track-record profiles (reversal
  counts + bilingual notes). Generated OFFLINE by `scripts/build-profile.mjs`
  (small per-topic LLM calls, never truncates). `/api/profile` just reads the file —
  instant and deterministic for the demo. Re-run the script + commit to refresh.
- `data/added/<slug>.json` (gitignored, runtime) — statements verified from videos,
  appended by `/api/add-statements`, merged into `/api/profile` responses under an
  "Added from video" topic. Delete the file to reset a demo.
- Name→slug aliases (trump/트럼프/이재명/macron…) live in `lib/profileSlug.ts`.

### Pipeline (verify flow)
`/api/scrape` (spawns the Python scraper) → `distillTranscript` in `page.tsx` calls
`/api/extract` right after fetch/upload so the box shows only the target's key
statements (greetings/other speakers stripped) → Execute runs `/api/analyze`
(Axis 1) + `/api/factcheck` (Axis 2) in parallel → results are POSTed to
`/api/add-statements` → UI lands on the track record (no separate results page).

- **Axis 1** (`/api/analyze`): injects only the ~35 keyword-relevant past statements
  (`selectRelevant`), NOT the whole history — this was the token-bloat/latency fix.
  Scores are computed in code from verdicts, never trusted from the model.
- **Axis 2** (`lib/factcheck.ts`): LLM extracts claims → statistical claims verified
  in code against INSEE/KOSIS (deterministic `compare()`) → the rest to web-search
  fallback. Mongo caches are best-effort no-ops without `MONGODB_URI`.

### Client (`app/page.tsx` + `app/ProfileDashboard.tsx`)
Single-page step machine: `start` (hero, scrolls into the choice screen) → `home`
(track search + URL/file verify boxes) → `profileLoading` (staged loader animation —
cosmetic; profile reads are instant) → `profile` (track record: summary numbers,
last-verification consistency/factuality charts, sector category TABS — one sector
shown at a time — per-statement consistency/factuality badges) → `analysis` (loader
during a live verify). Default language is **EN** (presentation language; KO one
toggle away); theme dark/light via `.dark` class; both persist in localStorage.

## Notes

- The plan PDFs in `01_planning/` and any OpenAI/Whisper mentions are historical —
  the code is the source of truth (Anthropic/Ollama, yt-dlp captions).
- The statement DB is auto-collected draft data — spot-verify quotes/dates against
  their `sourceUrl` before public/presentation use.
- The team push-watch cron and 기말-repo conventions: never auto-merge teammates'
  branches; detect and report only.
