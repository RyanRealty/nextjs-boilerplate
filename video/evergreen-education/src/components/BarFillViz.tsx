import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_BODY, FONT_HEAD, GOLD, NAVY_RICH, WHITE } from '../brand'

type Props = {
  /** percent (0..100) the bar fills to */
  percent: number
  /** large headline shown above the bar (e.g. "3% / yr") */
  primaryLabel: string
  /** small contextual sub-label shown below the bar (e.g. "first-year gain: $15,000") */
  subLabel?: string
  /** delay (frames) before viz enters */
  enterDelayFrames?: number
}

/**
 * BarFillViz — horizontal bar that fills from 0 to a target percent.
 * Used in Beat 2 (Appreciation) to anchor the 3% rate visually.
 */
export const BarFillViz: React.FC<Props> = ({
  percent,
  primaryLabel,
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

  // Bar fills over ~1.2s
  const fillDuration = Math.round(fps * 1.2)
  const fillPct = interpolate(f, [Math.round(fps * 0.2), Math.round(fps * 0.2) + fillDuration], [0, percent], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const BAR_WIDTH = 760
  const BAR_HEIGHT = 40

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 26,
        transform: `scale(${enterScale})`,
        transformOrigin: 'center',
      }}
    >
      <div
        style={{
          color: GOLD,
          fontFamily: FONT_HEAD,
          fontSize: 130,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {primaryLabel}
      </div>
      <div
        style={{
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          background: NAVY_RICH,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
          border: `2px solid ${GOLD}`,
        }}
      >
        <div
          style={{
            width: `${fillPct}%`,
            height: '100%',
            background: GOLD,
          }}
        />
      </div>
      {subLabel ? (
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
      ) : null}
    </div>
  )
}
