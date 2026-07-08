# media-hackaton — Political Statement Contradiction & Fact Checker

Epitech Summer School hackathon final project (Journalism × AI track).

## What it does
A web tool that verifies a politician's statements along **two independent axes**:

1. **Self-consistency** — does a statement contradict the person's *own* past
   statements? (side-agnostic, politically neutral — we only hold a politician to
   their own words)
2. **Factuality (fact-check)** — is the claim actually true? Cross-checked against
   official government statistics (**INSEE** for France, **KOSIS** for Korea) and
   Claude web search.

**Vision:** real-time detection during a live political broadcast.
**This hackathon demo:** upload post-broadcast footage → extract statements →
detect contradictions + compute a consistency %, and fact-check factual claims
(true / false / unverifiable, with sources).

## Tech stack
- **Frontend/Backend:** Next.js (App Router) + TypeScript + Tailwind + API Routes
- **AI:** Claude API (`claude-opus-4-8`) — contradiction verdicts + fact-check
  (with the web-search server tool), structured outputs
- **STT:** OpenAI Whisper (video → text); YouTube captions when available
- **Official stats:** INSEE (France) & KOSIS (Korea) OpenAPIs
- **Deploy:** Vercel

## Repository structure
| Folder | Contents |
|--------|----------|
| `01_planning/` | Development plan (EN + KO PDF) |
| `02_data/` | `statements.json` (past-statement DB), transcripts, analysis inputs |
| `03_dev/` | Application code (Next.js app, Python tools) |
| `04_design/` | UI mockups, poster, timeline visual |
| `05_presentation/` | Pitch script, slides, demo scenario |
| `06_references/` | Research, trust statistics, source clips |

## What's here so far
- **`01_planning/`** — full development plan (roadmap + code/prompt examples), in
  English and Korean.
- **`03_dev/youtube_scraper/`** — Python tool: YouTube URL → extract spoken
  statements → JSON for the analysis pipeline. See its README to run it.

## Getting started (scraper)
```bash
cd 03_dev/youtube_scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scraper.py "<youtube_url>" --lang ko,en
# → writes 02_data/{videoId}.json
```

## Team
Epitech Summer School — media hackathon team.
