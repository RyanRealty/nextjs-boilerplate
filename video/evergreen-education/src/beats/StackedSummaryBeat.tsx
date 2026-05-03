import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, GOLD, NAVY_DEEP, WHITE } from '../brand'
import { EquityBar, StackedEquityChart } from '../components/StackedEquityChart'

type Props = {
  bars: EquityBar[]
  /** seconds at which each bar finishes building (synced to spoken numbers) */
  barRevealTimesSec?: number[]
}

/**
 * StackedSummaryBeat — Beat 5. The wealth-stacking chart.
 * "Look at the four pillars together. At three years..."
 */
export const StackedSummaryBeat: React.FC<Props> = ({ bars, barRevealTimesSec }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  })
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      {/* Title at top */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 60,
          right: 60,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleEnter) * 20}px)`,
        }}
      >
        <div
          style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: 38,
            letterSpacing: 4,
            opacity: 0.7,
          }}
        >
          STACKED OVER TIME
        </div>
        <div
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: 64,
            letterSpacing: 2,
            marginTop: 6,
            textShadow: '0 6px 20px rgba(0,0,0,0.5)',
          }}
        >
          Equity built per year
        </div>
      </div>

      <StackedEquityChart bars={bars} barRevealTimesSec={barRevealTimesSec} />
    </AbsoluteFill>
  )
}
