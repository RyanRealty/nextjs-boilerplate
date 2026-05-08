import React from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import {
  ColdOpen,
  EndCard,
  TitleCard,
  CaptionBand,
  COLORS,
  FONTS,
  sec,
  type AlignedWord,
} from '../brand'

/**
 * Episode 1 — "The Empty Room"
 *
 * 60-second composition. Beat sheet locked in
 * video_production_skills/earnest/SEASON_1_TREATMENTS.md §"Episode 1".
 *
 * Scaffold only: hero shots are placeholder dark frames awaiting
 * Veo 3.1 renders out of the Higgsfield pipeline. Caption alignment
 * is hand-stubbed for now; production replaces with the real
 * ElevenLabs `/v1/forced-alignment` JSON for the Hume Octave Voice.
 *
 * Composition layout (frames @ 30fps, total 1800 = 60s):
 *   0–60      ColdOpen (2s)
 *   60–840    Beats 1–6 setup (cold-open hand-off → Linda + kitchen + bookshelf
 *              + hallway + family photo)
 *   840–939   TitleCard "She told her kids to live their own lives." E01 (3.3s)
 *   939–1680  Beats 7–11 pressure + interior monologue (empty bedroom →
 *              dust line → Voice line → second door → held hand on knob)
 *   1680–1800 EndCard (4s)
 */

// Stub alignment data for Linda's two narrated lines. Replace with the
// real `/v1/forced-alignment` JSON once the Hume Octave VO renders.
const LINDA_VOICE_ALIGNMENT_STUB: AlignedWord[] = [
  // "She told her kids to live their own lives." — at ~38s in episode
  { text: 'She', start: 38.0, end: 38.18 },
  { text: 'told', start: 38.2, end: 38.4 },
  { text: 'her', start: 38.42, end: 38.55 },
  { text: 'kids', start: 38.57, end: 38.85 },
  { text: 'to', start: 38.9, end: 39.02 },
  { text: 'live', start: 39.05, end: 39.3 },
  { text: 'their', start: 39.32, end: 39.5 },
  { text: 'own', start: 39.52, end: 39.75 },
  { text: 'lives.', start: 39.77, end: 40.2 },
  // "She has not been in this room since the funeral." — at ~50s
  { text: 'She', start: 50.0, end: 50.18 },
  { text: 'has', start: 50.2, end: 50.38 },
  { text: 'not', start: 50.4, end: 50.6 },
  { text: 'been', start: 50.62, end: 50.85 },
  { text: 'in', start: 50.87, end: 51.0 },
  { text: 'this', start: 51.02, end: 51.22 },
  { text: 'room', start: 51.24, end: 51.55 },
  { text: 'since', start: 51.57, end: 51.85 },
  { text: 'the', start: 51.87, end: 52.0 },
  { text: 'funeral.', start: 52.02, end: 52.6 },
]

export const Episode1: React.FC = () => {
  const { durationInFrames } = useVideoConfig()

  // Cold open + title card + end card durations.
  const COLD_OPEN_DURATION = sec(2.0) // 60
  const TITLE_CARD_START = sec(28.0) // 840
  const TITLE_CARD_DURATION = sec(3.3) // 99
  const END_CARD_DURATION = sec(4.0) // 120
  const END_CARD_START = durationInFrames - END_CARD_DURATION // 1800-120 = 1680

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      {/* Cold open */}
      <Sequence from={0} durationInFrames={COLD_OPEN_DURATION}>
        <ColdOpen />
      </Sequence>

      {/* Body — placeholder slate for hero shots not yet rendered */}
      <Sequence
        from={COLD_OPEN_DURATION}
        durationInFrames={END_CARD_START - COLD_OPEN_DURATION}
      >
        <PlaceholderBody />
      </Sequence>

      {/* Title card at 50% mark — sits on top of the body slate */}
      <Sequence from={TITLE_CARD_START} durationInFrames={TITLE_CARD_DURATION}>
        <TitleCard
          pullQuote="She told her kids to live their own lives."
          episodeTag="E01"
        />
      </Sequence>

      {/* Captions for The Voice's narration. Renders across the body. */}
      <Sequence
        from={COLD_OPEN_DURATION}
        durationInFrames={END_CARD_START - COLD_OPEN_DURATION}
      >
        <CaptionBand
          words={LINDA_VOICE_ALIGNMENT_STUB}
          offsetSeconds={2.0}
        />
      </Sequence>

      {/* End card */}
      <Sequence from={END_CARD_START} durationInFrames={END_CARD_DURATION}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  )
}

/** Placeholder while the Veo 3.1 hero shots are still being generated.
 *  Renders an ink slate with a single small note for the studio reviewer. */
const PlaceholderBody: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: COLORS.ink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        fontFamily: FONTS.body,
        color: COLORS.bone,
        opacity: 0.4,
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 16 }}>Linda — body shots</div>
      <div style={{ fontSize: 28 }}>
        Awaiting Higgsfield Soul 2.0 renders per
      </div>
      <div style={{ fontSize: 28 }}>
        SEASON_1_TREATMENTS.md §"Episode 1"
      </div>
    </div>
  </AbsoluteFill>
)
