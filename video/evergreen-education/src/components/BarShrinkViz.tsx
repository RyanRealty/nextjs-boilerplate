import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_BODY, FONT_HEAD, GOLD, GOLD_SOFT, NAVY_RICH, WHITE } from '../brand'

type Props = {
  /** initial dollar value (will be shown as "from") */
  initialValue: number
  /** final dollar value (after one year of paydown) — also drives the bar shrink */
  finalValue: number
  /** sub-label, e.g. "year 1: $3,800 paid down" */
  subLabel: string
  /** delay (frames) before viz enters */
  enterDelayFrames?: number
}

/**
 * BarShrinkViz — horizontal bar starts full and shrinks to show loan paydown.
 * Used in Beat 3 (Loan Paydown).
 */
export const BarShrinkViz: React.FC<Props> = ({
  initialValue,
  finalValue,
  subLabel,
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

  const shrinkDuration = Math.round(fps * 1.4)
  const startFrame = Math.round(fps * 0.3)
  const widthPct = interpolate(f, [startFrame, startFrame + shrinkDuration], [100, (finalValue / initialValue) * 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const BAR_WIDTH = 760
  const BAR_HEIGHT = 48

  const formatMoney = (v: number) => `$${v.toLocaleString('en-US')}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        transform: `scale(${enterScale})`,
        transformOrigin: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 18,
        }}
      >
        <span
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: 96,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMoney(initialValue)}
        </span>
        <span
          style={{
            color: WHITE,
            fontFamily: FONT_BODY,
            fontSize: 36,
            opacity: 0.7,
          }}
        >
          loan
        </span>
      </div>
      <div
        style={{
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          background: NAVY_RICH,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
          border: `2px solid ${GOLD_SOFT}`,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${widthPct}%`,
            height: '100%',
            background: GOLD_SOFT,
            transition: 'none',
          }}
        />
      </div>
      <div
        style={{
          color: WHITE,
          fontFamily: FONT_BODY,
          fontSize: 38,
          opacity: 0.92,
        }}
      >
        {subLabel}
      </div>
    </div>
  )
}
