/**
 * Chapter 1 — Cold open + hook (0:00-0:45)
 *
 * Landscape (1920x1080) variant of IntroBeat.
 * - Wider Amboqia title (landscape center column)
 * - Chapter underline animates in at bottom of text block
 * - Motion by frame 12 (0.4s per VIRAL_GUARDRAILS hook spec)
 * - On-screen text by frame 30 (1.0s)
 */

import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_BODY, FONT_HEAD, GOLD, WHITE, WHITE_SOFT } from '../brand'
import { LandscapeImageLayer } from './LandscapeImageLayer'

export const IntroScene: React.FC<{
  city: string
  period: string
  subhead: string
  eyebrow?: string
  citySlug?: string
  marketHealthLabel?: string
  medianPriceDisplay?: string
  durationInFrames?: number
  voPath?: string
}> = ({ city, period, subhead, eyebrow, citySlug, marketHealthLabel, medianPriceDisplay, durationInFrames = 1350, voPath }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleProg = spring({ frame, fps, config: { damping: 16, stiffness: 110 } })
  const titleY = interpolate(titleProg, [0, 1], [40, 0])
  const titleOp = interpolate(titleProg, [0, 1], [0, 1])
  const eyebrowOp = interpolate(frame, [4, 18], [0, 1], { extrapolateRight: 'clamp' })
  const subOp = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: 'clamp' })
  const lineWidth = interpolate(frame, [4, 30], [0, 480], { extrapolateRight: 'clamp' })
  const pillOp = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: 'clamp' })

  const slug = citySlug || city.toLowerCase().replace(/\s+/g, '-')
  const eyebrowText = eyebrow ?? 'Ryan Realty Market Report'

  return (
    <AbsoluteFill>
      <LandscapeImageLayer src={`${slug}/img_1.jpg`} durationInFrames={durationInFrames} direction="right" />

      {/* Top accent lines */}
      <div style={{ position: 'absolute', top: 60, left: 90, width: 300, height: 3, background: GOLD, opacity: 0.85 }} />
      <div style={{ position: 'absolute', top: 60, right: 90, width: 80, height: 3, background: GOLD, opacity: 0.85 }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 160px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {/* Eyebrow */}
          <div style={{
            color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10,
            textTransform: 'uppercase', opacity: eyebrowOp, fontWeight: 700,
            textAlign: 'center',
          }}>
            {eyebrowText}
          </div>

          {/* Gold rule */}
          <div style={{ width: lineWidth, height: 3, background: GOLD, opacity: 0.95 }} />

          {/* City headline */}
          <div style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: 180,
            lineHeight: 0.92,
            letterSpacing: -4,
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
            color: WHITE_SOFT, fontFamily: FONT_BODY, fontSize: 36, fontWeight: 500,
            opacity: subOp, textAlign: 'center', maxWidth: 1400, marginTop: 8,
            lineHeight: 1.3,
          }}>
            {subhead}
          </div>

          {/* Market health pill — slides in last */}
          {marketHealthLabel ? (
            <div style={{
              marginTop: 12, padding: '14px 40px', borderRadius: 999,
              background: 'rgba(16,39,66,0.85)',
              border: `2px solid ${GOLD}`,
              color: WHITE,
              fontFamily: FONT_BODY, fontSize: 28, fontWeight: 800, letterSpacing: 6,
              textTransform: 'uppercase', opacity: pillOp,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}>
              {marketHealthLabel}
            </div>
          ) : null}

          {/* Median price teaser */}
          {medianPriceDisplay ? (
            <div style={{
              color: GOLD, fontFamily: FONT_HEAD, fontSize: 96,
              opacity: pillOp, textShadow: '0 4px 16px rgba(0,0,0,0.7)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {medianPriceDisplay}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* Chapter underline — animates in at bottom of title block */}
      <div style={{
        position: 'absolute',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: lineWidth,
        height: 3,
        background: GOLD,
        opacity: subOp * 0.7,
      }} />
    </AbsoluteFill>
  )
}
