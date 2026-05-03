import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import {
  CREAM,
  FONT_BODY,
  FONT_HEAD,
  GOLD,
  GOLD_SOFT,
  NAVY_RICH,
  PILLAR_COLORS,
  PILLAR_LABELS,
  WHITE,
} from '../brand'

/**
 * Per-year equity breakdown — must match data/4-pillars-equity-by-year.json shape.
 * All values are dollars (whole numbers).
 */
export type EquityBar = {
  year: 3 | 5 | 10 | 20
  cashFlow: number
  appreciation: number
  loanPaydown: number
  taxSavings: number
  total: number
}

type Props = {
  bars: EquityBar[]
  /** seconds at which each bar finishes building (synced to spoken numbers) */
  barRevealTimesSec?: number[]
  enterDelayFrames?: number
}

const formatK = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1000)}K`
  return `$${v}`
}

/**
 * StackedEquityChart — 4 vertical stacked bars at 3yr / 5yr / 10yr / 20yr.
 * Each bar split into 4 colored segments (one per pillar).
 * Bars build left-to-right with a stagger; final hold pulses the 20-yr total.
 *
 * Y-axis is scaled to the maximum total across all bars so the compounding
 * story is visually obvious (small bars left, tall bar right).
 */
export const StackedEquityChart: React.FC<Props> = ({
  bars,
  barRevealTimesSec,
  enterDelayFrames = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - enterDelayFrames)

  const maxTotal = Math.max(...bars.map((b) => b.total))

  // Each bar reveals over ~12 frames; default stagger of 24 frames between bars
  // unless explicit reveal times are provided (synced to VO).
  const STAGGER = 24
  const REVEAL_FRAMES = 14
  const barStartFrames = barRevealTimesSec
    ? barRevealTimesSec.map((s) => Math.round(s * fps))
    : bars.map((_, i) => i * STAGGER)

  // Pulse on 20-yr total in the final 1.5s of the beat
  const pulseStart = Math.round(barStartFrames[bars.length - 1] + REVEAL_FRAMES + fps * 0.6)
  const pulseValue = interpolate(
    f,
    [pulseStart, pulseStart + 18, pulseStart + 36],
    [1, 1.06, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Layout
  const CHART_LEFT = 110
  const CHART_TOP = 380
  const CHART_BOTTOM = 1180 // leave ample room above caption-safe-zone (1480)
  const CHART_RIGHT = 970
  const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP
  const CHART_WIDTH = CHART_RIGHT - CHART_LEFT
  const BAR_GAP = 30
  const BAR_WIDTH = (CHART_WIDTH - BAR_GAP * (bars.length - 1)) / bars.length

  return (
    <>
      {bars.map((bar, i) => {
        const startF = barStartFrames[i]
        const reveal = interpolate(f, [startF, startF + REVEAL_FRAMES], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const fullHeight = (bar.total / maxTotal) * CHART_HEIGHT
        const visibleHeight = fullHeight * reveal

        // Per-segment heights (cash flow at bottom of stack, appreciation at top)
        const segHeights = {
          cashFlow: (bar.cashFlow / bar.total) * visibleHeight,
          loanPaydown: (bar.loanPaydown / bar.total) * visibleHeight,
          taxSavings: (bar.taxSavings / bar.total) * visibleHeight,
          appreciation: (bar.appreciation / bar.total) * visibleHeight,
        }

        const xLeft = CHART_LEFT + i * (BAR_WIDTH + BAR_GAP)

        // 20-yr label gets the pulse + larger size
        const isLast = i === bars.length - 1
        const labelScale = isLast ? pulseValue : 1
        const labelFontSize = isLast ? 64 : 48
        const labelColor = isLast ? GOLD : CREAM

        return (
          <div key={bar.year}>
            {/* Bar — segments stack from bottom up: cash flow, loan paydown, tax, appreciation */}
            <div
              style={{
                position: 'absolute',
                left: xLeft,
                top: CHART_BOTTOM - visibleHeight,
                width: BAR_WIDTH,
                height: visibleHeight,
                display: 'flex',
                flexDirection: 'column-reverse', // stack from bottom up
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <div
                style={{
                  height: segHeights.cashFlow,
                  background: PILLAR_COLORS.cashFlow,
                }}
              />
              <div
                style={{
                  height: segHeights.loanPaydown,
                  background: PILLAR_COLORS.loanPaydown,
                }}
              />
              <div
                style={{
                  height: segHeights.taxSavings,
                  background: PILLAR_COLORS.taxSavings,
                }}
              />
              <div
                style={{
                  height: segHeights.appreciation,
                  background: PILLAR_COLORS.appreciation,
                }}
              />
            </div>

            {/* Total dollar label above bar */}
            <div
              style={{
                position: 'absolute',
                left: xLeft,
                top: CHART_BOTTOM - visibleHeight - (isLast ? 96 : 78),
                width: BAR_WIDTH,
                textAlign: 'center',
                color: labelColor,
                fontFamily: FONT_HEAD,
                fontSize: labelFontSize,
                lineHeight: 1,
                transform: `scale(${labelScale})`,
                transformOrigin: 'center bottom',
                opacity: reveal,
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              {formatK(bar.total)}
            </div>

            {/* X-axis label (year) below bar */}
            <div
              style={{
                position: 'absolute',
                left: xLeft,
                top: CHART_BOTTOM + 14,
                width: BAR_WIDTH,
                textAlign: 'center',
                color: WHITE,
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: 2,
              }}
            >
              {bar.year} YR
            </div>
          </div>
        )
      })}

      {/* Legend below x-axis */}
      <div
        style={{
          position: 'absolute',
          left: CHART_LEFT,
          top: CHART_BOTTOM + 90,
          width: CHART_WIDTH,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {(
          [
            ['appreciation', PILLAR_LABELS.appreciation],
            ['taxSavings', PILLAR_LABELS.taxSavings],
            ['loanPaydown', PILLAR_LABELS.loanPaydown],
            ['cashFlow', PILLAR_LABELS.cashFlow],
          ] as Array<[keyof typeof PILLAR_COLORS, string]>
        ).map(([k, label]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                background: PILLAR_COLORS[k],
                borderRadius: 4,
                border: `1px solid ${k === 'appreciation' ? GOLD_SOFT : 'transparent'}`,
              }}
            />
            <span
              style={{
                color: WHITE,
                fontFamily: FONT_BODY,
                fontSize: 28,
                opacity: 0.92,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
