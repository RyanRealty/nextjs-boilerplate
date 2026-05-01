import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

import {
  CREAM,
  FONT_BODY,
  FONT_HEAD,
  GOLD,
  NAVY,
  NAVY_DEEP,
  SHADOW_NAVY,
} from '../brand'
import { loadFonts } from '../fonts'
import type { Scene8Cta } from './scene-types'

/**
 * Scene 8 — CTA / Outro.
 *
 * Per skill rules, this is the ONE frame in the entire video where the Ryan
 * Realty logo is permitted. Layout:
 *
 *   - Stacked white logo, centered.
 *   - Amboqia sign-off headline ("See you in the data.").
 *   - URL + phone in Geist tabular-nums on a single line.
 *   - Next-report-date sub-line in Geist 500 cream.
 *   - Subscribe pill with subtle scale pulse to draw the eye.
 *
 * Logo asset path: `staticFile('brand/stacked_logo_white.png')` — caller is
 * responsible for placing the file at `video/market-report/public/brand/`.
 * If missing, the component falls back to an Amboqia "Ryan Realty" wordmark
 * so stills + previews still render cleanly.
 */

export interface OutroCardProps {
  cta: Scene8Cta
  /** Optional sign-off line. Defaults to the brand-canonical Matt Ryan close. */
  signOff?: string
  /** Set false to skip rendering the logo image (useful for tests / asset-missing dev). */
  showLogo?: boolean
}

export const OutroCard: React.FC<OutroCardProps> = ({ cta, signOff, showLogo = true }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  void loadFonts()

  const isLandscape = width >= height

  const logoOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })
  const logoLift = interpolate(frame, [0, 18], [16, 0], { extrapolateRight: 'clamp' })
  const headlineOp = interpolate(frame, [10, 26], [0, 1], { extrapolateRight: 'clamp' })
  const lineOp = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' })
  const dateOp = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: 'clamp' })

  // Subscribe pill: spring-pulse cycle starting at frame 40.
  const pulseSpring = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 90 } })
  const pulseScale = 1 + 0.04 * Math.sin(pulseSpring * Math.PI)

  const padX = Math.round(width * 0.08)

  const logoMaxWidth = isLandscape ? Math.round(width * 0.32) : Math.round(width * 0.55)
  const headlineSize = Math.round(isLandscape ? 92 : 70)
  const lineSize = Math.round(isLandscape ? 32 : 28)
  const dateSize = Math.round(isLandscape ? 24 : 22)
  const pillSize = Math.round(isLandscape ? 26 : 22)

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {/* Subtle navy radial to add depth without an asset. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 60% at 50% 35%, ${NAVY_DEEP} 0%, transparent 75%)`,
          opacity: 0.7,
          mixBlendMode: 'screen',
        }}
      />

      {/* Top + bottom rule lines. */}
      <div style={{
        position: 'absolute', top: 80, left: padX, width: 220, height: 3, background: GOLD, opacity: 0.85,
      }} />
      <div style={{
        position: 'absolute', top: 80, right: padX, width: 60, height: 3, background: GOLD, opacity: 0.85,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isLandscape ? 26 : 22,
        padding: `0 ${padX}px`,
      }}>
        {/* Logo */}
        {showLogo ? (
          <div style={{
            opacity: logoOp,
            transform: `translateY(${logoLift}px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: logoMaxWidth,
            filter: `drop-shadow(0 8px 28px ${SHADOW_NAVY})`,
          }}>
            <Img
              src={staticFile('brand/stacked_logo_white.png')}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onError={() => {
                // Asset missing — text fallback below renders instead.
              }}
            />
          </div>
        ) : null}

        {/* Sign-off headline. */}
        <div style={{
          color: CREAM,
          fontFamily: FONT_HEAD,
          fontSize: headlineSize,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          opacity: headlineOp,
          textShadow: `0 6px 24px ${SHADOW_NAVY}`,
          maxWidth: width - padX * 2,
        }}>
          {signOff ?? 'See you in the data.'}
        </div>

        {/* URL + phone — Geist tabular nums. */}
        <div style={{
          color: CREAM,
          fontFamily: FONT_BODY,
          fontSize: lineSize,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontWeight: 500,
          opacity: lineOp,
          fontVariantNumeric: 'tabular-nums',
          display: 'flex',
          gap: isLandscape ? 24 : 18,
          alignItems: 'baseline',
        }}>
          <span>{cta.url}</span>
          <span style={{ color: GOLD }}>·</span>
          <span>{cta.phone}</span>
        </div>

        {/* Subscribe pill. */}
        <div style={{
          marginTop: 6,
          padding: `${isLandscape ? 12 : 10}px ${isLandscape ? 28 : 24}px`,
          borderRadius: 999,
          background: GOLD,
          color: NAVY,
          fontFamily: FONT_BODY,
          fontSize: pillSize,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: lineOp,
          transform: `scale(${pulseScale})`,
          boxShadow: `0 6px 20px ${SHADOW_NAVY}`,
        }}>
          Subscribe
        </div>

        {/* Next-report-date sub-line. */}
        <div style={{
          color: 'rgba(250,248,244,0.78)',
          fontFamily: FONT_BODY,
          fontSize: dateSize,
          letterSpacing: '0.08em',
          opacity: dateOp,
          fontVariantNumeric: 'tabular-nums',
        }}>
          Next report: {cta.nextReportDate}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
