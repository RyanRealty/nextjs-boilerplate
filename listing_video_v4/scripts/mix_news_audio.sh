#!/bin/bash
# Post-mix VO audio into rendered MP4 (workaround for Remotion v4.0.290 audio-mixing hang).
set -e

FFMPEG=/Users/matthewryan/.local/bin/ffmpeg
ROOT=/Users/matthewryan/RyanRealty/listing_video_v4
cd "$ROOT"

# mix_clip <video_slug> <audio_slug> <f1> <f2> <f3> <f4> <f5>
mix_clip() {
  local VIDEO=$1
  local AUDIO=$2
  local F1=$3 F2=$4 F3=$5 F4=$6 F5=$7
  local IN_MP4="$ROOT/out/news_${VIDEO}.mp4"
  local TMP_MP4="$ROOT/out/news_${VIDEO}_with_audio.mp4"
  local AUD="$ROOT/public/audio"

  local T1=$(echo "scale=3; $F1/30" | bc)
  local T2=$(echo "scale=3; $F2/30" | bc)
  local T3=$(echo "scale=3; $F3/30" | bc)
  local T4=$(echo "scale=3; $F4/30" | bc)
  local T5=$(echo "scale=3; $F5/30" | bc)

  echo ">>> Mixing $VIDEO VO ($AUDIO) at frames $F1 $F2 $F3 $F4 $F5 (${T1}s ${T2}s ${T3}s ${T4}s ${T5}s)"

  $FFMPEG -y -i "$IN_MP4" \
    -itsoffset "$T1" -i "$AUD/news_${AUDIO}_s01.mp3" \
    -itsoffset "$T2" -i "$AUD/news_${AUDIO}_s02.mp3" \
    -itsoffset "$T3" -i "$AUD/news_${AUDIO}_s03.mp3" \
    -itsoffset "$T4" -i "$AUD/news_${AUDIO}_s04.mp3" \
    -itsoffset "$T5" -i "$AUD/news_${AUDIO}_s05.mp3" \
    -filter_complex "[1:a][2:a][3:a][4:a][5:a]amix=inputs=5:duration=longest:dropout_transition=0:normalize=0[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$TMP_MP4" 2>&1 | tail -3

  mv "$TMP_MP4" "$IN_MP4"
  ls -la "$IN_MP4"
}

mix_clip tariffs            tariffs 0  65  250 450 615
mix_clip golden_handcuffs   gh      0  70  235 415 585
mix_clip sunbelt_correction sbc     0  75  245 465 595

echo ">>> All news clips have audio"
ls -la "$ROOT/out/news_"*.mp4
