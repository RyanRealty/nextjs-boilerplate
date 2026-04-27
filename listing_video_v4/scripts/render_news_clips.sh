#!/bin/bash
# Sequential render of GH + SBC news clips (run after Tariffs).
set -e
cd /Users/matthewryan/RyanRealty/listing_video_v4

# Kill any stale ffprobe / chrome / remotion procs first (these block rendering).
pkill -9 -f "ffprobe" 2>/dev/null || true
pkill -9 -f "chrome-headless-shell" 2>/dev/null || true
pkill -9 -f "@remotion/compositor" 2>/dev/null || true
sleep 2

echo ">>> Rendering NewsGoldenHandcuffs"
npx remotion render src/index.ts NewsGoldenHandcuffs out/news_golden_handcuffs.mp4 --codec h264 --concurrency 1 --crf 22 --image-format=jpeg --jpeg-quality=92

echo ">>> Rendering NewsSunBeltCorrection"
npx remotion render src/index.ts NewsSunBeltCorrection out/news_sunbelt_correction.mp4 --codec h264 --concurrency 1 --crf 22 --image-format=jpeg --jpeg-quality=92

echo ">>> All news renders done"
ls -la out/news_*.mp4
