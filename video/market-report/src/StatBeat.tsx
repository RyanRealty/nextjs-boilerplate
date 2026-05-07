import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Background } from './Background'
import { ImageLayer } from './ImageLayer'
import { CREAM, FONT_BODY, FONT_HEAD, GOLD, GOLD_SOFT, NAVY, NAVY_DEEP, NAVY_RICH, WHITE, WHITE_DIM, WHITE_SOFT } from './brand'

export type StatLayout =
  | 'hero'
  | 'bar'
  | 'compare'
  | 'callout'
  | 'label-only'
  | 'line_chart'
  | 'multi_year_bars'
  | 'histogram'
  | 'gauge'
  | 'price_band'
  | 'leaderboard'
  | 'takeaway'

// One bar in the multi_year_bars layout. value drives bar height; label is
// pre-formatted for display (e.g. "$699K"); current=true highlights as gold.
export type MultiYearBar = { year: string; value: number; label: string; current?: boolean }

// Series points for line_chart layout. `color` (optional) sets that point's
// dot fill AND the segment that LEADS INTO it (segment from points[i-1] to
// points[i]). When omitted, defaults to GOLD. Used for the multi-year price
// chart where each year transition is rendered in its own brand-aligned hue
// so the viewer can see at a glance which delta is which.
export type ChartPoint = { month: string; value: number; color?: string; yearLabel?: string }
// Bins for histogram layout
export type HistogramBin = { label: string; count: number; pct: number }
// Bands for price_band layout
export type PriceBand = { label: string; count: number; pct: number; color?: string }
// Rows for leaderboard layout
export type LeaderboardRow = { name: string; median: string; yoy: string; highlight?: boolean }

export type StatBeatProps = {
  index: number
  total: number
  label: string
  value: string
  unit?: string
  context?: string
  changeText?: string // e.g. "↓ 7.3% YoY"
  changeDir?: 'up' | 'down' | 'flat'
  layout: StatLayout
  bgVariant: 'navy' | 'navy-rich' | 'gold-tint' | 'cream' | 'navy-radial'
  accentSide?: 'left' | 'right'
  barPct?: number
  pillText?: string
  /** Slug-based image source e.g. "bend/img_2.jpg" — from props injected at render time */
  imageSrc?: string
  durationInFrames?: number

  // Layout-specific extras
  series?: ChartPoint[]
  currentLabel?: string
  currentValue?: number
  comparisonLabel?: string
  comparisonValue?: number

  bins?: HistogramBin[]
  annotations?: string[]

  // multi_year_bars layout — show 4 historical years side-by-side with values
  // visible on each bar so viewers see all the comparison data without VO
  // having to read it.
  multiYearBars?: MultiYearBar[]

  gaugeValue?: number
  gaugeMin?: number
  gaugeMax?: number
  verdict?: 'sellers' | 'balanced' | 'buyers'
  verdictText?: string

  bands?: PriceBand[]

  rows?: LeaderboardRow[]

  buyer?: string[]
  seller?: string[]
}

