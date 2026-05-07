import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Background } from './Background'
import { ImageLayer } from './ImageLayer'
import { FONT_BODY, FONT_HEAD, GOLD, WHITE, WHITE_SOFT } from './brand'

/**
 * Intro / title card.
 *
 * Two calling patterns:
 *
 * (1) LEGACY (city-name title, used by all 6 prior city YTD reports):
 *     city: "Bend", period: "2026", subhead: "YTD Market Report April 2026"
 *     -> eyebrow "Central Oregon", headline "Bend", subhead as-is
 *
 * (2) NEW (May 2026 monthly report style — pass `eyebrow` to opt in):
 *     city: "MAY 2026", eyebrow: "RYAN REALTY MARKET REPORT",
 *     subhead: "April Closed Sales · Single-Family · Bend, Oregon"
 *     -> eyebrow from `eyebrow` prop, headline from `city`, subhead as-is.
 *
 * `period` is unused in pattern 2 (the headline carries the period). It is retained for
 * back-compat — when `eyebrow` is omitted, the eyebrow defaults to "Central Oregon"
 * (matching the original 6 city videos exactly).
 */
export const IntroBeat: React.FC<{
  city: string
  period: string
  subhead: string
  eyebrow?: string
  citySlug?: string
  durationInFrames?: number
}> = ({ city, period, subhead, eyebrow, citySlug, durationInFrames = 120 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const titleProg = spring({ frame, fps, config: { damping: 16, stiffness: 110 } })
  const titleY = interpolate(titleProg, [0, 1], [40, 0])
  const titleOp = interpolate(titleProg, [0, 1], [0, 1])
  const eyebrowOp = interpolate(frame, [4, 18], [0, 1], { extrapolateRight: 'clamp' })
  const subOp = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: 'clamp' })
  const lineWidth = interpolate(frame, [4, 30], [0, 220], { extrapolateRight: 'clamp' })

  // Pattern 2 (eyebrow provided) uses img_2; legacy uses img_1.
  const imgSrc = citySlug
    ? eyebrow ? `${citySlug}/img_2.jpg` : `${citySlug}/img_1.jpg`
    : null
  const eyebrowText = eyebrow ?? 'Central Oregon'

  return (
    <AbsoluteFill>
      {/* Image background — fallback to gradient if no image */}
      {imgSrc ? (
        <ImageLayer src={imgSrc} durationInFrames={durationInFrames} direction="right" />
      ) : (
        <Background variant="navy" accentSide="right" />
      )}

      {/* Top accent lines (decorative — always visible) */}
      <div style={{ position: 'absolute', top: 80, left: 90, width: 200, height: 3, background: GOLD, opacity: 0.85 }} />
      <div style={{ position: 'absolute', top: 80, right: 90, width: 60, height: 3, background: GOLD, opacity: 0.85 }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
          transform: `translateY(${-120}px)`,
        }}>
          {/* Eyebrow */}
          <div style={{
            color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 10,
            textTransform: 'uppercase', opacity: eyebrowOp, fontWeight: 700,
            textAlign: 'center', maxWidth: 900,
          }}>
            {eyebrowText}
          </div>

          {/* Gold rule */}
          <div style={{ width: lineWidth, height: 3, background: GOLD, opacity: 0.95 }} />

          {/* Headline (e.g. "MAY 2026") */}
          <div style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: 168,
            lineHeight: 0.95,
            letterSpacing: -2,
            transform: `translateY(${titleY}px)`,
            opacity: titleOp,
            textAlign: 'center',
            textShadow: '0 4px 32px rgba(0,0,0,0.6)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {city}
          </div>

          {/* Subhead */}
          <div style={{
            color: WHITE_SOFT, fontFamily: FONT_BODY, fontSize: 34, fontWeight: 500,
            opacity: subOp, textAlign: 'center', maxWidth: 920, marginTop: 10,
            lineHeight: 1.3,
          }}>
            {subhead}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
