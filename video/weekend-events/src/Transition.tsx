// Three approved beat-to-beat transitions.
// Never repeating the same transition on consecutive beats.
//
// Transitions:
//   0 = wipe-reveal   — mask grows from left edge
//   1 = crossfade     — crossfade with slight scale-in (parallax feel)
//   2 = card-flip-in  — Y-axis flip with motion blur approximation
//
// Usage: wrap the INCOMING beat in <Transition type={t} durationInFrames={f} progress={p} />
// where progress = currentFrame / durationInFrames (0..1).

import { AbsoluteFill, interpolate } from 'remotion'
import React from 'react'

export type TransitionType = 0 | 1 | 2

/** Pick the next transition type, never repeating the previous. */
export function nextTransition(prev: TransitionType | null): TransitionType {
  if (prev === null) return 1
  // Cycle 0 → 1 → 2 → 0, but skip prev.
  const options: TransitionType[] = ([0, 1, 2] as TransitionType[]).filter((t) => t !== prev)
  // Deterministic: pick first available (render is deterministic).
  return options[0]
}

export const Transition: React.FC<{
  type: TransitionType
  /** Transition progress 0..1 (typically over 0.5s = 15 frames at 30fps). */
  progress: number
  children: React.ReactNode
}> = ({ type, progress, children }) => {
  if (type === 0) {
    // Wipe-reveal: mask grows from left. ClipPath on AbsoluteFill.
    const pct = interpolate(progress, [0, 1], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return (
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        {children}
      </AbsoluteFill>
    )
  }

  if (type === 1) {
    // Crossfade with slight scale — incoming scene fades in + scales from 0.96 to 1.
    const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const scale = interpolate(progress, [0, 1], [0.96, 1.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return (
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        {children}
      </AbsoluteFill>
    )
  }

  // type === 2: Card flip-in — Y-axis rotation 90→0 degrees, with opacity.
  // True 3D flip needs perspective on a parent div.
  const deg = interpolate(progress, [0, 1], [90, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = interpolate(progress, [0, 0.4, 1], [0, 0.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill
      style={{
        perspective: 1200,
        opacity,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `rotateY(${deg}deg)`,
          backfaceVisibility: 'hidden',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
