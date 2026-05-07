// Beat 0 — Silent intro title card.
// "THIS WEEKEND IN BEND" + dateline + tagline.
// NO VO, NO captions. Designed as a clean static thumbnail in the final 1.5s.
//
// Kinetic typography: three staggered mask-reveal + slide-up animations.
// Everything settles to a clean static frame by frame ~45 (1.5s before end
// of the 3.0s beat, giving a clean thumbnail window).

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, FONT_BODY, GOLD, NAVY_DEEP, WHITE, WHITE_SOFT, WHITE_DIM } from './brand'
import { useSafeZone } from './SafeZones'

export const IntroTitle: React.FC<{
  dateline: string
  durationInFrames: number
}> = ({ dateline }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dims = useSafeZone()

  // Eyebrow — "THIS WEEKEND IN BEND" — fast spring slide-up + fade.
  const eyebrowProg = spring({ frame, fps, config: { damping: 18, stiffness: 120 } })
  const eyebrowY = interpolate(eyebrowProg, [0, 1], [28, 0])
  const eyebrowOp = interpolate(eyebrowProg, [0, 1], [0, 1])

  // Gold rule — grows from center out, starts at frame 6.
  const ruleWidth = interpolate(frame, [6, 28], [0, dims.width * 0.55], { extrapolateRight: 'clamp' })
  const ruleOp   = interpolate(frame, [6, 18],  [0, 1],                  { extrapolateRight: 'clamp' })

  // Dateline — slides up + fades, starts at frame 14.
  const datelineProg = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 16, stiffness: 110 } })
  const datelineY  = interpolate(datelineProg, [0, 1], [36, 0])
  const datelineOp = interpolate(datelineProg, [0, 1], [0, 1])

  // Tagline — fades in at frame 24.
  const taglineOp = interpolate(frame, [24, 40], [0, 1], { extrapolateRight: 'clamp' })

  // Scrim overlay — full-bleed dark gradient so text reads cleanly.
  const scrimOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })

  // Vertical center point — shift slightly upward so the tagline clears
  // the caption safe zone on portrait formats.
  const centerY = dims.height * 0.38

  // Scale headline font for landscape (16x9) where height is much less.
  const headFontSize = dims.height >= 1500
    ? 148  // 9x16 portrait
    : dims.height >= 1200
    ? 120  // 2x3 / 4x5
    : dims.height >= 1000
    ? 100  // 1x1
    : 78   // 16x9 landscape

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP, overflow: 'hidden' }}>
      {/* Gradient scrim */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(10,26,46,0.55) 0%, rgba(10,26,46,0.82) 100%)`,
          opacity: scrimOp,
        }}
      />

      {/* Gold accent bars — left and right */}
      <div style={{ position: 'absolute', top: 72, left: dims.safeXMin, width: 180, height: 3, background: GOLD, opacity: 0.88 }} />
      <div style={{ position: 'absolute', top: 72, right: dims.width - dims.safeXMax, width: 56, height: 3, background: GOLD, opacity: 0.88 }} />

      {/* Centered content column */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: centerY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: `0 ${dims.safeXMin}px`,
        }}
      >
        {/* Eyebrow: "THIS WEEKEND IN BEND" */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: Math.round(headFontSize * 0.24),
            fontWeight: 700,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: GOLD,
            opacity: eyebrowOp,
            transform: `translateY(${eyebrowY}px)`,
            textAlign: 'center',
          }}
        >
          THIS WEEKEND IN BEND
        </div>

        {/* Gold rule */}
        <div
          style={{
            width: ruleWidth,
            height: 3,
            background: GOLD,
            opacity: ruleOp,
          }}
        />

        {/* Dateline: e.g. "MAY 8-10, 2026" */}
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: headFontSize,
            fontWeight: 700,
            letterSpacing: -1,
            color: WHITE,
            opacity: datelineOp,
            transform: `translateY(${datelineY}px)`,
            textAlign: 'center',
            lineHeight: 1.0,
            textShadow: '0 4px 28px rgba(0,0,0,0.6)',
          }}
        >
          {dateline}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: Math.round(headFontSize * 0.26),
            fontWeight: 500,
            color: WHITE_SOFT,
            opacity: taglineOp,
            textAlign: 'center',
            marginTop: 8,
            letterSpacing: 2,
          }}
        >
          5 things you don't want to miss
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: dims.safeXMin,
          right: dims.width - dims.safeXMax,
          height: 2,
          background: `linear-gradient(90deg, ${GOLD} 0%, transparent 100%)`,
          opacity: ruleOp * 0.6,
        }}
      />
    </AbsoluteFill>
  )
}
