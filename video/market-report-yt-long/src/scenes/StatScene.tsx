/**
 * StatScene — landscape (1920x1080) chapter content wrapper.
 *
 * Wraps the short-form StatBeat layouts scaled and repositioned for the
 * 1920x1080 canvas:
 *   - Hero numbers: 320px (was 220px in portrait)
 *   - Chart widths: 1620px (was 920px in portrait)
 *   - Content area: centered, max-width 1700px
 *   - Beat counter: top-right at (1820, 56) instead of (1080-110, 80)
 *   - Caption zone reserved at y 920-1040 — bottom padding keeps content clear
 *
 * Per skill spec §4: "Reuse the same StatBeat layouts (line_chart, gauge,
 * histogram, leaderboard, takeaway) but at 1920x1080 dimensions."
 *
 * Every layout is imported from the canonical StatBeat module; this file
 * adapts the container geometry and fires the chapter header overlay.
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterHeader } from './ChapterHeader'
import { LandscapeImageLayer } from './LandscapeImageLayer'
import {
  CREAM, FONT_BODY, FONT_HEAD, GOLD, GOLD_SOFT, NAVY, WHITE, WHITE_DIM, WHITE_SOFT,
} from '../brand'

// ─── Type aliases (mirrors StatBeat types) ────────────────────────────────────

export type StatLayout =
  | 'hero'
  | 'bar'
  | 'compare'
  | 'callout'
  | 'line_chart'
  | 'multi_year_bars'
  | 'histogram'
  | 'gauge'
  | 'price_band'
  | 'leaderboard'
  | 'takeaway'
  | 'donut'

export type ChartPoint = { month: string; value: number; color?: string; yearLabel?: string }
export type HistogramBin = { label: string; count: number; pct: number }
export type PriceBand = { label: string; count: number; pct: number; color?: string }
export type LeaderboardRow = { name: string; median: string; dom?: string; yoy: string; highlight?: boolean }
export type MultiYearBar = { year: string; value: number; label: string; current?: boolean }

export type StatSceneProps = {
  // Chapter metadata
  chapterNumber: number
  chapterTitle: string

  // Content
  label: string
  value: string
  unit?: string
  context?: string
  changeText?: string
  changeDir?: 'up' | 'down' | 'flat'
  layout: StatLayout
  bgVariant: 'navy' | 'navy-rich' | 'gold-tint' | 'cream' | 'navy-radial'
  accentSide?: 'left' | 'right'
  barPct?: number
  pillText?: string
  imageSrc?: string
  durationInFrames?: number

  // Chart data
  series?: ChartPoint[]
  bins?: HistogramBin[]
  annotations?: string[]
  multiYearBars?: MultiYearBar[]
  bands?: PriceBand[]
  rows?: LeaderboardRow[]
  buyer?: string[]
  seller?: string[]
  gaugeValue?: number
  gaugeMin?: number
  gaugeMax?: number
  verdict?: 'sellers' | 'balanced' | 'buyers'
  verdictText?: string
  donutPct?: number
  donutLabel?: string
}

// ─── Landscape background (no-photo variant) ─────────────────────────────────

const LandscapeBackground: React.FC<{ variant: string }> = ({ variant }) => {
  const palettes: Record<string, string> = {
    navy: '#102742',
    'navy-rich': '#173356',
    'gold-tint': '#102742',
    cream: '#faf8f4',
    'navy-radial': '#0A1A2E',
  }
  const bg = palettes[variant] || '#102742'
  return <AbsoluteFill style={{ backgroundColor: bg }} />
}

// ─── Main StatScene ───────────────────────────────────────────────────────────

export const StatScene: React.FC<StatSceneProps> = (props) => {
  const {
    chapterNumber, chapterTitle,
    label, value, unit, context, changeText, changeDir = 'flat',
    layout, bgVariant, barPct = 0, pillText,
    imageSrc, durationInFrames = 2250,
    series, bins, annotations, multiYearBars, bands, rows, buyer, seller,
    gaugeValue, gaugeMin, gaugeMax, verdict = 'balanced', verdictText,
    donutPct, donutLabel,
  } = props

  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 120 } })
  const valueScale = interpolate(intro, [0, 1], [0.85, 1])
  const valueOp = interpolate(intro, [0, 1], [0, 1])
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: 'clamp' })
  const ctxOp = interpolate(frame, [16, 28], [0, 1], { extrapolateRight: 'clamp' })
  const lineW = interpolate(frame, [2, 28], [0, 480], { extrapolateRight: 'clamp' })
  const barFill = interpolate(frame, [12, 38], [0, Math.max(0, Math.min(1, barPct))], { extrapolateRight: 'clamp' })

  const cream = bgVariant === 'cream'
  const fg = cream ? NAVY : WHITE
  const fgSoft = cream ? 'rgba(16,39,66,0.78)' : WHITE_SOFT

  const arrow = changeDir === 'up' ? '↑' : changeDir === 'down' ? '↓' : '→'
  const changeColor = changeDir === 'up' ? '#7BD389' : changeDir === 'down' ? '#FF8B7E' : GOLD

  // ── Layout renderers ──────────────────────────────────────────────────────

  const renderHero = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ width: lineW, height: 3, background: GOLD }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, transform: `scale(${valueScale})`, opacity: valueOp }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 320, lineHeight: 0.88, letterSpacing: -6,
          textShadow: imageSrc ? '0 4px 32px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 80, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      {changeText ? (
        <div style={{
          marginTop: 10, padding: '12px 28px', borderRadius: 999,
          background: 'rgba(16,39,66,0.08)',
          border: `2px solid ${changeColor}`, color: changeColor,
          fontFamily: FONT_BODY, fontSize: 36, fontWeight: 700, opacity: ctxOp,
        }}>
          {arrow} {changeText}
        </div>
      ) : null}
      {context ? (
        <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 34, marginTop: 16, textAlign: 'center', maxWidth: 1400, opacity: ctxOp }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderBar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: 1400 }}>
      <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, opacity: valueOp }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 280, lineHeight: 0.88, letterSpacing: -6,
          textShadow: imageSrc ? '0 4px 32px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 72, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      <div style={{
        width: '100%', height: 28,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.18)',
      }}>
        <div style={{ width: `${barFill * 100}%`, height: '100%', background: GOLD, borderRadius: 14 }} />
      </div>
      {context ? (
        <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 32, textAlign: 'center', maxWidth: 1400, opacity: ctxOp }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderCompare = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ width: lineW, height: 3, background: GOLD }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, opacity: valueOp }}>
        <span style={{
          color: fg, fontFamily: FONT_HEAD, fontSize: 300, lineHeight: 0.88, letterSpacing: -5,
          textShadow: imageSrc ? '0 4px 32px rgba(0,0,0,0.65)' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        {unit ? <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 72, fontWeight: 700 }}>{unit}</span> : null}
      </div>
      {changeText ? (
        <div style={{ color: changeColor, fontFamily: FONT_BODY, fontSize: 44, fontWeight: 700, opacity: ctxOp }}>
          {arrow} {changeText}
        </div>
      ) : null}
      {context ? (
        <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 34, marginTop: 8, textAlign: 'center', maxWidth: 1400, opacity: ctxOp }}>
          {context}
        </div>
      ) : null}
    </div>
  )

  const renderLineChart = () => {
    const pts = series || []
    if (!pts.length) return null
    const W = 1620
    const H = 680
    const PAD_L = 140
    const PAD_R = 80
    const PAD_T = 80
    const PAD_B = 140
    const innerW = W - PAD_L - PAD_R
    const innerH = H - PAD_T - PAD_B
    const values = pts.map(p => p.value)
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    const floor = Math.max(0, minV - (maxV - minV) * 0.4)
    const ceil = maxV + (maxV - minV) * 0.18
    const range = Math.max(1, ceil - floor)
    const xFor = (i: number) => PAD_L + (i / Math.max(1, pts.length - 1)) * innerW
    const yFor = (v: number) => PAD_T + innerH - ((v - floor) / range) * innerH
    const round25 = (v: number) => Math.round(v / 25000) * 25000
    const yTicks = [round25(floor), round25(floor + range * 0.5), round25(ceil)]
    const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`
    const axesOp = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ width: lineW, height: 3, background: GOLD }} />
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          <g opacity={axesOp}>
            <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke={GOLD} strokeWidth={2} opacity={0.55} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + innerH} stroke={GOLD} strokeWidth={2} opacity={0.55} />
            {yTicks.map((tv, i) => (
              <g key={`yt-${i}`}>
                <text x={PAD_L - 14} y={yFor(tv) + 8} fill={CREAM} fontFamily={FONT_BODY} fontSize={26} fontWeight={600} textAnchor="end" style={{ fontVariantNumeric: 'tabular-nums', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
                  {fmt(tv)}
                </text>
                <line x1={PAD_L} y1={yFor(tv)} x2={PAD_L + innerW} y2={yFor(tv)} stroke={GOLD} strokeWidth={1} strokeDasharray="3 6" opacity={0.16} />
              </g>
            ))}
          </g>
          {pts.slice(1).map((p, idx) => {
            const i = idx + 1
            const segStartFrame = 6 + i * 6
            const segProg = interpolate(frame, [segStartFrame, segStartFrame + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const x1 = xFor(i - 1); const y1 = yFor(pts[i - 1].value)
            const x2 = xFor(i); const y2 = yFor(p.value)
            const drawX = x1 + (x2 - x1) * segProg; const drawY = y1 + (y2 - y1) * segProg
            const segColor = p.color || GOLD
            return (
              <g key={`seg-${i}`}>
                <line x1={x1} y1={y1} x2={drawX} y2={drawY} stroke={segColor} strokeWidth={6} strokeLinecap="round" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.65))' }} />
              </g>
            )
          })}
          {pts.map((p, i) => {
            const pointFrame = 6 + i * 6 + (i === 0 ? 0 : 12)
            const dotOp = interpolate(frame, [pointFrame, pointFrame + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const isLast = i === pts.length - 1
            const r = isLast ? 16 : 11
            const color = p.color || GOLD
            const x = xFor(i); const y = yFor(p.value)
            return (
              <g key={`pt-${i}`} opacity={dotOp}>
                <circle cx={x} cy={y} r={r} fill={color} style={{ filter: isLast ? `drop-shadow(0 0 18px ${color}cc)` : 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }} />
                {isLast ? <circle cx={x} cy={y} r={5} fill={WHITE} /> : null}
                <text x={x} y={y - r - 16} fill={WHITE} fontFamily={FONT_HEAD} fontSize={isLast ? 42 : 34} fontWeight={isLast ? 800 : 600} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))' }}>
                  {fmt(p.value)}
                </text>
                <text x={x} y={PAD_T + innerH + 44} fill={color} fontFamily={FONT_BODY} fontSize={isLast ? 30 : 26} fontWeight={isLast ? 800 : 700} textAnchor="middle" letterSpacing={2} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
                  {p.yearLabel || p.month}
                </text>
                {isLast ? (
                  <text x={x} y={PAD_T + innerH + 78} fill={GOLD} fontFamily={FONT_BODY} fontSize={20} fontWeight={800} textAnchor="middle" letterSpacing={4} opacity={ctxOp}>
                    CURRENT
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {context ? (
          <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 32, marginTop: 10, textAlign: 'center', maxWidth: 1400, opacity: ctxOp, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            {context}
          </div>
        ) : null}
      </div>
    )
  }

  const renderHistogram = () => {
    const binsData = bins || []
    if (!binsData.length) return null
    const W = 1620
    const H = 580
    const PAD_L = 60; const PAD_R = 40; const PAD_T = 50; const PAD_B = 120
    const innerW = W - PAD_L - PAD_R; const innerH = H - PAD_T - PAD_B
    const maxPct = Math.max(...binsData.map(b => b.pct))
    const barW = innerW / binsData.length - 16

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>{label}</div>
        <div style={{ color: WHITE, fontFamily: FONT_HEAD, fontSize: 160, lineHeight: 0.92, letterSpacing: -3, opacity: valueOp, transform: `scale(${valueScale})`, textShadow: '0 4px 24px rgba(0,0,0,0.7)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <svg width={W} height={H}>
          <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke={GOLD} strokeWidth={2} opacity={0.55} />
          {binsData.map((b, i) => {
            const barProg = spring({ frame: Math.max(0, frame - 6 - i * 4), fps, config: { damping: 14, stiffness: 130 } })
            const h = (b.pct / maxPct) * innerH * barProg
            const x = PAD_L + i * (innerW / binsData.length) + 8
            const y = PAD_T + innerH - h
            const fill = i <= 3 ? GOLD : GOLD_SOFT
            return (
              <g key={`bin-${i}`}>
                <rect x={x} y={y} width={barW} height={h} fill={fill} rx={5} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
                <text x={x + barW / 2} y={PAD_T + innerH + 34} fill={WHITE_DIM} fontFamily={FONT_BODY} fontSize={24} textAnchor="middle" fontWeight={600}>{b.label}</text>
                <text x={x + barW / 2} y={PAD_T + innerH + 68} fill={CREAM} fontFamily={FONT_BODY} fontSize={22} textAnchor="middle" fontWeight={700} opacity={barProg} style={{ fontVariantNumeric: 'tabular-nums' }}>{b.pct.toFixed(0)}%</text>
              </g>
            )
          })}
        </svg>
        {annotations?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: ctxOp }}>
            {annotations.map((a, i) => (
              <div key={`ann-${i}`} style={{ color: i === 0 ? GOLD : CREAM, fontFamily: FONT_BODY, fontSize: 32, fontWeight: 700, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{a}</div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const renderGauge = () => {
    const min = gaugeMin ?? 0
    const max = gaugeMax ?? 10
    const v = gaugeValue ?? 0
    const vText = verdictText ?? (verdict === 'sellers' ? "SELLER'S MARKET" : verdict === 'buyers' ? "BUYER'S MARKET" : 'BALANCED MARKET')
    const W = 900; const H = 520
    const cx = W / 2; const cy = H - 60; const r = 360
    const sp = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 16, stiffness: 100 } })
    const target = (v - min) / (max - min)
    const needleProg = interpolate(sp, [0, 1], [0, target])
    const arcAngle = (pct: number) => Math.PI * (1 - pct)
    const arcPoint = (pct: number) => ({ x: cx + r * Math.cos(arcAngle(pct)), y: cy - r * Math.sin(arcAngle(pct)) })
    const buildArc = (p1: number, p2: number) => {
      const a = arcPoint(p1); const b = arcPoint(p2)
      const large = p2 - p1 > 0.5 ? 1 : 0
      return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`
    }
    const needlePoint = arcPoint(needleProg)
    const verdictColor = verdict === 'sellers' ? '#FF8B7E' : verdict === 'buyers' ? '#7BD389' : GOLD

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>{label}</div>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          <path d={buildArc(0, 0.4)} stroke="#FF8B7E" strokeWidth={32} fill="none" strokeLinecap="butt" opacity={labelOp * 0.85} />
          <path d={buildArc(0.4, 0.6)} stroke="#F2D78A" strokeWidth={32} fill="none" strokeLinecap="butt" opacity={labelOp * 0.85} />
          <path d={buildArc(0.6, 1.0)} stroke="#7BD389" strokeWidth={32} fill="none" strokeLinecap="butt" opacity={labelOp * 0.85} />
          {[0, 4, 6, 10].map((tv) => {
            const p = (tv - min) / (max - min)
            const ti = arcPoint(p)
            const to = { x: cx + (r + 44) * Math.cos(arcAngle(p)), y: cy - (r + 44) * Math.sin(arcAngle(p)) }
            return (
              <text key={`gt-${tv}`} x={to.x} y={to.y + 8} fill={CREAM} fontFamily={FONT_BODY} fontSize={28} textAnchor="middle" fontWeight={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{tv}</text>
            )
          })}
          <line x1={cx} y1={cy} x2={needlePoint.x} y2={needlePoint.y} stroke={WHITE} strokeWidth={7} strokeLinecap="round" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }} />
          <circle cx={cx} cy={cy} r={18} fill={GOLD} style={{ filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.85))' }} />
          <text x={cx} y={cy - 100} fill={WHITE} fontFamily={FONT_HEAD} fontSize={160} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(2)}</text>
          <text x={cx} y={cy - 36} fill={GOLD} fontFamily={FONT_BODY} fontSize={30} textAnchor="middle" fontWeight={700} letterSpacing={6}>MONTHS</text>
        </svg>
        <div style={{ marginTop: 8, padding: '16px 44px', borderRadius: 999, background: 'rgba(16,39,66,0.85)', border: `2px solid ${verdictColor}`, color: WHITE, fontFamily: FONT_BODY, fontSize: 34, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase', opacity: ctxOp }}>
          {vText}
        </div>
        {context ? (
          <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 30, marginTop: 8, textAlign: 'center', maxWidth: 1200, opacity: ctxOp }}>{context}</div>
        ) : null}
      </div>
    )
  }

  const renderPriceBand = () => {
    const bds = bands || []
    if (!bds.length) return null
    const W = 1620; const H = 100
    const totalPct = bds.reduce((s, b) => s + b.pct, 0) || 100
    let cumX = 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, width: '100%' }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>{label}</div>
        <svg width={W} height={H} style={{ borderRadius: 16, overflow: 'visible' }}>
          {bds.map((b, i) => {
            const segProg = spring({ frame: Math.max(0, frame - 6 - i * 5), fps, config: { damping: 14, stiffness: 130 } })
            const segW = (b.pct / totalPct) * W * segProg
            const x = cumX
            cumX += (b.pct / totalPct) * W
            const fill = b.color || (i % 2 === 0 ? GOLD : GOLD_SOFT)
            return (
              <g key={`pb-${i}`}>
                <rect x={x} y={20} width={segW} height={H - 40} fill={fill} stroke={WHITE} strokeWidth={1} rx={i === 0 ? 14 : 0} />
              </g>
            )
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 1500, marginTop: 8, opacity: ctxOp }}>
          {bds.map((b, i) => (
            <div key={`leg-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(16,39,66,0.55)', border: '1px solid rgba(212,175,55,0.30)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 24, height: 24, background: b.color || GOLD, borderRadius: 5 }} />
                <span style={{ color: WHITE, fontFamily: FONT_BODY, fontSize: 30, fontWeight: 700 }}>{b.label}</span>
              </div>
              <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{b.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderLeaderboard = () => {
    const rws = rows || []
    if (!rws.length) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 1540 }}>
          {rws.map((r, i) => {
            const sp = spring({ frame: Math.max(0, frame - 6 - i * 6), fps, config: { damping: 16, stiffness: 120 } })
            const op = sp
            const ty = interpolate(sp, [0, 1], [40, 0])
            const isPositive = r.yoy.startsWith('+')
            const yoyColor = isPositive ? '#7BD389' : '#FF8B7E'
            return (
              <div key={`row-${i}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '22px 36px',
                background: 'rgba(16,39,66,0.78)',
                border: r.highlight ? `3px solid ${GOLD}` : '1px solid rgba(212,175,55,0.30)',
                borderRadius: 18,
                opacity: op, transform: `translateY(${ty}px)`,
                boxShadow: r.highlight ? '0 0 28px rgba(212,175,55,0.45)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <span style={{ color: 'rgba(212,175,55,0.6)', fontFamily: FONT_BODY, fontSize: 28, fontWeight: 800 }}>#{i + 1}</span>
                  <span style={{ color: WHITE, fontFamily: FONT_HEAD, fontSize: 52, lineHeight: 1.0, letterSpacing: -0.5, maxWidth: 600, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{r.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
                  {r.dom ? <span style={{ color: WHITE_DIM, fontFamily: FONT_BODY, fontSize: 34, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.dom} days</span> : null}
                  <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 48, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.median}</span>
                  <span style={{ color: yoyColor, fontFamily: FONT_BODY, fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.yoy}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderTakeaway = () => {
    const buyerItems = buyer || []
    const sellerItems = seller || []

    const renderPanel = (header: string, items: string[], side: 'left' | 'right') => {
      const sp = spring({ frame: Math.max(0, frame - (side === 'left' ? 6 : 18)), fps, config: { damping: 16, stiffness: 110 } })
      const op = sp
      const tx = interpolate(sp, [0, 1], [side === 'left' ? -30 : 30, 0])
      return (
        <div style={{
          flex: 1, padding: '36px 44px', background: 'rgba(16,39,66,0.72)',
          border: '1px solid rgba(212,175,55,0.4)', borderRadius: 20,
          opacity: op, transform: `translateX(${tx}px)`,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 8, textTransform: 'uppercase', fontWeight: 800 }}>{header}</div>
          <div style={{ width: 100, height: 2, background: GOLD, opacity: 0.7 }} />
          {items.map((item, i) => (
            <div key={`${header}-${i}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 40, fontWeight: 800, lineHeight: 1.2 }}>•</span>
              <span style={{ color: WHITE, fontFamily: FONT_BODY, fontSize: 38, fontWeight: 600, lineHeight: 1.35, flex: 1, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{item}</span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: 1600 }}>
        <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700, textAlign: 'center' }}>{label}</div>
        <div style={{ display: 'flex', gap: 32 }}>
          {renderPanel('FOR BUYERS', buyerItems, 'left')}
          {renderPanel('FOR SELLERS', sellerItems, 'right')}
        </div>
      </div>
    )
  }

  const renderDonut = () => {
    const pct = donutPct ?? 0
    const lbl = donutLabel ?? label
    const W = 600; const H = 600
    const cx = W / 2; const cy = H / 2; const R = 230; const thickness = 80
    const sp = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 18, stiffness: 90 } })
    const drawn = pct * sp * 0.01
    const toXY = (deg: number) => ({
      x: cx + R * Math.cos((deg - 90) * Math.PI / 180),
      y: cy + R * Math.sin((deg - 90) * Math.PI / 180),
    })
    const startDeg = 0
    const endDeg = drawn * 360
    const large = endDeg > 180 ? 1 : 0
    const end = toXY(endDeg)
    const start = toXY(startDeg)

    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 80 }}>
        <svg width={W} height={H}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={thickness} />
          {endDeg > 0 ? (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`}
              fill="none"
              stroke={GOLD}
              strokeWidth={thickness}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.6))' }}
            />
          ) : null}
          <text x={cx} y={cy - 10} fill={WHITE} fontFamily={FONT_HEAD} fontSize={100} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</text>
          <text x={cx} y={cy + 36} fill={GOLD} fontFamily={FONT_BODY} fontSize={26} textAnchor="middle" fontWeight={700} letterSpacing={4}>{lbl}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700, opacity: ctxOp }}>
          <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 8, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
          {context ? (
            <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 34, lineHeight: 1.45 }}>{context}</div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <AbsoluteFill>
      {imageSrc ? (
        <LandscapeImageLayer src={imageSrc} durationInFrames={durationInFrames} direction="right" />
      ) : (
        <LandscapeBackground variant={bgVariant} />
      )}

      {/* Chapter header — fades after ~2s */}
      <ChapterHeader chapterNumber={chapterNumber} chapterTitle={chapterTitle} />

      {/* Content area — centered, max-width 1700, paddingBottom reserves caption zone */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '90px 160px 160px' }}>
        {layout === 'hero' && renderHero()}
        {layout === 'bar' && renderBar()}
        {layout === 'compare' && renderCompare()}
        {layout === 'callout' && renderHero()}
        {layout === 'line_chart' && renderLineChart()}
        {layout === 'histogram' && renderHistogram()}
        {layout === 'gauge' && renderGauge()}
        {layout === 'price_band' && renderPriceBand()}
        {layout === 'leaderboard' && renderLeaderboard()}
        {layout === 'takeaway' && renderTakeaway()}
        {layout === 'donut' && renderDonut()}
        {layout === 'multi_year_bars' && (() => {
          const brs = multiYearBars || []
          if (!brs.length) return null
          const W = 1540; const H = 660
          const PAD_L = 60; const PAD_R = 60; const PAD_T = 110; const PAD_B = 100
          const innerW = W - PAD_L - PAD_R; const innerH = H - PAD_T - PAD_B
          const maxV = Math.max(...brs.map(b => b.value))
          const minV = Math.min(...brs.map(b => b.value))
          const floor = minV * 0.7
          const range = Math.max(1, maxV - floor)
          const slot = innerW / brs.length
          const barW = slot * 0.6; const barGap = slot * 0.4
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', opacity: labelOp, fontWeight: 700 }}>{label}</div>
              <div style={{ width: lineW, height: 3, background: GOLD }} />
              <svg width={W} height={H} style={{ overflow: 'visible' }}>
                <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke={GOLD} strokeWidth={2} opacity={0.55} />
                {brs.map((b, i) => {
                  const sp = spring({ frame: Math.max(0, frame - 6 - i * 6), fps, config: { damping: 14, stiffness: 130 } })
                  const fullH = ((b.value - floor) / range) * innerH
                  const h = fullH * sp
                  const x = PAD_L + i * slot + barGap / 2
                  const y = PAD_T + innerH - h
                  const isCurrent = !!b.current
                  const fill = isCurrent ? GOLD : GOLD_SOFT
                  const valueOpacity = interpolate(sp, [0, 1], [0, 1])
                  return (
                    <g key={`mybar-${i}`}>
                      <rect x={x} y={y} width={barW} height={h} fill={fill} stroke={isCurrent ? WHITE : 'transparent'} strokeWidth={isCurrent ? 2 : 0} rx={7} style={{ filter: isCurrent ? 'drop-shadow(0 0 18px rgba(212,175,55,0.6))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
                      <text x={x + barW / 2} y={y - 18} fill={isCurrent ? WHITE : CREAM} fontFamily={FONT_HEAD} fontSize={isCurrent ? 64 : 52} fontWeight={isCurrent ? 800 : 600} textAnchor="middle" opacity={valueOpacity} style={{ fontVariantNumeric: 'tabular-nums', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))' }}>{b.label}</text>
                      <text x={x + barW / 2} y={PAD_T + innerH + 40} fill={isCurrent ? GOLD : WHITE_DIM} fontFamily={FONT_BODY} fontSize={isCurrent ? 32 : 28} fontWeight={isCurrent ? 800 : 600} textAnchor="middle" letterSpacing={2} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>{b.year}</text>
                      {isCurrent ? (
                        <text x={x + barW / 2} y={PAD_T + innerH + 78} fill={GOLD} fontFamily={FONT_BODY} fontSize={20} fontWeight={800} textAnchor="middle" letterSpacing={4} opacity={ctxOp}>CURRENT</text>
                      ) : null}
                    </g>
                  )
                })}
              </svg>
              {context ? (
                <div style={{ color: fgSoft, fontFamily: FONT_BODY, fontSize: 32, marginTop: 6, textAlign: 'center', maxWidth: 1300, opacity: ctxOp, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{context}</div>
              ) : null}
            </div>
          )
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
