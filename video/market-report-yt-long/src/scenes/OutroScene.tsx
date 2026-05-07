/**
 * Chapter 10 — CTA + closing card (10:30-11:15)
 *
 * Locked spec from listing_reveal/SKILL.md + skill spec §3 Ch.10:
 *   - Navy background (rgba(10,26,46,1.0)) — per locked closing-card spec
 *   - White stacked logo centered
 *   - Gold rule below logo
 *   - "Subscribe + comment" CTA text
 *   - Website URL
 *   - No phone / agent name in the kinetic reveal frame
 *     (phone allowed in this CTA card per listing_reveal spec — it's the dedicated card)
 *   - No brokerage attribution, no logo in the reveal frame of the video itself
 *     (this IS the closing card so logo IS here — correct per spec)
 */

import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_BODY, FONT_HEAD, GOLD, WHITE, WHITE_DIM, WHITE_SOFT } from '../brand'

export const OutroScene: React.FC<{
  city: string
  period: string
  imageSrc?: string
  durationInFrames?: number
}> = ({ city, period, durationInFrames = 1350 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoIn = spring({ frame, fps, config: { damping: 20, stiffness: 110 } })
  const logoOp = interpolate(logoIn, [0, 1], [0, 1])
  const logoScale = interpolate(logoIn, [0, 1], [0.8, 1])
  const lineOp = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: 'clamp' })
  const ctaOp = interpolate(frame, [20, 42], [0, 1], { extrapolateRight: 'clamp' })
  const urlOp = interpolate(frame, [32, 54], [0, 1], { extrapolateRight: 'clamp' })

  const lineWidth = interpolate(frame, [10, 36], [0, 560], { extrapolateRight: 'clamp' })
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A1A2E' }}>
      {/* Subtle radial highlight */}
      <AbsoluteFill style={{
        background: 'radial-gradient(60% 60% at 50% 40%, rgba(23,51,86,0.8) 0%, transparent 70%)',
        mixBlendMode: 'screen',
      }} />

      {/* Top / bottom accent bars */}
      <div style={{ position: 'absolute', top: 56, left: 90, width: 300, height: 3, background: GOLD, opacity: 0.85 }} />
      <div style={{ position: 'absolute', top: 56, right: 90, width: 80, height: 3, background: GOLD, opacity: 0.85 }} />
      <div style={{ position: 'absolute', bottom: 80, left: 90, right: 90, height: 1, background: 'rgba(255,255,255,0.10)' }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 160px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
          {/* White stacked logo — per spec: end card uses stacked_logo_white.png */}
          <div style={{ opacity: logoOp, transform: `scale(${logoScale})` }}>
            <Img
              src={staticFile('stacked_logo_white.png')}
              style={{ width: 360, height: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
            />
          </div>

          {/* Gold rule */}
          <div style={{ width: lineWidth, height: 3, background: GOLD, opacity: lineOp }} />

          {/* CTA headline */}
          <div style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: 96,
            lineHeight: 0.96,
            letterSpacing: -2,
            textAlign: 'center',
            opacity: ctaOp,
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}>
            Subscribe for Monthly Updates
          </div>

          {/* Subhead */}
          <div style={{
            color: WHITE_SOFT,
            fontFamily: FONT_BODY,
            fontSize: 36,
            fontWeight: 500,
            opacity: ctaOp,
            textAlign: 'center',
            maxWidth: 1300,
            lineHeight: 1.4,
          }}>
            Central Oregon real estate data — every month, free.
          </div>

          {/* Website URL */}
          <div style={{
            color: GOLD,
            fontFamily: FONT_BODY,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 3,
            opacity: urlOp,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}>
            ryan-realty.com/market-report/{citySlug}/{period}
          </div>

          {/* Comment prompt */}
          <div style={{
            marginTop: 12,
            padding: '16px 44px',
            borderRadius: 999,
            background: 'rgba(16,39,66,0.85)',
            border: `2px solid ${GOLD}`,
            color: WHITE,
            fontFamily: FONT_BODY,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: urlOp,
          }}>
            What's your Bend price prediction for next month?
          </div>
        </div>
      </AbsoluteFill>

      {/* Photo credit */}
      <div style={{
        position: 'absolute', bottom: 100, right: 90,
        color: 'rgba(255,255,255,0.40)', fontFamily: FONT_BODY, fontSize: 20, letterSpacing: 1,
      }}>
        Data: Oregon MLS via Supabase · ryan-realty.com
      </div>
    </AbsoluteFill>
  )
}