export const StatBeat: React.FC<StatBeatProps> = (props) => {
  const {
    index, total, label, value, unit, context, changeText, changeDir = 'flat',
    layout, bgVariant, accentSide = 'right', barPct = 0, pillText,
    imageSrc, durationInFrames = 120,
  } = props

  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 120 } })
  const valueScale = interpolate(intro, [0, 1], [0.85, 1])
  const valueOp = interpolate(intro, [0, 1], [0, 1])
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: 'clamp' })
  const ctxOp = interpolate(frame, [16, 28], [0, 1], { extrapolateRight: 'clamp' })
  const lineW = interpolate(frame, [2, 28], [0, 220], { extrapolateRight: 'clamp' })
  const barFill = interpolate(frame, [12, 38], [0, Math.max(0, Math.min(1, barPct))], { extrapolateRight: 'clamp' })

  const cream = bgVariant === 'cream'
  const fg = cream ? NAVY : WHITE
  const fgSoft = cream ? 'rgba(16,39,66,0.78)' : WHITE_SOFT
  const fgDim = cream ? 'rgba(16,39,66,0.55)' : WHITE_DIM

  const arrow = changeDir === 'up' ? '↑' : changeDir === 'down' ? '↓' : '→'
  const changeColor = changeDir === 'up' ? '#7BD389' : changeDir === 'down' ? '#FF8B7E' : GOLD

  // ===== Existing 5 layouts (unchanged) =====
  const renderLabelOnly = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      transform: `translateY(${-60}px)`,
    }}>
      <div style={{ width: lineW, height: 3, background: GOLD }} />
      <div style={{
        color: fg, fontFamily: FONT_BODY, fontSize: 56, letterSpacing: 6,
        textTransform: 'uppercase', opacity: labelOp, fontWeight: 800, textAlign: 'center',
        maxWidth: 860, lineHeight: 1.2,
        textShadow: imageSrc ? '0 2px 16px rgba(0,0,0,0.7)' : 'none',
      }}>
        {label}
      </div>
      <div style={{ width: lineW * 0.6, height: 2, background: GOLD, opacity: 0.6 }} />
    </div>
  )

  const renderHero = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{
        color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
        textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ width: lineW, height: 3, background: GOLD }} />
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14,
        transform: `scale(${valueScale})`, opacity: valueOp,
      }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 220, lineHeight: 0.92, letterSpacing: -3,
          textShadow: imageSrc ? '0 4px 24px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 64, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      {changeText ? (
        <div style={{
          marginTop: 8, padding: '10px 22px', borderRadius: 999,
          background: cream ? 'rgba(16,39,66,0.08)' : 'rgba(255,255,255,0.10)',
          border: `2px solid ${changeColor}`, color: changeColor,
          fontFamily: FONT_BODY, fontSize: 32, fontWeight: 700, opacity: ctxOp,
        }}>
          {arrow} {changeText}
        </div>
      ) : null}
      {context ? (
        <div style={{
          color: fgSoft, fontFamily: FONT_BODY, fontSize: 32, marginTop: 14,
          textAlign: 'center', maxWidth: 860, opacity: ctxOp,
        }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderBar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: 880 }}>
      <div style={{
        color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
        textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12, opacity: valueOp }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 200, lineHeight: 0.92, letterSpacing: -3,
          textShadow: imageSrc ? '0 4px 24px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 56, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      <div style={{
        width: '100%', height: 24,
        background: cream ? 'rgba(16,39,66,0.12)' : 'rgba(255,255,255,0.12)',
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${cream ? 'rgba(16,39,66,0.18)' : 'rgba(255,255,255,0.18)'}`,
      }}>
        <div style={{ width: `${barFill * 100}%`, height: '100%', background: GOLD, borderRadius: 12 }} />
      </div>
      {context ? (
        <div style={{
          color: fgSoft, fontFamily: FONT_BODY, fontSize: 30, textAlign: 'center',
          maxWidth: 880, opacity: ctxOp,
        }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderCompare = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <div style={{
        color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
        textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ width: lineW, height: 3, background: GOLD }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, opacity: valueOp }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 196, lineHeight: 0.92, letterSpacing: -2,
          textShadow: imageSrc ? '0 4px 24px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 52, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      {changeText ? (
        <div style={{ color: changeColor, fontFamily: FONT_BODY, fontSize: 38, fontWeight: 700, opacity: ctxOp }}>
          {arrow} {changeText}
        </div>
      ) : null}
      {context ? (
        <div style={{
          color: fgSoft, fontFamily: FONT_BODY, fontSize: 30, marginTop: 6,
          textAlign: 'center', maxWidth: 860, opacity: ctxOp,
        }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderCallout = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {pillText ? (
        <div style={{
          padding: '14px 32px', borderRadius: 999, background: GOLD, color: NAVY,
          fontFamily: FONT_BODY, fontSize: 30, fontWeight: 800, letterSpacing: 4,
          textTransform: 'uppercase', opacity: labelOp,
        }}>
          {pillText}
        </div>
      ) : null}
      <div style={{
        color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
        textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 14, opacity: valueOp,
        transform: `scale(${valueScale})`,
      }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 220, lineHeight: 0.92, letterSpacing: -3,
          textShadow: imageSrc ? '0 4px 24px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 60, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      {context ? (
        <div style={{
          color: fgSoft, fontFamily: FONT_BODY, fontSize: 32, marginTop: 6,
          textAlign: 'center', maxWidth: 860, opacity: ctxOp,
        }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  // ===== LAYOUT: line_chart =====
  //
  // Multi-color line chart for the median sale price (Matt directive
  // 2026-05-07: "different year and color for each line").
  //
  // Each ChartPoint carries its own `color` and optional `yearLabel`. The
  // segment LEADING INTO point i is rendered in points[i].color, so the
  // viewer can see at a glance which year-to-year delta is which color.
  // Each point's dot, year label, and value tag are also rendered in the
  // same color. Segments draw sequentially (stagger = 6 frames each) so
  // the timeline reveals year-by-year, not all at once.
  //
  // Used for the 4-year price compare (2019 / 2024 / 2025 / 2026) — but
  // generalizes to any per-point color story.
  const renderLineChart = () => {
    const series = props.series || []
    if (series.length === 0) return null
    const W = 940
    const H = 620
    const PAD_L = 130
    const PAD_R = 60
    const PAD_T = 70
    const PAD_B = 130
    const innerW = W - PAD_L - PAD_R
    const innerH = H - PAD_T - PAD_B
    const values = series.map(s => s.value)
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    // Floor at 70% of min so even the lowest point sits comfortably above the
    // axis (room for the value tag below the dot).
    const floor = Math.max(0, minV - (maxV - minV) * 0.4)
    const ceil = maxV + (maxV - minV) * 0.18
    const range = Math.max(1, ceil - floor)
    const xFor = (i: number) => PAD_L + (i / Math.max(1, series.length - 1)) * innerW
    const yFor = (v: number) => PAD_T + innerH - ((v - floor) / range) * innerH

    // Y-axis ticks
    const round25 = (v: number) => Math.round(v / 25000) * 25000
    const yTicks = [round25(floor + range * 0.0), round25(floor + range * 0.5), round25(ceil)]
    const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`

    // Sequential segment reveal: segment i starts at frame 6 + i*6.
    const axesOp = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{ width: lineW, height: 3, background: GOLD }} />
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {/* Axes */}
          <g opacity={axesOp}>
            <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH}
              stroke={GOLD} strokeWidth={2} opacity={0.55} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + innerH}
              stroke={GOLD} strokeWidth={2} opacity={0.55} />
            {/* Y-axis tick labels + horizontal guides */}
            {yTicks.map((tv, i) => (
              <g key={`yt-${i}`}>
                <text x={PAD_L - 14} y={yFor(tv) + 8} fill={CREAM}
                  fontFamily={FONT_BODY} fontSize={24} fontWeight={600}
                  textAnchor="end"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
                  }}>
                  {fmt(tv)}
                </text>
                <line x1={PAD_L} y1={yFor(tv)} x2={PAD_L + innerW} y2={yFor(tv)}
                  stroke={GOLD} strokeWidth={1} strokeDasharray="3 6" opacity={0.16} />
              </g>
            ))}
          </g>

          {/* Multi-color segments — each segment carries the color of its END point */}
          {series.slice(1).map((p, idx) => {
            const i = idx + 1                            // index into series
            const segStartFrame = 6 + i * 6              // stagger reveal
            const segProg = interpolate(frame, [segStartFrame, segStartFrame + 12], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const x1 = xFor(i - 1)
            const y1 = yFor(series[i - 1].value)
            const x2 = xFor(i)
            const y2 = yFor(p.value)
            // Animate the line by interpolating the end coord along the segment.
            const drawX = x1 + (x2 - x1) * segProg
            const drawY = y1 + (y2 - y1) * segProg
            const segColor = p.color || GOLD
            return (
              <g key={`seg-${i}`}>
                <line x1={x1} y1={y1} x2={drawX} y2={drawY}
                  stroke={segColor} strokeWidth={5}
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.65))' }} />
              </g>
            )
          })}

          {/* Per-point dots, year labels, and value tags */}
          {series.map((p, i) => {
            // Reveal each point as its incoming segment finishes.
            const pointFrame = 6 + i * 6 + (i === 0 ? 0 : 12)
            const dotOp = interpolate(frame, [pointFrame, pointFrame + 6], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const dotPulse = interpolate(frame % 60, [0, 30, 60], [1, 1.25, 1])
            const isLast = i === series.length - 1
            const r = isLast ? 14 * dotPulse : 10
            const color = p.color || GOLD
            const x = xFor(i)
            const y = yFor(p.value)

            return (
              <g key={`pt-${i}`} opacity={dotOp}>
                {/* Dot with glow on the current/last point */}
                <circle cx={x} cy={y} r={r}
                  fill={color}
                  style={{
                    filter: isLast
                      ? `drop-shadow(0 0 16px ${color}cc)`
                      : 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
                  }} />
                {isLast ? <circle cx={x} cy={y} r={5} fill={WHITE} /> : null}

                {/* Value tag above dot */}
                <text x={x} y={y - r - 14}
                  fill={WHITE}
                  fontFamily={FONT_HEAD}
                  fontSize={isLast ? 38 : 30}
                  fontWeight={isLast ? 800 : 600}
                  textAnchor="middle"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))',
                  }}>
                  {fmt(p.value)}
                </text>

                {/* Year label below x-axis (use yearLabel prop, fallback to month) */}
                <text x={x} y={PAD_T + innerH + 38}
                  fill={color}
                  fontFamily={FONT_BODY}
                  fontSize={isLast ? 28 : 24}
                  fontWeight={isLast ? 800 : 700}
                  textAnchor="middle"
                  letterSpacing={2}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
                  {p.yearLabel || p.month}
                </text>

                {/* "CURRENT" pill under the active point */}
                {isLast ? (
                  <text x={x} y={PAD_T + innerH + 70}
                    fill={GOLD}
                    fontFamily={FONT_BODY}
                    fontSize={18}
                    fontWeight={800}
                    textAnchor="middle"
                    letterSpacing={4}
                    opacity={ctxOp}>
                    CURRENT
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>

        {/* Optional context line beneath the chart (e.g. "+52% / 7y") */}
        {context ? (
          <div style={{
            color: fgSoft, fontFamily: FONT_BODY, fontSize: 30, marginTop: 8,
            textAlign: 'center', maxWidth: 880, opacity: ctxOp, fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}>
            {context}
          </div>
        ) : null}
      </div>
    )
  }

  // ===== NEW LAYOUT: multi_year_bars =====
  // Four vertical bars side-by-side, one per historical year. Each bar shows
  // the value above (e.g. "$699K") and the year below (e.g. "2026"). Current
  // year (current=true) renders in solid gold; historical years in soft gold.
  // Bars rise sequentially L→R so the eye tracks the progression naturally.
  // Used for the median sale price multi-year compare so the viewer sees ALL
  // four data points at once instead of having to listen to a VO recite them.
  const renderMultiYearBars = () => {
    const bars = props.multiYearBars || []
    if (bars.length === 0) return null
    const W = 920
    const H = 600
    const PAD_L = 60
    const PAD_R = 60
    const PAD_T = 100   // room for value labels above bars
    const PAD_B = 90    // room for year labels below bars
    const innerW = W - PAD_L - PAD_R
    const innerH = H - PAD_T - PAD_B
    const maxV = Math.max(...bars.map(b => b.value))
    const minV = Math.min(...bars.map(b => b.value))
    // Use a partial-height baseline so even the smallest bar has visible
    // height — purely visual, the value label still carries the truth.
    const floor = minV * 0.7
    const range = Math.max(1, maxV - floor)
    const slot = innerW / bars.length
    const barW = slot * 0.6
    const barGap = slot * 0.4

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{ width: lineW, height: 3, background: GOLD }} />
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {/* Subtle baseline */}
          <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH}
            stroke={GOLD} strokeWidth={2} opacity={0.55} />
          {bars.map((b, i) => {
            const sp = spring({
              frame: Math.max(0, frame - 6 - i * 6), fps,
              config: { damping: 14, stiffness: 130 },
            })
            const fullH = ((b.value - floor) / range) * innerH
            const h = fullH * sp
            const x = PAD_L + i * slot + barGap / 2
            const y = PAD_T + innerH - h
            const isCurrent = !!b.current
            const fill = isCurrent ? GOLD : GOLD_SOFT
            const strokeColor = isCurrent ? WHITE : 'rgba(255,255,255,0.55)'

            // Value label fade-in tied to bar spring
            const valueOpacity = interpolate(sp, [0, 1], [0, 1])

            return (
              <g key={`mybar-${i}`}>
                {/* Bar */}
                <rect x={x} y={y} width={barW} height={h}
                  fill={fill}
                  stroke={isCurrent ? WHITE : 'transparent'}
                  strokeWidth={isCurrent ? 2 : 0}
                  rx={6} ry={6}
                  style={{ filter: isCurrent
                    ? 'drop-shadow(0 0 16px rgba(212,175,55,0.6))'
                    : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                />
                {/* Value label above bar (e.g. "$699K") */}
                <text
                  x={x + barW / 2}
                  y={y - 16}
                  fill={isCurrent ? WHITE : CREAM}
                  fontFamily={FONT_HEAD}
                  fontSize={isCurrent ? 56 : 44}
                  fontWeight={isCurrent ? 800 : 600}
                  textAnchor="middle"
                  opacity={valueOpacity}
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))',
                  }}>
                  {b.label}
                </text>
                {/* Year label below bar */}
                <text
                  x={x + barW / 2}
                  y={PAD_T + innerH + 36}
                  fill={isCurrent ? GOLD : WHITE_DIM}
                  fontFamily={FONT_BODY}
                  fontSize={isCurrent ? 30 : 26}
                  fontWeight={isCurrent ? 800 : 600}
                  textAnchor="middle"
                  letterSpacing={2}
                  style={{
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
                  }}>
                  {b.year}
                </text>
                {/* "CURRENT" pill under the active bar */}
                {isCurrent ? (
                  <text
                    x={x + barW / 2}
                    y={PAD_T + innerH + 70}
                    fill={GOLD}
                    fontFamily={FONT_BODY}
                    fontSize={18}
                    fontWeight={800}
                    textAnchor="middle"
                    letterSpacing={4}
                    opacity={ctxOp}>
                    CURRENT
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {/* Optional context line at bottom (e.g. "+52% / 7y") */}
        {context ? (
          <div style={{
            color: fgSoft, fontFamily: FONT_BODY, fontSize: 30, marginTop: 4,
            textAlign: 'center', maxWidth: 880, opacity: ctxOp, fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}>
            {context}
          </div>
        ) : null}
      </div>
    )
  }

  // ===== NEW LAYOUT: histogram =====
  // Vertical bar chart, bins build sequentially L->R with stagger, two annotations.
  const renderHistogram = () => {
    const bins = props.bins || []
    if (bins.length === 0) return null
    const W = 900
    const H = 540
    const PAD_L = 60
    const PAD_R = 40
    const PAD_T = 40
    const PAD_B = 110
    const innerW = W - PAD_L - PAD_R
    const innerH = H - PAD_T - PAD_B
    const maxPct = Math.max(...bins.map(b => b.pct))
    const barW = innerW / bins.length - 12

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{
          color: WHITE, fontFamily: FONT_HEAD, fontSize: 124, lineHeight: 0.95, letterSpacing: -3,
          opacity: valueOp, transform: `scale(${valueScale})`,
          textShadow: '0 4px 24px rgba(0,0,0,0.7)',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</div>
        <svg width={W} height={H}>
          {/* Baseline */}
          <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH}
            stroke={GOLD} strokeWidth={2} opacity={0.55} />
          {bins.map((b, i) => {
            const barProg = spring({
              frame: Math.max(0, frame - 6 - i * 4), fps,
              config: { damping: 14, stiffness: 130 },
            })
            const h = (b.pct / maxPct) * innerH * barProg
            const x = PAD_L + i * (innerW / bins.length) + 6
            const y = PAD_T + innerH - h
            // Highlight first 4 bins (≤10 days) in gold, rest in soft gold
            const fill = i <= 3 ? GOLD : GOLD_SOFT
            return (
              <g key={`bin-${i}`}>
                <rect x={x} y={y} width={barW} height={h} fill={fill}
                  rx={4} ry={4}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
                <text x={x + barW / 2} y={PAD_T + innerH + 30}
                  fill={WHITE_DIM} fontFamily={FONT_BODY} fontSize={22}
                  textAnchor="middle" fontWeight={600}>
                  {b.label}
                </text>
                <text x={x + barW / 2} y={PAD_T + innerH + 60}
                  fill={CREAM} fontFamily={FONT_BODY} fontSize={20}
                  textAnchor="middle" fontWeight={700}
                  opacity={barProg}
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {b.pct.toFixed(0)}%
                </text>
              </g>
            )
          })}
        </svg>
        {/* Annotations */}
        {props.annotations && props.annotations.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: ctxOp }}>
            {props.annotations.map((a, i) => (
              <div key={`ann-${i}`} style={{
                color: i === 0 ? GOLD : CREAM,
                fontFamily: FONT_BODY, fontSize: 28, fontWeight: 700,
                textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}>
                {a}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  // ===== NEW LAYOUT: gauge =====
  // Semicircular MoS gauge 0-10. Color zones: 0-4 red, 4-6 yellow, 6+ green.
  const renderGauge = () => {
    const min = props.gaugeMin ?? 0
    const max = props.gaugeMax ?? 10
    const v = props.gaugeValue ?? 0
    const verdict = props.verdict ?? 'balanced'
    const verdictText = props.verdictText ?? verdict.toUpperCase() + ' MARKET'

    const W = 800
    const H = 480
    const cx = W / 2
    const cy = H - 60
    const r = 320

    // Spring needle from min to v
    const sp = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 16, stiffness: 100 } })
    const target = (v - min) / (max - min)
    const needleProg = interpolate(sp, [0, 1], [0, target])

    // Arc 180° (semicircle), from left (180°) to right (0°)
    const arcAngle = (pct: number) => Math.PI * (1 - pct) // 0 -> π (left), 1 -> 0 (right)
    const arcPoint = (pct: number) => ({
      x: cx + r * Math.cos(arcAngle(pct)),
      y: cy - r * Math.sin(arcAngle(pct)),
    })

    // Zones: 0-0.4 red, 0.4-0.6 yellow, 0.6-1.0 green
    const buildArc = (p1: number, p2: number) => {
      const a = arcPoint(p1)
      const b = arcPoint(p2)
      const large = p2 - p1 > 0.5 ? 1 : 0
      return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`
    }

    const needlePoint = arcPoint(needleProg)
    const verdictColor = verdict === 'sellers' ? '#FF8B7E'
      : verdict === 'buyers' ? '#7BD389'
      : GOLD

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {/* Zones */}
          <path d={buildArc(0, 0.4)} stroke="#FF8B7E" strokeWidth={28} fill="none"
            strokeLinecap="butt" opacity={labelOp * 0.85} />
          <path d={buildArc(0.4, 0.6)} stroke="#F2D78A" strokeWidth={28} fill="none"
            strokeLinecap="butt" opacity={labelOp * 0.85} />
          <path d={buildArc(0.6, 1.0)} stroke="#7BD389" strokeWidth={28} fill="none"
            strokeLinecap="butt" opacity={labelOp * 0.85} />
          {/* Tick labels */}
          {[0, 4, 6, 10].map((tv) => {
            const p = (tv - min) / (max - min)
            const ti = arcPoint(p)
            const to = {
              x: cx + (r + 38) * Math.cos(arcAngle(p)),
              y: cy - (r + 38) * Math.sin(arcAngle(p)),
            }
            return (
              <text key={`gt-${tv}`} x={to.x} y={to.y + 8}
                fill={CREAM} fontFamily={FONT_BODY} fontSize={26}
                textAnchor="middle" fontWeight={700}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {tv}
              </text>
            )
          })}
          {/* Needle */}
          <line x1={cx} y1={cy} x2={needlePoint.x} y2={needlePoint.y}
            stroke={WHITE} strokeWidth={6} strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }} />
          <circle cx={cx} cy={cy} r={16} fill={GOLD}
            style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.85))' }} />
          {/* Center value */}
          <text x={cx} y={cy - 80} fill={WHITE}
            fontFamily={FONT_HEAD} fontSize={140} textAnchor="middle"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(2)}
          </text>
          <text x={cx} y={cy - 30} fill={GOLD}
            fontFamily={FONT_BODY} fontSize={28} textAnchor="middle"
            fontWeight={700} letterSpacing={6}>
            MONTHS
          </text>
        </svg>
        {/* Verdict pill */}
        <div style={{
          marginTop: 4, padding: '14px 36px', borderRadius: 999,
          background: 'rgba(16,39,66,0.85)',
          border: `2px solid ${verdictColor}`,
          color: WHITE,
          fontFamily: FONT_BODY, fontSize: 30, fontWeight: 800, letterSpacing: 4,
          textTransform: 'uppercase', opacity: ctxOp,
        }}>
          {verdictText}
        </div>
        {context ? (
          <div style={{
            color: fgSoft, fontFamily: FONT_BODY, fontSize: 28, marginTop: 6,
            textAlign: 'center', maxWidth: 860, opacity: ctxOp,
          }}>
            {context}
          </div>
        ) : null}
      </div>
    )
  }

  // ===== NEW LAYOUT: price_band =====
  // Horizontal stacked bar with 5 segments, sequential L->R reveal.
  const renderPriceBand = () => {
    const bands = props.bands || []
    if (bands.length === 0) return null
    const W = 900
    const H = 100
    const totalPct = bands.reduce((s, b) => s + b.pct, 0) || 100

    let cumX = 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%' }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        {/* Stacked bar */}
        <svg width={W} height={H} style={{ borderRadius: 16, overflow: 'visible' }}>
          {bands.map((b, i) => {
            const segProg = spring({
              frame: Math.max(0, frame - 6 - i * 5), fps,
              config: { damping: 14, stiffness: 130 },
            })
            const segW = (b.pct / totalPct) * W * segProg
            const x = cumX
            cumX += (b.pct / totalPct) * W
            const fill = b.color || (i % 2 === 0 ? GOLD : GOLD_SOFT)
            return (
              <g key={`pb-${i}`}>
                <rect x={x} y={20} width={segW} height={H - 40}
                  fill={fill} stroke={WHITE} strokeWidth={1}
                  rx={i === 0 ? 12 : 0} />
              </g>
            )
          })}
        </svg>
        {/* Legend rows */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14, width: 800, marginTop: 6,
          opacity: ctxOp,
        }}>
          {bands.map((b, i) => (
            <div key={`leg-${i}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px',
              background: 'rgba(16,39,66,0.55)',
              border: `1px solid rgba(212,175,55,0.30)`,
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 22, height: 22, background: b.color || GOLD, borderRadius: 4 }} />
                <span style={{
                  color: WHITE, fontFamily: FONT_BODY, fontSize: 28, fontWeight: 700,
                }}>{b.label}</span>
              </div>
              <span style={{
                color: GOLD, fontFamily: FONT_BODY, fontSize: 28, fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}>{b.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ===== NEW LAYOUT: leaderboard =====
  // Subdivision rows, slide-in bottom-to-top with 6-frame stagger. Highlight row gets ring.
  const renderLeaderboard = () => {
    const rows = props.rows || []
    if (rows.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 880 }}>
          {rows.map((r, i) => {
            const sp = spring({
              frame: Math.max(0, frame - 6 - i * 6), fps,
              config: { damping: 16, stiffness: 120 },
            })
            const op = sp
            const ty = interpolate(sp, [0, 1], [40, 0])
            const isPositive = r.yoy.startsWith('+')
            const yoyColor = isPositive ? '#7BD389' : '#FF8B7E'
            return (
              <div key={`row-${i}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px',
                background: 'rgba(16,39,66,0.78)',
                border: r.highlight ? `3px solid ${GOLD}` : `1px solid rgba(212,175,55,0.30)`,
                borderRadius: 16,
                opacity: op, transform: `translateY(${ty}px)`,
                boxShadow: r.highlight ? '0 0 24px rgba(212,175,55,0.45)' : 'none',
              }}>
                <span style={{
                  color: WHITE, fontFamily: FONT_HEAD, fontSize: 48, lineHeight: 1.0,
                  letterSpacing: -0.5, maxWidth: 380,
                  textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                }}>{r.name}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{
                    color: GOLD, fontFamily: FONT_BODY, fontSize: 44, fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums', lineHeight: 1.0,
                  }}>{r.median}</span>
                  <span style={{
                    color: yoyColor, fontFamily: FONT_BODY, fontSize: 32, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{r.yoy}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ===== NEW LAYOUT: takeaway =====
  // Two-panel split (FOR BUYERS / FOR SELLERS) with 2 bullets each.
  const renderTakeaway = () => {
    const buyer = props.buyer || []
    const seller = props.seller || []

    const renderPanel = (header: string, items: string[], side: 'top' | 'bottom') => {
      const startFrame = side === 'top' ? 6 : 24
      const sp = spring({
        frame: Math.max(0, frame - startFrame), fps,
        config: { damping: 16, stiffness: 110 },
      })
      const op = sp
      const tx = interpolate(sp, [0, 1], [side === 'top' ? -30 : 30, 0])
      return (
        <div style={{
          flex: 1,
          padding: '32px 36px',
          background: 'rgba(16,39,66,0.72)',
          border: `1px solid rgba(212,175,55,0.4)`,
          borderRadius: 18,
          opacity: op,
          transform: `translateX(${tx}px)`,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{
            color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 8,
            textTransform: 'uppercase', fontWeight: 800,
          }}>
            {header}
          </div>
          <div style={{ width: 80, height: 2, background: GOLD, opacity: 0.7 }} />
          {items.map((item, i) => (
            <div key={`${header}-${i}`} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{
                color: GOLD, fontFamily: FONT_BODY, fontSize: 36, fontWeight: 800,
                lineHeight: 1.2,
              }}>•</span>
              <span style={{
                color: WHITE, fontFamily: FONT_BODY, fontSize: 36, fontWeight: 600,
                lineHeight: 1.3, flex: 1,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 24, width: 880,
      }}>
        <div style={{
          color: GOLD, fontFamily: FONT_BODY, fontSize: 26, letterSpacing: 8,
          textTransform: 'uppercase', opacity: labelOp, fontWeight: 700,
          textAlign: 'center',
        }}>
          {label}
        </div>
        {renderPanel('FOR BUYERS', buyer, 'top')}
        {renderPanel('FOR SELLERS', seller, 'bottom')}
      </div>
    )
  }

  return (
    <AbsoluteFill>
      {/* Image background — fallback to gradient if no image */}
      {imageSrc ? (
        <ImageLayer src={imageSrc} durationInFrames={durationInFrames} direction={index % 2 === 0 ? 'left' : 'right'} />
      ) : (
        <Background variant={bgVariant} accentSide={accentSide} />
      )}

      {/* Beat counter top-right */}
      <div style={{
        position: 'absolute', top: 80, right: 110,
        color: cream ? 'rgba(16,39,66,0.65)' : 'rgba(255,255,255,0.55)',
        fontFamily: FONT_BODY, fontSize: 22, letterSpacing: 4, fontWeight: 700,
      }}>
        {String(index).padStart(2, '0')} · {String(total).padStart(2, '0')}
      </div>

      {/* Top-left accent line */}
      <div style={{ position: 'absolute', top: 80, left: 90, width: 200, height: 3, background: GOLD, opacity: 0.85 }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 90px', paddingBottom: 540 }}>
        {layout === 'label-only' && renderLabelOnly()}
        {layout === 'hero' && renderHero()}
        {layout === 'bar' && renderBar()}
        {layout === 'compare' && renderCompare()}
        {layout === 'callout' && renderCallout()}
        {layout === 'line_chart' && renderLineChart()}
        {layout === 'multi_year_bars' && renderMultiYearBars()}
        {layout === 'histogram' && renderHistogram()}
        {layout === 'gauge' && renderGauge()}
        {layout === 'price_band' && renderPriceBand()}
        {layout === 'leaderboard' && renderLeaderboard()}
        {layout === 'takeaway' && renderTakeaway()}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
