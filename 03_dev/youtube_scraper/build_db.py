"""
Transcript -> statement-DB builder.

Turns a scraper JSON (02_data/<id>.json, raw caption fragments) into clean,
self-contained political statements and appends them to the web app's statement
DB (03_dev/web/data/statements.json), which powers the self-consistency axis.

    scraper JSON ──▶ concatenate fragments ──▶ [Claude extracts statements] ──▶ statements.json

Each new entry: { id, politician, text, date, sourceUrl, topic, era, confidence }.

Usage:
  python build_db.py --json ../../02_data/<videoId>.json --politician "이재명"
  python build_db.py --json ../../02_data/<videoId>.json --politician "이재명" --dry   # preview only
  python build_db.py --json ../../02_data/<videoId>.json --politician "Donald Trump" --max 12
"""

from __future__ import annotations
import argparse
import json
import os
import re
import sys
from pathlib import Path

import anthropic

MODEL = "claude-sonnet-5"
HERE = Path(__file__).resolve().parent
DB_PATH = HERE.parent / "web" / "data" / "statements.json"
ENV_PATH = HERE.parent / "web" / ".env.local"

PREFIX = {"이재명": "lee", "Donald Trump": "trump", "Emmanuel Macron": "macron"}


def load_api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    # Fall back to the web app's .env.local
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit("ANTHROPIC_API_KEY not set (env or web/.env.local)")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r'[."“”\'’,·!?]', "", s.lower())).strip()


def build_prompt(politician: str, title: str, date: str, transcript: str) -> str:
    return "\n".join([
        f"You are building a database of {politician}'s notable public statements for a",
        "self-consistency checker (it flags when a politician later contradicts their own words).",
        f"Below is an auto-captioned transcript of {politician} — source: \"{title}\" ({date}).",
        "Auto-captions contain minor spelling/spacing errors; fix obvious ones but stay faithful.",
        "",
        "Extract the SUBSTANTIVE, self-contained statements: policy positions, promises,",
        "commitments, stances, and concrete factual/numeric claims. These are the things that",
        "could later be contradicted. Rules:",
        "- Each statement = ONE clean, grammatical sentence in the SAME language as the transcript.",
        "- Self-contained: understandable without surrounding context (resolve pronouns/topics).",
        "- EXCLUDE greetings, thanks, filler, procedural remarks, and vague rhetoric.",
        "- Merge fragmented caption lines into whole sentences.",
        "- Assign a short topic (e.g. 경제 / 외교 / 안보 / 복지 / economy / foreign-policy).",
        "- Prefer distinct, quotable positions over near-duplicates.",
        "",
        "Respond with ONLY a JSON object of this exact shape (no prose, no code fences):",
        '{ "statements": [ { "text": string, "topic": string } ] }',
        "",
        "[Transcript]",
        transcript,
    ])


def extract(client, politician, title, date, transcript, max_n):
    res = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": build_prompt(politician, title, date, transcript)}],
    )
    text = "".join(b.text for b in res.content if getattr(b, "type", "") == "text")
    m = re.search(r"\{.*\}", text, re.S)
    data = json.loads(m.group(0) if m else text)
    out = data.get("statements", [])
    return out[:max_n] if max_n else out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True, help="scraper JSON path (02_data/<id>.json)")
    ap.add_argument("--politician", required=True, help="exact DB name, e.g. 이재명")
    ap.add_argument("--max", type=int, default=15)
    ap.add_argument("--dry", action="store_true", help="preview, do not write to the DB")
    args = ap.parse_args()

    scraped = json.loads(Path(args.json).read_text(encoding="utf-8"))
    src = scraped.get("source", {})
    title = src.get("title", "")
    date = src.get("uploadDate", "")
    url = src.get("url", "")
    vid = src.get("videoId", "vid")
    transcript = " ".join(l["text"] for l in scraped.get("lines", []))
    print(f"> {args.politician} | {title[:50]} ({date}) | {len(scraped.get('lines', []))} fragments")

    client = anthropic.Anthropic(api_key=load_api_key())
    statements = extract(client, args.politician, title, date, transcript, args.max)
    print(f"> extracted {len(statements)} statements")

    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    existing = {norm(s["text"]) for s in db}
    prefix = PREFIX.get(args.politician, re.sub(r"\W+", "", args.politician.lower())[:5])

    added = []
    for i, s in enumerate(statements):
        t = (s.get("text") or "").strip()
        if not t or norm(t) in existing:
            continue
        existing.add(norm(t))
        added.append({
            "id": f"{prefix}-yt-{vid[:6]}-{i:02d}",
            "politician": args.politician,
            "text": t,
            "date": date,
            "sourceUrl": url,
            "topic": (s.get("topic") or "").strip(),
            "era": "youtube-scraped",
            "confidence": 0.6,
        })

    print(f"> {len(added)} new (after dedupe)")
    for a in added:
        print(f"   [{a['topic']}] {a['text'][:80]}")

    if args.dry:
        print("\n(dry run — DB not modified)")
        return
    db.extend(added)
    DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nOK — statements.json now has {len(db)} entries (+{len(added)})")


if __name__ == "__main__":
    main()
