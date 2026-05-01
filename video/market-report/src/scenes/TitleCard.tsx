import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

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
import type { Scene1Title } from './scene-types'

/**
 * Scene 1 — Title Card.
 *
 * Renders the episode title block: Amboqia headline ("Ryan Realty Market
 * Report"), period sub-label, and the mini-agenda strip in Geist with a
 * gold underline that sweeps in.
 *
 * One component, both orientations: the layout reads `useVideoConfig()` so the
 * same module renders at 1920x1080 (YouTube long-form) and 1080x1920 (Reels /
 * Shorts) without per-orientation forks.
 *
 * No banned words. No logo (per skill rules: no logo in any frame except
 * Scene 8 end card). Brand-tinted shadows only.
 */

export interface TitleCardProps {
  title: Scene1Title
  market: string
  /** Optional override for the headline. Defaults to "Ryan Realty Market Report". */
  headline?: string
}

export const TitleCard: React.FC<TitleCardProps> = ({ title, market, headline }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  void loadFonts()

  const isLandscape = width >= height

  // Header headline fades + lifts in over 0.4s.
  const headlineOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const headlineLift = interpolate(frame, [0, 18], [12, 0], { extrapolateRight: 'clamp' })

  // Period sub-label fades after the headline lands.
  const periodOp = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' })

  // Gold underline sweeps in from left under the period label.
  const underlineSpring = spring({ frame: frame - 14, fps, config: { damping: 24, stiffness: 110 } })
  const underlineWidth = interpolate(underlineSpring, [0, 1], [0, isLandscape ? 360 : 280])

  // Mini-agenda chips fade in one at a time after the underline lands.
  const agendaBaseFrame = 32
  const agendaPerStep = 6

  // Geometry — keep titles inside the safe zone for both orientations.
  const padX = Math.round(width * 0.08)
  const padY = Math.round(height * 0.16)

  const headlineSize = Math.round(isLandscape ? 110 : 84)
  const periodSize = Math.round(isLandscape ? 36 : 30)
  const agendaSize = Math.round(isLandscape ? 26 : 22)

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {/* Soft radial highlight to give the navy plane some depth. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 60% at 50% 35%, ${NAVY_DEEP} 0%, transparent 75%)`,
          opacity: 0.65,
          mixBlendMode: 'screen',
        }}
      />

      {/* Top + bottom rule lines, brand accent. */}
      <div style={{
        position: 'absolute', top: padY * 0.45, left: padX, width: 220, height: 3, background: GOLD, opacity: 0.85,
      }} />
      <div style={{
        position: 'absolute', top: padY * 0.45, right: padX, width: 60, height: 3, background: GOLD, opacity: 0.85,
      }} />
      <div style={{
        position: 'absolute', bottom: padY * 0.5, left: padX, right: padX, height: 1, background: 'rgba(255,255,255,0.10)',
      }} />

      {/* Centered title block. */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${padX}px`,
        gap: isLandscape ? 28 : 24,
      }}>
        <div style={{
          color: CREAM,
          fontFamily: FONT_HEAD,
          fontSize: headlineSize,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          opacity: headlineOp,
          transform: `translateY(${headlineLift}px)`,
          textShadow: `0 6px 24px ${SHADOW_NAVY}`,
          maxWidth: width - padX * 2,
        }}>
          {headline ?? `Ryan Realty Market Report`}
        </div>

        <div style={{
          color: CREAM,
          fontFamily: FONT_BODY,
          fontSize: periodSize,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 500,
          opacity: periodOp,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {market} · {title.monthYear}
        </div>

        <div style={{
          width: underlineWidth,
          height: 3,
          background: GOLD,
          marginTop: 4,
          opacity: 0.95,
        }} />

        {/* Mini-agenda strip — render each item once its fade window opens. */}
        <div style={{
          marginTop: isLandscape ? 36 : 28,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: isLandscape ? 22 : 16,
          maxWidth: width - padX * 2,
        }}>
          {title.miniAgenda.map((item, i) => {
            const opEnter = agendaBaseFrame + i * agendaPerStep
            const opacity = interpolate(frame, [opEnter, opEnter + 10], [0, 1], { extrapolateRight: 'clamp' })
            return (
              <div
                key={item}
                style={{
                  color: CREAM,
                  fontFamily: FONT_BODY,
                  fontSize: agendaSize,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  padding: `${isLandscape ? 8 : 7}px ${isLandscape ? 18 : 14}px`,
                  borderRadius: 999,
                  border: '1px solid rgba(212,175,55,0.55)',
                  background: 'rgba(255,255,255,0.05)',
                  opacity,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
