import type { Aspect } from './brand'

// ---------------------------------------------------------------------------
// Word timing — from ElevenLabs forced-alignment API.
// ---------------------------------------------------------------------------
export type WordTiming = {
  text: string
  startSec: number
  endSec: number
}

// ---------------------------------------------------------------------------
// Event data — one entry per beat (Beats 1-5).
// ---------------------------------------------------------------------------
export type EventData = {
  /** Slug used for the image filename: public/images/<slug>.jpg */
  slug: string
  /** Display title — shown in Amboqia on the event card. */
  title: string
  /** Day + time line, e.g. "Friday–Saturday · 5 PM" */
  date_time: string
  /** Venue name, e.g. "Tower Theatre" */
  venue: string
  /** Brief descriptor for VO script context (not shown on screen). */
  description: string
  /** Attribution string shown in the credit pill: "Photo: Name" */
  photo_credit: string
}

// ---------------------------------------------------------------------------
// Top-level composition props.
// ---------------------------------------------------------------------------
export type VideoProps = {
  /** Five weekend events (Beats 1-5). */
  events: EventData[]
  /** Path to voiceover MP3 relative to public/. Empty string = no audio. */
  voPath: string
  /** Word-level alignment from ElevenLabs forced-alignment. Empty array during dev. */
  captionWords: WordTiming[]
  /**
   * Per-beat durations in seconds.
   * Length = 7: [intro, beat1, beat2, beat3, beat4, beat5, outro]
   * Beat 0 (intro) and Beat 6 (outro) are silent; values come from
   * VO alignment for beats 1-5.
   */
  beatDurations: number[]
  /** Which aspect ratio to render. Determines dims + safe zones. */
  aspect: Aspect
  /** Dateline text shown on the intro card, e.g. "MAY 8-10, 2026" */
  dateline: string
  /** Outro call-to-action line, e.g. "MORE AT VISITBEND.COM/EVENTS" */
  outroCta: string
}
