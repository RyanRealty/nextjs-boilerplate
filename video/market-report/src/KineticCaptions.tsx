import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { CAPTION_Y_BOTTOM, CAPTION_Y_TOP, GOLD } from './brand'

export type CaptionWord = { text: string; startSec: number; endSec: number }

type Props = {
  words: CaptionWord[]
  /** Frame ranges where captions are suppressed (e.g. during outro). Inclusive. */
  suppressFrames?: Array<[number, number]>
  /** Legacy parameter — ignored. Captions are now sentence-based per Matt directive 2026-05-07. */
  chunkSize?: number
}

/**
 * Sentence-level caption layer.
 *
 * RULES (Matt's directive 2026-05-07 — saved permanently in CLAUDE.md §0.5 captions):
 *   1. Full sentence on screen at once (NOT word-by-word fade-in/out, NOT 3-word chunks)
 *   2. Active word highlighted with color + scale 1.0→1.08 spring (karaoke style)
 *   3. Smooth 250ms crossfade between sentences (NEVER hard cut, NEVER flash)
 *   4. Sentence boundaries detected from periods in word.text
 *   5. No captions during the opening title card (first 4s) — clean for social tile preview
 *   6. Caption-zone reservation: nothing else may render inside y 1480-1720 / x 90-990
 *   7. Brand font: AzoSans (loaded from public/fonts), not system fallback
 */

// Brand-loaded caption font (per Matt directive). AzoSans loaded from public/fonts/AzoSans-Medium.ttf.
const CAPTION_FONT = "'AzoSans', 'Geist', 'Inter', system-ui, sans-serif"

// Suppress captions during the opening title card so social-tile previews are clean.
const INTRO_NO_CAPTION_END_SEC = 4.0

const CROSSFADE_SEC = 0.25

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

export const KineticCaptions: React.FC<Props> = ({ words, suppressFrames = [] }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  // Suppression: caption invisible during these frame ranges
  for (const [s, e] of suppressFrames) {
    if (frame >= s && frame <= e) return null
  }

  if (!words || words.length === 0) return null

  // Clean opening: no caption during the title card.
  if (t < INTRO_NO_CAPTION_END_SEC) return null

  const sentences = groupIntoSentences(words)

  const activeSentenceIdx = sentences.findIndex((s) => t >= s.startSec && t < s.endSec)

  if (activeSentenceIdx === -1) {
    // We're in a gap between sentences — render fading-out previous + fading-in next
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
          background: 'rgba(16,39,66,0.78)',
          borderTop: `2px solid ${GOLD}`,
          padding: '20px 32px',
          borderRadius: 24,
          maxWidth: 900,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '6px 12px',
            lineHeight: 1.18,
          }}
        >
          {sentence.words.map((w, i) => {
            const isActive = i === effectiveActiveIdx
            const wordStartFrame = Math.round(w.startSec * fps)
            const localFrame = Math.round(t * fps) - wordStartFrame
            const sp = isActive
              ? spring({
                  frame: Math.max(0, localFrame),
                  fps,
                  from: 1.0,
                  to: 1.08,
                  config: { damping: 18, stiffness: 200 },
                  durationInFrames: 6,
                })
              : 1.0

            // Past words = white 92%; active = gold; not-yet = white 75%
            const color = isActive
              ? GOLD
              : i < effectiveActiveIdx
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(255,255,255,0.75)'

            return (
              <span
                key={`${w.startSec}-${i}`}
                style={{
                  fontFamily: CAPTION_FONT,
                  fontWeight: isActive ? 800 : 700,
                  fontSize: 44,
                  color,
                  letterSpacing: 0.4,
                  display: 'inline-block',
                  transform: `scale(${sp})`,
                  transformOrigin: 'center bottom',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  fontVariantNumeric: 'tabular-nums',
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
