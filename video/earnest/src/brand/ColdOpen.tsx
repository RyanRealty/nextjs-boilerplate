import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS, sec } from './colors'
import { Wordmark } from './Wordmark'

/**
 * Earnest. cold open. 2.0 seconds.
 *
 * 0.0–0.3s   Ink hold, silence.
 * 0.3–0.8s   Horizon mark draws left+right from center. ease-out.
 * 0.8–1.3s   Wordmark fades in beneath. ease-out.
 * 1.3–1.7s   Hold. (C# minor piano note SFX lands here — added in audio post.)
 * 1.7–2.0s   Hard hand-off (the parent scene cuts to first content beat at 2.0s).
 *
 * Frame schedule @ 30fps:
 *   0–9    Ink hold
 *   9–24   horizon draws (15 frames = 0.5s)
 *   24–39  wordmark fades in (15 frames = 0.5s)
 *   39–51  hold (12 frames = 0.4s)
 *   51–60  hand-off window
 */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame()

  const horizonStart = sec(0.3) // 9
  const horizonEnd = sec(0.8) // 24
  const wordmarkStart = sec(0.8) // 24
  const wordmarkEnd = sec(1.3) // 39

  const horizonProgress = interpolate(
    frame,
    [horizonStart, horizonEnd],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    },
  )

  const wordmarkOpacity = interpolate(
    frame,
    [wordmarkStart, wordmarkEnd],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    },
  )

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Wordmark
        horizonProgress={horizonProgress}
        wordmarkOpacity={wordmarkOpacity}
      />
    </AbsoluteFill>
  )
}
