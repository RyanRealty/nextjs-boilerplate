// Caption band — full-sentence with active-word highlight.
// Mirrors video/market-report/src/CaptionBand.tsx exactly, but reads
// the safe zone from the SafeZoneContext so it adapts to all 5 aspects.
//
// RULES (Matt directive 2026-05-07, permanent):
//   1. Full sentence on screen at once (NOT word-by-word fade-in/out).
//   2. Active word highlighted: gold color + scale 1.0→1.08 spring.
//   3. Smooth 200-300ms crossfade between sentences (never hard cut).
//   4. Sentence boundaries detected by periods in word.text.
//   5. No captions over Beat 0 (intro) or Beat 6 (outro).

import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_CAPTION, GOLD } from './brand'
import { useSafeZone } from './SafeZones'
import type { WordTiming } from './VideoProps'

type Sentence = {
  words: WordTiming[]
  startSec: number
  endSec: number
}

function groupIntoSentences(words: WordTiming[]): Sentence[] {
  const sentences: Sentence[] = []
  let buf: WordTiming[] = []
  for (const w of words) {
    buf.push(w)
    if (/[.!?]$/.test(w.text.trim().replace(/[",;:]+$/, ''))) {
      if (buf.length) {
        sentences.push({ words: buf, startSec: buf[0].startSec, endSec: buf[buf.length - 1].endSec })
        buf = []
      }
    }
  }
  if (buf.length) {
    sentences.push({ words: buf, startSec: buf[0].startSec, endSec: buf[buf.length - 1].endSec })
  }
  return sentences
}

const CROSSFADE_SEC = 0.25

export const CaptionBand: React.FC<{
  words: WordTiming[]
  /** Array of [startFrame, endFrame] ranges to suppress captions (e.g. intro, outro). */
  suppressFrames?: Array<[number, number]>
}> = ({ words, suppressFrames = [] }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const dims = useSafeZone()

  if (!words || words.length === 0) return null

  // Suppress if current frame falls inside any suppression range.
  for (const [lo, hi] of suppressFrames) {
    if (frame >= lo && frame < hi) return null
  }

  const sentences = groupIntoSentences(words)
  const activeSentenceIdx = sentences.findIndex((s) => t >= s.startSec && t < s.endSec)

  if (activeSentenceIdx === -1) {
    const prevIdx = sentences.findIndex((s, i) => {
      const next = sentences[i + 1]
      return next && t >= s.endSec && t < next.startSec
    })
    if (prevIdx === -1) return null
    return renderTransition(sentences[prevIdx], sentences[prevIdx + 1], t, fps, dims)
  }

  const sentence = sentences[activeSentenceIdx]
  const fadeIn = interpolate(t, [sentence.startSec, sentence.startSec + CROSSFADE_SEC], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(t, [sentence.endSec - CROSSFADE_SEC, sentence.endSec], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <CaptionBox sentence={sentence} t={t} fps={fps} opacity={Math.min(fadeIn, fadeOut)} dims={dims} />
}

function renderTransition(
  prev: Sentence, next: Sentence, t: number, fps: number,
  dims: ReturnType<typeof useSafeZone>
): React.ReactElement {
  const prevOpacity = interpolate(t, [prev.endSec, prev.endSec + CROSSFADE_SEC], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const nextOpacity = interpolate(t, [next.startSec - CROSSFADE_SEC, next.startSec], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      {prevOpacity > 0.01 ? <CaptionBox sentence={prev} t={t} fps={fps} opacity={prevOpacity} dims={dims} /> : null}
      {nextOpacity > 0.01 ? <CaptionBox sentence={next} t={t} fps={fps} opacity={nextOpacity} dims={dims} /> : null}
    </>
  )
}

const CaptionBox: React.FC<{
  sentence: Sentence
  t: number
  fps: number
  opacity: number
  dims: ReturnType<typeof useSafeZone>
}> = ({ sentence, t, fps, opacity, dims }) => {
  const activeWordIdx = sentence.words.findIndex((w) => t >= w.startSec && t < w.endSec)
  const effectiveActiveIdx = activeWordIdx >= 0 ? activeWordIdx : sentence.words.length - 1

  return (
    <div
      style={{
        position: 'absolute',
        left: dims.safeXMin,
        right: dims.width - dims.safeXMax,
        top: dims.captionYTop,
        height: dims.captionYBottom - dims.captionYTop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
      }}
    >
      <div
        style={{
          background: 'rgba(10,26,46,0.85)',
          border: `2px solid ${GOLD}`,
          padding: '16px 28px',
          borderRadius: 18,
          maxWidth: dims.safeXMax - dims.safeXMin,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '6px 8px',
            lineHeight: 1.2,
          }}
        >
          {sentence.words.map((w, i) => {
            const isActive = i === effectiveActiveIdx
            const wordStartFrame = Math.round(w.startSec * fps)
            const localFrame = Math.round(t * fps) - wordStartFrame
            const scale = isActive
              ? spring({ frame: Math.max(0, localFrame), fps, from: 1.0, to: 1.08, config: { damping: 20, stiffness: 180 }, durationInFrames: 6 })
              : 1.0
            return (
              <span
                key={`${w.startSec}-${i}`}
                style={{
                  fontFamily: FONT_CAPTION,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 38,
                  color: isActive ? GOLD : 'rgba(255,255,255,0.92)',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center bottom',
                }}
              >
                {w.text}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
