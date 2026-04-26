/**
 * beats.ts — Beat-sync utilities for Remotion listing video compositions.
 *
 * Consume the beats.json produced by scripts/detect_beats.py and snap
 * cut start times to musical beat positions.
 *
 * See video_production_skills/audio_sync/SKILL.md for full usage docs.
 */

/** Shape of the beats.json file produced by scripts/detect_beats.py. */
export type BeatsManifest = {
  audio: string;
  duration_s: number;
  tempo_bpm: number;
  /** All beat timestamps in seconds (librosa beat_track output). */
  beats: number[];
  /** Bar-1-beat-1 timestamps — every 4th beat from index 0 (heuristic). */
  downbeats: number[];
  /** Sharp transient onsets — useful for percussive cut points. */
  onsets: number[];
};

/**
 * Returns the closest value in `beats` to `timeSec`.
 * If the nearest beat is within `maxDelta` seconds, returns that beat time;
 * otherwise returns the original `timeSec` unchanged.
 */
export function snapToNearestBeat(
  timeSec: number,
  beats: number[],
  maxDelta = 0.15,
): number {
  if (beats.length === 0) return timeSec;

  let closestBeat = beats[0];
  let closestDelta = Math.abs(beats[0] - timeSec);

  for (let i = 1; i < beats.length; i++) {
    const delta = Math.abs(beats[i] - timeSec);
    if (delta < closestDelta) {
      closestDelta = delta;
      closestBeat = beats[i];
    }
  }

  return closestDelta <= maxDelta ? closestBeat : timeSec;
}

/**
 * Applies `snapToNearestBeat` to each element in `startSecs` and returns
 * the resulting array in the same order.
 */
export function snapBeatsArray(
  startSecs: number[],
  beats: number[],
  maxDelta = 0.15,
): number[] {
  return startSecs.map((t) => snapToNearestBeat(t, beats, maxDelta));
}

/**
 * Enforces the master-skill hard rule (VIDEO_PRODUCTION_SKILL.md §1):
 * no beat shorter than `minDur` seconds, no beat longer than `maxDur` seconds.
 *
 * Given an array of sorted start times (already snapped), this function:
 *   - Drops any start time that is less than `minDur` after the previous one.
 *   - Inserts a fallback start at `prev + maxDur` whenever the gap to the
 *     next retained start would exceed `maxDur`, preventing blank screen time.
 *
 * Returns a new sorted array of start times satisfying both bounds.
 */
export function enforceBeatBounds(
  snapped: number[],
  minDur = 2.0,
  maxDur = 4.0,
): number[] {
  if (snapped.length === 0) return [];

  const result: number[] = [snapped[0]];
  let prev = snapped[0];

  for (let i = 1; i < snapped.length; i++) {
    const gap = snapped[i] - prev;

    if (gap < minDur) {
      // Too close — drop this cut, keep scanning.
      continue;
    }

    if (gap > maxDur) {
      // Gap too large — insert a fallback cut at prev + maxDur first.
      const fallback = prev + maxDur;
      result.push(fallback);
      prev = fallback;
      // Re-evaluate snapped[i] against the new prev.
      i--; // revisit snapped[i] on the next iteration
      continue;
    }

    result.push(snapped[i]);
    prev = snapped[i];
  }

  return result;
}
