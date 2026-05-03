import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, GOLD, NAVY_DEEP, WHITE } from '../brand'

type Props = {
  /** target value (number that counts up) */
  target: number
  /** prefix shown before the number, e.g. "+$" */
  prefix?: string
  /** suffix shown after the number, e.g. "/mo" */
  suffix?: string
  /** label text shown above or beside the pill */
  label?: string
  /** style preset */
  variant?: 'large' | 'medium'
  /** delay (frames) before pill enters */
  enterDelayFrames?: number
}

/**
 * CountUpPill — kinetic number reveal in a navy pill with gold accent.
 * Spring entrance + linear count-up over the first half of life.
 */
export const CountUpPill: React.FC<Props> = ({
  target,
  prefix = '',
  suffix = '',
  label,
  variant = 'large',
  enterDelayFrames = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - enterDelayFrames)

  const enterScale = spring({
    frame: f,
    fps,
    config: { damping: 14, stiffness: 110 },
  })

  // Count up over the first 0.9 seconds after entrance
  const countDuration = Math.round(fps * 0.9)
  const progress = interpolate(f, [0, countDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const value = Math.round(target * progress)

  const valueFontSize = variant === 'large' ? 140 : 96
  const labelFontSize = variant === 'large' ? 38 : 32

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        transform: `scale(${enterScale})`,
        transformOrigin: 'center',
      }}
    >
      {label ? (
        <div
          style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: labelFontSize,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          background: NAVY_DEEP,
          border: `3px solid ${GOLD}`,
          borderRadius: 28,
          padding: '24px 56px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
        }}
      >
        <span
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: valueFontSize,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {prefix}
          {value.toLocaleString('en-US')}
        </span>
        {suffix ? (
          <span
            style={{
              color: WHITE,
              fontFamily: FONT_HEAD,
              fontSize: Math.round(valueFontSize * 0.5),
              opacity: 0.8,
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}
