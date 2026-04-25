#!/usr/bin/env python3
"""v5.1 VO: 11 sentences, each its own MP3, sequenced in Remotion at precise beat boundaries.
Documentary discipline: every line maps to a specific beat or beat group."""
import json, urllib.request, sys
from pathlib import Path

ROOT = Path("/Users/matthewryan/RyanRealty/listing_video_v4")
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "4YYIPFl9wE5c4L2eu2Gb"
MODEL = "eleven_multilingual_v2"

# Per-beat documentary script — each sentence locks to specific photo beats
SENTENCES = {
    "v51_s01": "In eighteen ninety two, William Vandevert came up from Texas with a wife named Sadie. They raised eight children on this land.",  # Beats 1+2
    "v51_s02": "Three of those children became doctors.",  # Beat 3
    "v51_s03": "They built the place by hand, moved by surrey, ran cattle and sheep across the meadow, and dipped every June. The family stayed until nineteen seventy.",  # Beats 4-7
    "v51_s04": "A century later, the ranch became a community of twenty homes across the same four hundred acres.",  # Beat 8
    "v51_s05": "This one was designed by Jerry Locati, who builds with steel, and stone, and timber, the way the West actually wears them.",  # Beats 9+10
    "v51_s06": "Built in twenty seventeen, four bedrooms and four and a half baths, with the full Cascade range out every west-facing window.",  # Beats 11+12+13
    "v51_s07": "A sunroom that watches the seasons turn over the pond.",  # Beat 17
    "v51_s08": "A fireplace under cover, where the day ends.",  # Beat 19
    "v51_s09": "Outside, the elk still cross the meadow at dawn.",  # Beat 20
    "v51_s10": "The Little Deschutes still runs cold and clear past the old homestead.",  # Beat 22
    "v51_s11": "Some places are not for sale every day. Some places are kept.",  # Beat 23
}

def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line: continue
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
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.85,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 0.88,
        },
    }
    print(f"[synth] {slug} ({len(txt)} chars)", file=sys.stderr)
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

# Probe each sentence's actual duration (seconds) for the Listing.tsx beat planner
import subprocess
FFMPEG = "/Users/matthewryan/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
print("\n[durations]", file=sys.stderr)
durations = {}
for slug in SENTENCES:
    out_path = OUT / f"{slug}.mp3"
    r = subprocess.run([FFMPEG, "-i", str(out_path)], capture_output=True, text=True)
    for line in r.stderr.split("\n"):
        if "Duration:" in line:
            # "Duration: 00:00:13.45, start: 0.025057, bitrate: 119 kb/s"
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            sec = int(h)*3600 + int(m)*60 + float(s)
            durations[slug] = round(sec, 2)
            print(f"  {slug}: {sec:.2f}s", file=sys.stderr)
            break

# Save duration map for Listing.tsx to import
(OUT / "vo_v51_durations.json").write_text(json.dumps(durations, indent=2))
print(f"\n[manifest] {OUT}/vo_v51_durations.json", file=sys.stderr)
