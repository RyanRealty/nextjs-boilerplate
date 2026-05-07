/**
 * Chapter transition tag — gold underline that animates in at the start of
 * each chapter, holds for ~0.5s, then fades. Appears at the top of the frame
 * so it doesn't conflict with the content or caption zone.
 *
 * Per skill spec §4: "Add chapter transition tags (gold underline that
 * animates in at chapter start, holds for ~0.5s, fades)."
 */

import { interpolate, useCurrentFrame } from 'remotion'
import { FONT_BODY, GOLD, WHITE } from '../brand'

export const ChapterHeader: React.FC<{
  chapterNumber: number
  chapterTitle: string
  totalChapters?: number
}> = ({ chapterNumber, chapterTitle, totalChapters = 10 }) => {
  const frame = useCurrentFrame()

  // Underline draws in from left over 18 frames
  const lineW = interpolate(frame, [0, 18], [0, 340], { extrapolateRight: 'clamp' })
  // Text + number fade in after line
  const textOp = interpolate(frame, [12, 28], [0, 1], { extrapolateRight: 'clamp' })
  // Whole header fades out after 60 frames (~2s)
  const headerOp = interpolate(frame, [45, 75], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <div style={{
      position: 'absolute',
      top: 56,
      left: 90,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      opacity: headerOp,
      pointerEvents: 'none',
    }}>
      {/* Chapter counter */}
      <div style={{
        color: 'rgba(255,255,255,0.55)',
        fontFamily: FONT_BODY,
        fontSize: 22,
        letterSpacing: 4,
        fontWeight: 700,
      }}>
        {String(chapterNumber).padStart(2, '0')} · {String(totalChapters).padStart(2, '0')}
      </div>
      {/* Gold rule */}
      <div style={{ width: lineW, height: 3, background: GOLD, opacity: 0.95 }} />
      {/* Chapter title */}
      <div style={{
        color: WHITE,
        fontFamily: FONT_BODY,
        fontSize: 28,
        letterSpacing: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        opacity: textOp,
        textShadow: '0 2px 8px rgba(0,0,0,0.7)',
      }}>
        {chapterTitle}
      </div>
    </div>
  )
}
