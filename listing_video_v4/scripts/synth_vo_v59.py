#!/usr/bin/env python3
"""v5.9 viral cut — only 2 VO lines.

- v59_hook: NEW — "A Jerry Locati design. On the Little Deschutes."
  Plays 0.4-end of beat 1. Covers Locati mention + location anchor in one
  hook (Matt: keep Locati mention).
- v56_s11 (already on disk): "Not every story starts on the market. This one
  started with a conversation." (5.28s). Reused.

No music in v5.9 — Matt will add his own. VO-only audio.
"""
import json, urllib.request, sys, subprocess
from pathlib import Path

ROOT = Path("/Users/matthewryan/RyanRealty/listing_video_v4")
OUT = ROOT / "public" / "audio"

VOICE = "4YYIPFl9wE5c4L2eu2Gb"
MODEL = "eleven_multilingual_v2"


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


HOOK_TEXT = "A Jerry Locati design. On the Little Deschutes."

out_path = OUT / "v59_hook.mp3"
if out_path.exists():
    out_path.unlink()

payload = {
    "text": HOOK_TEXT,
    "model_id": MODEL,
    "voice_settings": {
        "stability": 0.55,
        "similarity_boost": 0.85,
        "style": 0.0,
        "use_speaker_boost": True,
        "speed": 0.88,
    },
}

print(f"[synth] v59_hook (NEW viral hook line)", file=sys.stderr)
req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}",
    data=json.dumps(payload).encode(),
    headers={
        "xi-api-key": KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
        "User-Agent": "curl/8.4",
    },
)
resp = urllib.request.urlopen(req)
out_path.write_bytes(resp.read())
print(f"  -> {out_path.name} ({out_path.stat().st_size/1024:.0f}KB)", file=sys.stderr)

FFMPEG = "/Users/matthewryan/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
r = subprocess.run([FFMPEG, "-i", str(out_path)], capture_output=True, text=True)
for line in r.stderr.split("\n"):
    if "Duration:" in line:
        t = line.split("Duration:")[1].split(",")[0].strip()
        h, m, s = t.split(":")
        sec = int(h) * 3600 + int(m) * 60 + float(s)
        print(f"\n  v59_hook duration: {sec:.2f}s", file=sys.stderr)
        break
