import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS, sec } from './colors'
import { Wordmark } from './Wordmark'

/**
 * Earnest. end card. 4.0 seconds.
 *
 * 0.0–0.5s   Ink hold (post hard-cut from final content beat).
 * 0.5–1.0s   Wordmark + horizon mark fade in together. ease-in.
 * 1.0–3.5s   Hold. (Low-D string drone SFX runs underneath — added in audio post.)
 * 3.5–4.0s   Cross-fade to black. (Group opacity ramps to zero.)
 *
 * NO Ryan Realty mark, NO logo, NO URL anywhere in the frame.
 * The Ryan Realty connection lives off-frame on the microsite.
 *
 * Frame schedule @ 30fps:
 *   0–15    Ink hold (0.5s)
 *   15–30   fade in (0.5s)
 *   30–105  hold (2.5s)
 *   105–120 cross-fade to black (0.5s)
 */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame()

  const fadeInStart = sec(0.5) // 15
  const fadeInEnd = sec(1.0) // 30
  const holdEnd = sec(3.5) // 105
  const fadeOutEnd = sec(4.0) // 120

  // Wordmark + horizon fade in together (no separate horizon-draw on the end card —
  // the audience already knows the mark from the cold open and the body of the show).
  const fadeIn = interpolate(frame, [fadeInStart, fadeInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })

  const fadeOut = interpolate(frame, [holdEnd, fadeOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })

  const groupOpacity = Math.min(fadeIn, fadeOut)

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Wordmark
        horizonProgress={1}
        wordmarkOpacity={1}
        groupOpacity={groupOpacity}
      />
    </AbsoluteFill>
  )
}
