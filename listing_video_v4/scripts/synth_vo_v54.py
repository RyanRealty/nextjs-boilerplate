#!/usr/bin/env python3
"""v5.4 VO: 5 sentences re-synthed or newly added per Matt's v5.3 review."""
import json, urllib.request, sys, subprocess
from pathlib import Path

ROOT = Path("/Users/matthewryan/RyanRealty/listing_video_v4")
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "4YYIPFl9wE5c4L2eu2Gb"
MODEL = "eleven_multilingual_v2"

SENTENCES = {
    "v54_s03b": "And the children kept their days at the river.",
    "v54_s04": "A century after they came, twenty homes share four hundred acres.",
    "v54_s06b": "The home itself is a looking glass on the West.",
    "v54_s10": "Trout fill the streams. The Little Dish Shoots still runs cold and clear past the old homestead.",
    "v54_s11": "A house like this changes hands once a generation.",
}


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


env = load_env(Path("/Users/matthewryan/RyanRealty/.env.local"))
KEY = env["ELEVENLABS_API_KEY"]

for slug, txt in SENTENCES.items():
    out_path = OUT / f"{slug}.mp3"
    if out_path.exists() and out_path.stat().st_size > 1024:
        print(f"[skip] {slug} exists", file=sys.stderr)
        continue
    payload = {
        "text": txt,
        "model_id": MODEL,
        "voice_settings": {"stability": 0.55, "similarity_boost": 0.85, "style": 0.0,
                            "use_speaker_boost": True, "speed": 0.88},
    }
    print(f"[synth] {slug}", file=sys.stderr)
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}",
        data=json.dumps(payload).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json",
                  "Accept": "audio/mpeg", "User-Agent": "curl/8.4"},
    )
    resp = urllib.request.urlopen(req)
    out_path.write_bytes(resp.read())
    print(f"  -> {out_path.name} ({out_path.stat().st_size/1024:.0f}KB)", file=sys.stderr)

FFMPEG = "/Users/matthewryan/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
durations = {}
for slug in SENTENCES:
    p = OUT / f"{slug}.mp3"
    if not p.exists():
        continue
    r = subprocess.run([FFMPEG, "-i", str(p)], capture_output=True, text=True)
    for line in r.stderr.split("\n"):
        if "Duration:" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            durations[slug] = round(int(h) * 3600 + int(m) * 60 + float(s), 2)
            print(f"  {slug}: {durations[slug]}s", file=sys.stderr)
            break

(OUT / "vo_v54_durations.json").write_text(json.dumps(durations, indent=2))
