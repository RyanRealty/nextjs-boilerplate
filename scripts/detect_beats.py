"""
detect_beats.py — Beat detection for Ryan Realty listing video audio sync.

Loads an audio file (mp3 or wav), runs librosa beat tracking and onset
detection, and writes a beats.json suitable for consumption by
listing_video_v4/src/lib/beats.ts in Remotion.

See video_production_skills/audio_sync/SKILL.md for full usage docs.
"""

import argparse
import json
import os
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Detect beats, downbeats, and onsets from an audio file and write "
            "a beats.json for Remotion beat-aligned cut snapping."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/detect_beats.py \\
    --audio listing_video_v4/public/audio/music_bed_v5.mp3 \\
    --output listing_video_v4/public/audio/beats.json

  python scripts/detect_beats.py \\
    --audio track.wav --output beats.json \\
    --hop-length 256 --tightness 400
        """,
    )
    parser.add_argument(
        "--audio",
        required=True,
        metavar="PATH",
        help="Path to input audio file (mp3 or wav).",
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="PATH",
        help="Path to write beats.json output.",
    )
    parser.add_argument(
        "--hop-length",
        type=int,
        default=512,
        metavar="N",
        help="librosa hop length in samples (default: 512). "
             "Lower values give finer time resolution but are slower.",
    )
    parser.add_argument(
        "--tightness",
        type=float,
        default=100.0,
        metavar="N",
        help="Beat-tracker tightness (default: 100). "
             "Raise to 400 for a strict metronomic grid; "
             "lower for tracks with expressive tempo fluctuation.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Import librosa inside main() so that --help works even when librosa is
    # not installed in the current environment.
    try:
        import librosa  # type: ignore[import]
        import numpy as np  # type: ignore[import]
    except ImportError as exc:
        print(
            f"ERROR: missing dependency — {exc}\n"
            "Run: pip install -r video_production_skills/audio_sync/requirements.txt",
            file=sys.stderr,
        )
        return 1

    audio_path = args.audio
    output_path = args.output
    hop = args.hop_length
    tightness = args.tightness

    # --- Validate input ---
    if not os.path.isfile(audio_path):
        print(f"ERROR: audio file not found: {audio_path}", file=sys.stderr)
        return 1

    # --- Load audio (preserve native sample rate) ---
    try:
        y, sr = librosa.load(audio_path, sr=None)
    except Exception as exc:
        print(f"ERROR: could not load audio file: {exc}", file=sys.stderr)
        return 1

    duration_s = float(len(y) / sr)
    audio_filename = os.path.basename(audio_path)
    print(f"loaded: {audio_filename} ({duration_s:.1f}s @ {sr}Hz)")

    # --- Beat tracking ---
    # Returns scalar tempo and beat frame indices.
    tempo_arr, beat_frames = librosa.beat.beat_track(
        y=y,
        sr=sr,
        hop_length=hop,
        tightness=tightness,
    )
    # librosa >= 0.10 returns tempo as a 1-element ndarray; flatten to scalar.
    tempo_bpm: float = float(np.atleast_1d(tempo_arr)[0])
    beat_times: list[float] = librosa.frames_to_time(
        beat_frames, sr=sr, hop_length=hop
    ).tolist()

    print(f"tempo: {tempo_bpm:.1f} BPM")
    print(f"beats: {len(beat_times)} detected")

    # --- Downbeats (heuristic: every 4th beat starting at index 0) ---
    # LIMITATION: librosa does not ship a robust downbeat detector.
    # This ÷4 heuristic assumes a consistent 4/4 time signature and that
    # the first detected beat is the downbeat of bar 1 — neither is guaranteed.
    # For higher accuracy see madmom (commented out in requirements.txt).
    downbeat_times: list[float] = beat_times[::4]

    # --- Onset detection ---
    onset_times: list[float] = librosa.onset.onset_detect(
        y=y,
        sr=sr,
        units="time",
        hop_length=hop,
    ).tolist()
    print(f"onsets: {len(onset_times)} detected")

    # --- Build output payload ---
    payload = {
        "audio": audio_filename,
        "duration_s": round(duration_s, 3),
        "tempo_bpm": round(tempo_bpm, 2),
        "beats": [round(t, 4) for t in beat_times],
        "downbeats": [round(t, 4) for t in downbeat_times],
        "onsets": [round(t, 4) for t in onset_times],
    }

    # --- Write output ---
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    try:
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
            fh.write("\n")
    except OSError as exc:
        print(f"ERROR: could not write output: {exc}", file=sys.stderr)
        return 1

    print(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
