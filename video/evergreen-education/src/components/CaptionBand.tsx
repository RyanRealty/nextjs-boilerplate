import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CAPTION_Y_BOTTOM, CAPTION_Y_TOP, FONT_BODY, GOLD } from '../brand'

export type CaptionWord = { text: string; startSec: number; endSec: number }

/**
 * CaptionBand — burned-in word-by-word captions.
 *
 * Per CLAUDE.md §0.5 (HARD RULE — ship blocker):
 *   - Reserved safe zone: y 1480-1720, x 90-990
 *   - Word-by-word kinetic, 1-3 word chunks
 *   - Active word color shift navy → gold + smooth fade
 *   - No other component renders into this zone
 *
 * Adapted from video/market-report/src/CaptionBand.tsx with no behavior changes.
 */
export const CaptionBand: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  const activeIdx = words.findIndex((w) => t >= w.startSec && t < w.endSec)
  if (activeIdx === -1) return null

  // Build a 7-word phrase window (3 before + active + 3 after, clamped)
  const start = Math.max(0, activeIdx - 3)
  const end = Math.min(words.length, activeIdx + 4)
  const phrase = words.slice(start, end)
  const activeInPhrase = activeIdx - start

  const w = words[activeIdx]
  const fadeIn = interpolate(t, [w.startSec, w.startSec + 0.08], [0.4, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
  const fadeOut = interpolate(t, [w.endSec - 0.06, w.endSec], [1, 0.85], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
  const opacity = Math.min(fadeIn, fadeOut)

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
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
          background: 'rgba(10,26,46,0.88)',
          border: `2px solid ${GOLD}`,
          padding: '22px 36px',
          borderRadius: 24,
          maxWidth: 960,
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {phrase.map((pw, i) => (
            <span
              key={`${pw.startSec}-${i}`}
              style={{
                fontFamily: FONT_BODY,
                fontWeight: i === activeInPhrase ? 800 : 600,
                fontSize: 44,
                color: i === activeInPhrase ? GOLD : 'rgba(255,255,255,0.92)',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {pw.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
