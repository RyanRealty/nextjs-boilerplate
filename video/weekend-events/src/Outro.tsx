// Beat 6 — Silent outro card.
// Call-to-action text only. No logo, no phone, no agent name.
// Pure content, no broker branding (same rule as news/area guides).

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, FONT_BODY, GOLD, NAVY_DEEP, WHITE, WHITE_SOFT } from './brand'
import { useSafeZone } from './SafeZones'

export const Outro: React.FC<{
  ctaText: string
  durationInFrames: number
}> = ({ ctaText }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dims = useSafeZone()

  // Staggered reveal animations.
  const lineProg = spring({ frame, fps, config: { damping: 16, stiffness: 110 } })
  const lineWidth = interpolate(lineProg, [0, 1], [0, dims.width * 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lineOp    = interpolate(lineProg, [0, 1], [0, 1])

  const ctaProg = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18, stiffness: 100 } })
  const ctaY    = interpolate(ctaProg, [0, 1], [32, 0])
  const ctaOp   = interpolate(ctaProg, [0, 1], [0, 1])

  const tagOp = interpolate(frame, [22, 38], [0, 1], { extrapolateRight: 'clamp' })

  const centerY = dims.height * 0.42

  const ctaFontSize = dims.height >= 1500 ? 88
    : dims.height >= 1200 ? 76
    : dims.height >= 1000 ? 66
    : 54

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP, overflow: 'hidden' }}>
      {/* Subtle gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, rgba(23,51,86,0.7) 0%, rgba(10,26,46,1) 70%)`,
        }}
      />

      {/* Gold accent top bar */}
      <div style={{ position: 'absolute', top: 72, left: dims.safeXMin, width: 180, height: 3, background: GOLD, opacity: 0.88 }} />

      {/* Centered content */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: centerY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          padding: `0 ${dims.safeXMin}px`,
        }}
      >
        {/* Gold rule */}
        <div style={{ width: lineWidth, height: 3, background: GOLD, opacity: lineOp }} />

        {/* CTA text */}
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: ctaFontSize,
            fontWeight: 700,
            color: WHITE,
            textAlign: 'center',
            lineHeight: 1.1,
            opacity: ctaOp,
            transform: `translateY(${ctaY}px)`,
            textShadow: '0 4px 24px rgba(0,0,0,0.55)',
            letterSpacing: -0.5,
          }}
        >
          {ctaText}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: Math.round(ctaFontSize * 0.32),
            fontWeight: 500,
            color: WHITE_SOFT,
            opacity: tagOp,
            textAlign: 'center',
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          Bend, Oregon
        </div>
      </div>
    </AbsoluteFill>
  )
}
