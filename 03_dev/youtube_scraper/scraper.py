"""
YouTube political-broadcast scraper
===================================
Takes a YouTube URL of a political program and extracts the spoken statements,
saving them as JSON that the analysis pipeline (contradiction + fact-check) can
consume directly.

Strategy (cheapest / fastest first):
  1) If the video has captions (manual or auto), grab them  -> no STT, free, fast
  2) If no captions and --whisper is set, download the audio and transcribe it
     with OpenAI Whisper

Output JSON schema (compatible with the project's SpokenLine model):
{
  "source": { "url", "videoId", "title", "channel", "uploadDate", "duration" },
  "transcriptSource": "youtube_captions" | "whisper",
  "language": "ko",
  "lines": [ { "text": "...", "start": 12.3, "duration": 4.1 } ]
}

Usage:
  python scraper.py <youtube_url_or_id>
  python scraper.py <url> --lang ko,en --out ../../02_data
  python scraper.py <url> --whisper          # audio -> Whisper when no captions
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────
def extract_video_id(url_or_id: str) -> str:
    """Extract the 11-char video id from various YouTube URL forms."""
    s = url_or_id.strip()
    # Already a bare id
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    patterns = [
        r"(?:v=|/videos/|embed/|youtu\.be/|/v/|/shorts/|/live/)([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, s)
        if m:
            return m.group(1)
    raise ValueError(f"Could not find a valid YouTube video id in: {url_or_id}")


def default_out_dir(script_path: Path) -> Path:
    """Default output folder: project convention ../../02_data, else ./output."""
    candidate = script_path.resolve().parent.parent.parent / "02_data"
    return candidate if candidate.is_dir() else script_path.resolve().parent / "output"


# ─────────────────────────────────────────────────────────────
# 1) Metadata (yt-dlp)
# ─────────────────────────────────────────────────────────────
def get_metadata(url: str) -> dict:
    import yt_dlp

    opts = {"quiet": True, "skip_download": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    upload = info.get("upload_date")  # "YYYYMMDD"
    if upload and len(upload) == 8:
        upload = f"{upload[:4]}-{upload[4:6]}-{upload[6:]}"
    return {
        "url": info.get("webpage_url", url),
        "videoId": info.get("id"),
        "title": info.get("title"),
        "channel": info.get("uploader") or info.get("channel"),
        "uploadDate": upload,
        "duration": info.get("duration"),  # seconds
    }


# ─────────────────────────────────────────────────────────────
# 2) Captions
#    Primary path: fetch json3 subtitles via yt-dlp (same client as metadata,
#                  so it's reliable).
#    Fallback path: youtube-transcript-api (used only if installed & primary fails).
# ─────────────────────────────────────────────────────────────
def _parse_json3(path: Path) -> list[dict]:
    """Parse a YouTube json3 subtitle file -> [{text,start,duration}]."""
    data = json.loads(path.read_text(encoding="utf-8"))
    segs = []
    for ev in data.get("events", []):
        if "segs" not in ev:
            continue
        text = "".join(s.get("utf8", "") for s in ev["segs"]).strip()
        if not text:
            continue
        segs.append(
            {
                "text": text,
                "start": round(ev.get("tStartMs", 0) / 1000.0, 3),
                "duration": round(ev.get("dDurationMs", 0) / 1000.0, 3),
            }
        )
    return segs


def _captions_via_ytdlp(url: str, video_id: str, langs: list[str], tmp_dir: Path) -> tuple[list[dict], str] | None:
    import yt_dlp

    tmp_dir.mkdir(parents=True, exist_ok=True)
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,        # never download the video itself
        "writesubtitles": True,       # manual subtitles
        "writeautomaticsub": True,    # auto-generated subtitles
        "subtitleslangs": langs,
        "subtitlesformat": "json3",
        "ignoreerrors": True,         # keep going even if one language fails
        "outtmpl": str(tmp_dir / "%(id)s"),
    }
    # Even if some language 429s, still parse whatever subtitle files were written.
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)
    except Exception as e:
        print(f"  · (ignoring partial subtitle download error: {e})", file=sys.stderr)
    vid = video_id
    # Look up files by preferred language (id.ko.json3, id.ko-orig.json3, id.en.json3 ...)
    for lang in langs:
        for f in sorted(tmp_dir.glob(f"{vid}.{lang}*.json3")):
            segs = _parse_json3(f)
            if segs:
                return segs, lang
    # Any json3, regardless of language
    for f in sorted(tmp_dir.glob(f"{vid}*.json3")):
        segs = _parse_json3(f)
        if segs:
            parts = f.name.split(".")
            lang = parts[-2] if len(parts) >= 3 else langs[0]
            return segs, lang
    return None


def _captions_via_transcript_api(video_id: str, langs: list[str]) -> tuple[list[dict], str] | None:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return None
    try:
        tl = YouTubeTranscriptApi.list_transcripts(video_id)
        try:
            t = tl.find_transcript(langs)
        except Exception:
            t = tl.find_generated_transcript(langs)
        data = t.fetch()
        segs = [
            {"text": d["text"], "start": float(d["start"]), "duration": float(d.get("duration", 0.0))}
            for d in data
        ]
        return segs, t.language_code
    except Exception:
        return None


def fetch_captions(url: str, video_id: str, langs: list[str], tmp_dir: Path) -> tuple[list[dict], str] | None:
    """Return captions as [{text,start,duration}], or None. (segments, language)."""
    try:
        res = _captions_via_ytdlp(url, video_id, langs, tmp_dir)
        if res:
            return res
    except Exception as e:
        print(f"  ! yt-dlp captions failed: {e}", file=sys.stderr)
    # Fallback
    res = _captions_via_transcript_api(video_id, langs)
    if res:
        return res
    return None


# ─────────────────────────────────────────────────────────────
# 3) Audio download + Whisper transcription (fallback)
# ─────────────────────────────────────────────────────────────
def download_audio(url: str, out_path: Path) -> Path:
    import yt_dlp

    base = str(out_path.with_suffix(""))  # without extension
    opts = {
        "format": "bestaudio/best",
        "outtmpl": base + ".%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "128"}
        ],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    mp3 = Path(base + ".mp3")
    if not mp3.exists():
        raise RuntimeError("Audio extraction failed (check ffmpeg)")
    return mp3


def transcribe_whisper(audio_path: Path, lang: str = "ko") -> list[dict]:
    """Transcribe with OpenAI Whisper. Requires OPENAI_API_KEY. Returns [{text,start,duration}]."""
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set (cannot run Whisper)")
    from openai import OpenAI

    client = OpenAI()
    with open(audio_path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=lang,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    segs = []
    for s in getattr(resp, "segments", []) or []:
        start = s.get("start") if isinstance(s, dict) else s.start
        end = s.get("end") if isinstance(s, dict) else s.end
        text = (s.get("text") if isinstance(s, dict) else s.text).strip()
        segs.append({"text": text, "start": float(start), "duration": float(end - start)})
    return segs


# ─────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────
def scrape(url: str, langs: list[str], out_dir: Path, use_whisper: bool) -> Path:
    video_id = extract_video_id(url)
    print(f"> video id: {video_id}")

    print("> fetching metadata...")
    meta = get_metadata(url)
    print(f"  - {meta.get('title')}  ({meta.get('channel')}, {meta.get('uploadDate')})")

    print("> fetching captions...")
    sub_tmp = out_dir / ".subtmp"
    result = fetch_captions(url, video_id, langs, sub_tmp)

    if result:
        lines, lang = result
        transcript_source = "youtube_captions"
        print(f"  - got {len(lines)} caption segments (language: {lang})")
        # clean up temp subtitle files
        for f in sub_tmp.glob(f"{video_id}*"):
            f.unlink(missing_ok=True)
        try:
            sub_tmp.rmdir()
        except OSError:
            pass
    elif use_whisper:
        print("> no captions -> downloading audio and transcribing with Whisper...")
        tmp = out_dir / f"{video_id}_audio"
        audio = download_audio(url, tmp)
        lines = transcribe_whisper(audio, lang=langs[0])
        lang = langs[0]
        transcript_source = "whisper"
        audio.unlink(missing_ok=True)
        print(f"  - Whisper produced {len(lines)} segments")
    else:
        print(
            "  ! No captions found. Try the --whisper option to transcribe the audio.",
            file=sys.stderr,
        )
        sys.exit(2)

    payload = {
        "source": meta,
        "transcriptSource": transcript_source,
        "language": lang,
        "lineCount": len(lines),
        "lines": lines,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{video_id}.json"
    out_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK saved: {out_file}")
    return out_file


def main():
    parser = argparse.ArgumentParser(description="YouTube political-broadcast scraper")
    parser.add_argument("url", help="YouTube URL or video id")
    parser.add_argument(
        "--lang",
        default="ko,en",
        help="Preferred caption languages, comma-separated (default: ko,en)",
    )
    parser.add_argument("--out", default=None, help="Output folder (default: ../../02_data)")
    parser.add_argument(
        "--whisper",
        action="store_true",
        help="If there are no captions, download audio and transcribe with Whisper (needs OPENAI_API_KEY)",
    )
    args = parser.parse_args()

    langs = [x.strip() for x in args.lang.split(",") if x.strip()]
    out_dir = Path(args.out) if args.out else default_out_dir(Path(__file__))

    scrape(args.url, langs, out_dir, args.whisper)


if __name__ == "__main__":
    main()
