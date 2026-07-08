# YouTube Political-Broadcast Scraper

Give it a YouTube URL of a political program and it **extracts the spoken
statements** into JSON that our analysis pipeline (contradiction detection +
fact-check) can consume directly.

## Strategy (cheapest / fastest first)
1. **If the video has captions (manual or auto), grab them** → no STT, free, fast
2. If there are no captions and `--whisper` is set, **download the audio and
   transcribe it with OpenAI Whisper**

Captions are fetched via **yt-dlp** (json3 subtitles); `youtube-transcript-api`
is kept only as an optional fallback.

## Install
```bash
cd "03_dev/youtube_scraper"
python3 -m venv .venv
source .venv/bin/activate          # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
# For the audio->Whisper fallback you also need ffmpeg (mac: brew install ffmpeg)
```

## Usage
```bash
# Captions only (default, free)
python scraper.py "https://www.youtube.com/watch?v=XXXXXXXXXXX"

# Set preferred languages / output folder
python scraper.py "<url>" --lang ko,en --out ../../02_data

# When there are no captions, fall back to audio -> Whisper (needs OPENAI_API_KEY)
export OPENAI_API_KEY=sk-...
python scraper.py "<url>" --whisper
```

## Output
Default output folder follows the project convention: **`../../02_data/`**
(falls back to `./output`). Filename is `{videoId}.json`.

```json
{
  "source": {
    "url": "...", "videoId": "...", "title": "...",
    "channel": "...", "uploadDate": "2026-07-08", "duration": 1234
  },
  "transcriptSource": "youtube_captions",
  "language": "ko",
  "lineCount": 240,
  "lines": [
    { "text": "There will be no tax increase.", "start": 12.3, "duration": 3.1 }
  ]
}
```

## Pipeline integration
Each `lines` entry `{ text, start, duration }` is compatible with the project's
`SpokenLine` model. Feed this JSON straight into `/api/analyze` (contradiction)
and `/api/factcheck` (factuality).

## Notes
- Auto-generated captions may have typos / missing punctuation → a human review
  before analysis is recommended.
- YouTube may rate-limit (HTTP 429) requests from data-center IPs; on a normal
  network this is fine, and the code still parses whatever captions it did get.
- Use within YouTube's ToS / copyright (educational & research purposes).
- Do not commit `.venv/` or temporary audio files (see `.gitignore`).
