/**
 * Landscape-adapted KineticCaptions for YouTube long-form (1920x1080).
 *
 * CAPTION RULES (per CLAUDE.md §0.5 — permanent, cannot be overridden):
 *   1. Full sentence on screen at once — never word-by-word or chunk windows.
 *   2. Active word highlighted: gold color + scale 1.0→1.08 spring (karaoke style).
 *   3. Smooth 250ms crossfade between sentences — never hard cut, never flash.
 *   4. Sentence boundaries detected from periods / ! / ? in word.text.
 *   5. No caption during opening title card (first 3s) — clean preview thumbnail.
 *   6. Caption zone y 920-1040 / x 90-1830 — nothing else may overlap.
 *
 * Position adapted from portrait (y 1480-1720) to landscape (y 920-1040).
 * Font size scaled for 1920-wide canvas: 48px (was 44px in portrait).
 */

import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { CAPTION_Y_TOP, CAPTION_Y_BOTTOM, GOLD, SAFE_X_MIN, SAFE_X_MAX } from './brand'

export type CaptionWord = { text: string; startSec: number; endSec: number }

type Props = {
  words: CaptionWord[]
  /** Frame ranges where captions are suppressed (e.g. outro, chapter transitions). Inclusive. */
  suppressFrames?: Array<[number, number]>
}

const CAPTION_FONT = "'AzoSans', 'Geist', 'Inter', system-ui, sans-serif"
const INTRO_NO_CAPTION_END_SEC = 3.0
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

export const KineticCaptions: React.FC<Props> = ({ words, suppressFrames = [] }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  for (const [s, e] of suppressFrames) {
    if (frame >= s && frame <= e) return null
  }
  if (!words || words.length === 0) return null
  if (t < INTRO_NO_CAPTION_END_SEC) return null

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
  const fadeInProgress = interpolate(t, [sentence.startSec, sentence.startSec + CROSSFADE_SEC], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOutProgress = interpolate(t, [sentence.endSec - CROSSFADE_SEC, sentence.endSec], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = Math.min(fadeInProgress, fadeOutProgress)

  return <CaptionBox sentence={sentence} t={t} fps={fps} opacity={opacity} />
}

function renderTransition(prev: Sentence, next: Sentence, t: number, fps: number): React.ReactElement {
  const prevOpacity = interpolate(t, [prev.endSec, prev.endSec + CROSSFADE_SEC], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const nextOpacity = interpolate(t, [next.startSec - CROSSFADE_SEC, next.startSec], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      {prevOpacity > 0.01 ? <CaptionBox sentence={prev} t={t} fps={fps} opacity={prevOpacity} /> : null}
      {nextOpacity > 0.01 ? <CaptionBox sentence={next} t={t} fps={fps} opacity={nextOpacity} /> : null}
    </>
  )
}

const CaptionBox: React.FC<{ sentence: Sentence; t: number; fps: number; opacity: number }> = ({ sentence, t, fps, opacity }) => {
  const activeWordIdx = sentence.words.findIndex((w) => t >= w.startSec && t < w.endSec)
  const effectiveActiveIdx = activeWordIdx >= 0 ? activeWordIdx : sentence.words.length - 1

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X_MIN,
        right: 1920 - SAFE_X_MAX,
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
          padding: '16px 32px',
          borderRadius: 20,
          maxWidth: 1600,
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
            gap: '4px 10px',
            lineHeight: 1.15,
          }}
        >
          {sentence.words.map((w, i) => {
            const isActive = i === effectiveActiveIdx
            const wordStartFrame = Math.round(w.startSec * fps)
            const localFrame = Math.round(t * fps) - wordStartFrame
            const sp = isActive
              ? spring({ frame: Math.max(0, localFrame), fps, from: 1.0, to: 1.08, config: { damping: 18, stiffness: 200 }, durationInFrames: 6 })
              : 1.0
            const color = isActive ? GOLD : i < effectiveActiveIdx ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)'
            return (
              <span
                key={`${w.startSec}-${i}`}
                style={{
                  fontFamily: CAPTION_FONT,
                  fontWeight: isActive ? 800 : 700,
                  fontSize: 48,
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
