// Top-level composition.
// Routes by aspect (via SafeZoneProvider) to layout-aware child components.
// All 5 aspects share one BEATS array and one set of components — no duplicate logic.
//
// Beat layout:
//   0        IntroTitle    (silent, 3.0s)
//   1..5     EventCard     (with VO + captions)
//   6        Outro         (silent, 2.5s)

import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFonts } from './fonts'
import { FPS, DIMS } from './brand'
import { SafeZoneProvider } from './SafeZones'
import { CaptionBand } from './CaptionBand'
import { IntroTitle } from './IntroTitle'
import { EventCard } from './EventCard'
import { Outro } from './Outro'
import { Transition, nextTransition, type TransitionType } from './Transition'
import React from 'react'
import type { VideoProps } from './VideoProps'

// TransitionWrapper reads local frame via useCurrentFrame (inside a Sequence).
// Must be defined INSIDE a Sequence so useCurrentFrame has the right context.
const TransitionWrapper: React.FC<{
  type: TransitionType
  transFrames: number
  children: React.ReactNode
}> = ({ type, transFrames, children }) => {
  const frame = useCurrentFrame()
  const progress = Math.min(1, frame / transFrames)
  return <Transition type={type} progress={progress}>{children}</Transition>
}

const toFrames = (sec: number) => Math.max(1, Math.round(sec * FPS))

// Transition duration in frames (0.5s).
const TRANS_FRAMES = 15

export const computeDurationFrames = (props: VideoProps): number => {
  return props.beatDurations.reduce((s, d) => s + toFrames(d), 0)
}

export const WeekendEvents: React.FC<VideoProps> = (props) => {
  const { events, voPath, captionWords, beatDurations, aspect, dateline, outroCta } = props
  void loadFonts()

  const { durationInFrames: totalFrames } = useVideoConfig()
  const dims = DIMS[aspect]

  // Beat frame counts from props.
  // Index 0 = intro, 1-5 = events, 6 = outro.
  const beatFrames = beatDurations.map(toFrames)

  // Cursor and transition-type assignment.
  let cursor = 0
  let prevTransition: TransitionType | null = null

  // Intro — beat 0.
  const introFrames = beatFrames[0] ?? toFrames(3.0)
  const introStart  = cursor
  cursor += introFrames

  // Event beats — 1..5.
  const eventBeats: Array<{ start: number; frames: number; transType: TransitionType }> = []
  for (let i = 0; i < events.length; i++) {
    const beatIdx = i + 1
    const frames  = beatFrames[beatIdx] ?? toFrames(5.0)
    const tType   = nextTransition(prevTransition)
    eventBeats.push({ start: cursor, frames, transType: tType })
    prevTransition = tType
    cursor += frames
  }

  // Outro — beat 6.
  const outroFrames = beatFrames[6] ?? toFrames(2.5)
  const outroStart  = cursor

  // Suppression ranges for captions: intro + outro.
  const suppressFrames: Array<[number, number]> = [
    [0, introFrames],
    [outroStart, totalFrames],
  ]

  return (
    <SafeZoneProvider aspect={aspect}>
      <AbsoluteFill
        style={{
          width: dims.width,
          height: dims.height,
          backgroundColor: '#0A1A2E',
          overflow: 'hidden',
        }}
      >
        {/* VO audio — plays from Beat 1 onward */}
        {voPath ? (
          <Audio
            src={staticFile(voPath)}
            startFrom={introFrames}
          />
        ) : null}

        {/* Beat 0 — Intro (silent) */}
        <Sequence from={introStart} durationInFrames={introFrames}>
          <IntroTitle dateline={dateline} durationInFrames={introFrames} />
        </Sequence>

        {/* Beats 1-5 — Event cards with transitions */}
        {eventBeats.map(({ start, frames, transType }, i) => {
          const event = events[i]
          return (
            <Sequence key={`event-${i}`} from={start} durationInFrames={frames}>
              <TransitionWrapper type={transType} transFrames={TRANS_FRAMES}>
                <EventCard
                  event={event}
                  beatIndex={i + 1}
                  durationInFrames={frames}
                />
              </TransitionWrapper>
            </Sequence>
          )
        })}

        {/* Beat 6 — Outro (silent) */}
        <Sequence from={outroStart} durationInFrames={outroFrames}>
          <Outro ctaText={outroCta} durationInFrames={outroFrames} />
        </Sequence>

        {/* Caption band — always on top; suppressed during intro + outro */}
        <CaptionBand
          words={captionWords}
          suppressFrames={suppressFrames}
        />
      </AbsoluteFill>
    </SafeZoneProvider>
  )
}
