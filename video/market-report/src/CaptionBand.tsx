import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { CAPTION_Y_BOTTOM, CAPTION_Y_TOP, FONT_BODY, GOLD } from './brand'

export type CaptionWord = { text: string; startSec: number; endSec: number }

/**
 * Caption band lives at y 1480-1720 (per CLAUDE.md spec — never overlaps stat content above).
 *
 * RULES (Matt's directive 2026-05-07 — saved permanently in CLAUDE.md §0.5 captions):
 *   1. Full sentence on screen at once (NOT word-by-word fade-in/out)
 *   2. Active word highlighted with color + scale 1.0→1.08 spring (karaoke style)
 *   3. Smooth 200-300ms crossfade between sentences (NEVER hard cut, NEVER flash)
 *   4. Sentence boundaries detected from periods in word.text
 */

type Sentence = {
  words: CaptionWord[]
  startSec: number
  endSec: number
}

function groupIntoSentences(words: CaptionWord[]): Sentence[] {
  const sentences: Sentence[] = []
  let buf: CaptionWord[] = []

  for (const w of words) {
    buf.push(w)
    if (/[.!?]$/.test(w.text.trim().replace(/[",;:]+$/, ''))) {
      if (buf.length) {
        sentences.push({
          words: buf,
          startSec: buf[0].startSec,
          endSec: buf[buf.length - 1].endSec,
        })
        buf = []
      }
    }
  }
  if (buf.length) {
    sentences.push({
      words: buf,
      startSec: buf[0].startSec,
      endSec: buf[buf.length - 1].endSec,
    })
  }
  return sentences
}

const CROSSFADE_SEC = 0.25

export const CaptionBand: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  if (!words || words.length === 0) return null

  const sentences = groupIntoSentences(words)

  const activeSentenceIdx = sentences.findIndex((s) => t >= s.startSec && t < s.endSec)

  if (activeSentenceIdx === -1) {
    const prevIdx = sentences.findIndex((s, i) => {
      const next = sentences[i + 1]
      return next && t >= s.endSec && t < next.startSec
    })
    if (prevIdx === -1) return null
    return renderTransition(sentences[prevIdx], sentences[prevIdx + 1], t, fps)
  }

  const sentence = sentences[activeSentenceIdx]

  const fadeInProgress = interpolate(
    t,
    [sentence.startSec, sentence.startSec + CROSSFADE_SEC],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const fadeOutProgress = interpolate(
    t,
    [sentence.endSec - CROSSFADE_SEC, sentence.endSec],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const opacity = Math.min(fadeInProgress, fadeOutProgress)

  return <CaptionBox sentence={sentence} t={t} fps={fps} opacity={opacity} />
}

function renderTransition(
  prev: Sentence,
  next: Sentence,
  t: number,
  fps: number
): React.ReactElement {
  const prevOpacity = interpolate(
    t,
    [prev.endSec, prev.endSec + CROSSFADE_SEC],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const nextOpacity = interpolate(
    t,
    [next.startSec - CROSSFADE_SEC, next.startSec],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  return (
    <>
      {prevOpacity > 0.01 ? (
        <CaptionBox sentence={prev} t={t} fps={fps} opacity={prevOpacity} />
      ) : null}
      {nextOpacity > 0.01 ? (
        <CaptionBox sentence={next} t={t} fps={fps} opacity={nextOpacity} />
      ) : null}
    </>
  )
}

const CaptionBox: React.FC<{
  sentence: Sentence
  t: number
  fps: number
  opacity: number
}> = ({ sentence, t, fps, opacity }) => {
  const activeWordIdx = sentence.words.findIndex((w) => t >= w.startSec && t < w.endSec)
  const effectiveActiveIdx = activeWordIdx >= 0 ? activeWordIdx : sentence.words.length - 1

  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top: CAPTION_Y_TOP,
        height: CAPTION_Y_BOTTOM - CAPTION_Y_TOP,
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
          padding: '20px 32px',
          borderRadius: 20,
          maxWidth: 900,
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '8px 10px',
            lineHeight: 1.2,
          }}
        >
          {sentence.words.map((w, i) => {
            const isActive = i === effectiveActiveIdx
            const wordStartFrame = Math.round(w.startSec * fps)
            const localFrame = Math.round(t * fps) - wordStartFrame
            const scale = isActive
              ? spring({
                  frame: Math.max(0, localFrame),
                  fps,
                  from: 1.0,
                  to: 1.08,
                  config: { damping: 20, stiffness: 180 },
                  durationInFrames: 6,
                })
              : 1.0

            return (
              <span
                key={`${w.startSec}-${i}`}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 40,
                  color: isActive ? GOLD : 'rgba(255,255,255,0.92)',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center bottom',
                  transition: 'color 100ms ease-out',
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
