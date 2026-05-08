import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion'
import { COLORS, FONTS, ALPHAS } from './colors'

/**
 * Forced-alignment word entry from ElevenLabs / WhisperX.
 * Time in seconds.
 */
export interface AlignedWord {
  text: string
  start: number
  end: number
}

/**
 * Earnest. caption band.
 *
 * Renders the FULL CURRENT SENTENCE in the dedicated safe zone
 * (y 1480–1720, x 90–990, per BRAND_SYSTEM.md). The currently-spoken
 * word is highlighted in Ember + scaled 1.0 → 1.08 via spring.
 * Sentence boundaries detected by `.`, `!`, `?` in word.text.
 * Sentence transitions cross-fade 250ms; never hard-cut, never flicker.
 *
 * Per CLAUDE.md §0.5 (caption hard rules):
 *   - dedicated safe zone (no overlap with other elements)
 *   - active-word highlight, NOT word-by-word reveal
 *   - sync to forced-alignment timestamps, never to clock time
 *   - smooth crossfade between sentences
 */
export const CaptionBand: React.FC<{
  /** Word-level forced-alignment data for the entire episode VO. */
  words: AlignedWord[]
  /** Optional per-line offset, in seconds, if VO doesn't start at frame 0. */
  offsetSeconds?: number
}> = ({ words, offsetSeconds = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps - offsetSeconds

  if (t < 0 || words.length === 0) return null

  // Group words into sentences by terminal punctuation.
  const sentences = React.useMemo(() => groupSentences(words), [words])

  // Find the active sentence index for the current time.
  const active = sentences.findIndex((s) => t >= s.start && t < s.end + 0.25) // +0.25s lingers past the end of speech
  if (active === -1) return null

  const sentence = sentences[active]
  const next = sentences[active + 1]

  // Cross-fade window between sentences (250ms).
  const fadeWindow = 0.25
  let opacity = 1
  if (next && t > next.start - fadeWindow) {
    // Fading out as next sentence is about to start.
    opacity = interpolate(t, [next.start - fadeWindow, next.start], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    })
  } else if (active > 0) {
    // Fading in from the previous sentence's tail.
    const prev = sentences[active - 1]
    opacity = interpolate(t, [prev.end, prev.end + fadeWindow], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    })
  } else {
    // First sentence: fade in from its start.
    opacity = interpolate(
      t,
      [sentence.start - fadeWindow, sentence.start],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      },
    )
  }

  // Active word inside the sentence.
  const activeWordIdx = sentence.words.findIndex(
    (w) => t >= w.start && t < w.end,
  )

  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        top: 1480,
        width: 900,
        height: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: ALPHAS.captionPill,
          borderRadius: 24,
          padding: '16px 24px',
          maxWidth: '100%',
          textAlign: 'center',
          fontFamily: FONTS.body,
          fontSize: 56,
          lineHeight: 1.15,
          color: COLORS.bone,
          fontWeight: 400,
        }}
      >
        {sentence.words.map((w, i) => (
          <ActiveWord
            key={`${active}-${i}`}
            word={w.text}
            isActive={i === activeWordIdx}
            wordStart={w.start}
            now={t}
            fps={fps}
          />
        ))}
      </div>
    </div>
  )
}

const ActiveWord: React.FC<{
  word: string
  isActive: boolean
  wordStart: number
  now: number
  fps: number
}> = ({ word, isActive, wordStart, now, fps }) => {
  // Spring scale from 1.0 → 1.08 when this word becomes active.
  const sinceActive = Math.max(0, now - wordStart)
  const sinceActiveFrames = sinceActive * fps
  const scale = isActive
    ? 1 + 0.08 * spring({ frame: sinceActiveFrames, fps, config: { damping: 14 } })
    : 1
  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: '0.25em',
        color: isActive ? COLORS.ember : COLORS.bone,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        transition: 'color 80ms linear',
      }}
    >
      {word}
    </span>
  )
}

/** Group word-level alignment into sentences by terminal punctuation. */
function groupSentences(words: AlignedWord[]): {
  start: number
  end: number
  words: AlignedWord[]
}[] {
  const sentences: { start: number; end: number; words: AlignedWord[] }[] = []
  let bucket: AlignedWord[] = []
  for (const w of words) {
    bucket.push(w)
    if (/[.!?]$/.test(w.text)) {
      sentences.push({
        start: bucket[0].start,
        end: bucket[bucket.length - 1].end,
        words: bucket,
      })
      bucket = []
    }
  }
  if (bucket.length) {
    sentences.push({
      start: bucket[0].start,
      end: bucket[bucket.length - 1].end,
      words: bucket,
    })
  }
  return sentences
}
