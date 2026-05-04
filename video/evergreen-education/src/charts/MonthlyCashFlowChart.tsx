import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CREAM, FONT_BODY, FONT_HEAD, GOLD, NAVY_RICH, WHITE } from '../brand'

/**
 * MonthlyCashFlowChart — 12 monthly bars showing the realistic year-1 cash flow
 * pattern (one negative month for vacancy, eleven slightly positive). Average
 * line overlay at $200/mo.
 *
 * Used in chapter 3 (Pillar 1: Cash flow).
 */
type Props = {
  /** seconds; default 0 */
  enterDelaySec?: number
}

const MONTHS = [
  { label: 'J', value: 200 },
  { label: 'F', value: 220 },
  { label: 'M', value: 180 },
  { label: 'A', value: 240 },
  { label: 'M', value: 200 },
  { label: 'J', value: 220 },
  { label: 'J', value: -1900 }, // vacancy month
  { label: 'A', value: 200 },
  { label: 'S', value: 240 },
  { label: 'O', value: 220 },
  { label: 'N', value: 180 },
  { label: 'D', value: 200 },
]
const AVG = MONTHS.reduce((s, m) => s + m.value, 0) / 12

// Fixed chart canvas — independent of comp viewport. Parent constrains size.
const W = 960
const H = 600

export const MonthlyCashFlowChart: React.FC<Props> = ({ enterDelaySec = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - Math.round(enterDelaySec * fps))

  const reveal = interpolate(f, [0, fps * 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const PAD_X = 60
  const TOP = 90
  const HEIGHT = 360
  const BOTTOM = TOP + HEIGHT
  const MID = TOP + HEIGHT * 0.78
  const GAP = 8
  const BAR_W = (W - PAD_X * 2 - GAP * 11) / 12
  const MAX_POS = 300
  const MAX_NEG = 2000
  const SCALE_POS = (HEIGHT * 0.78) / MAX_POS
  const SCALE_NEG = (HEIGHT * 0.22) / MAX_NEG

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 960, maxHeight: 600 }}>
      {/* Headline */}
      <text x={W / 2} y={50} fill={WHITE} fontFamily={FONT_HEAD} fontSize={42} textAnchor="middle">
        12-month cash flow
      </text>

      {/* Baseline (zero) */}
      <line x1={PAD_X} x2={W - PAD_X} y1={MID} y2={MID} stroke={NAVY_RICH} strokeWidth={2} />

      {/* Avg line */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={MID - AVG * SCALE_POS}
        y2={MID - AVG * SCALE_POS}
        stroke={GOLD}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.85 * reveal}
      />
      <text
        x={W - PAD_X - 14}
        y={MID - AVG * SCALE_POS - 10}
        fill={GOLD}
        fontFamily={FONT_BODY}
        fontSize={22}
        textAnchor="end"
        opacity={reveal}
      >
        avg ${Math.round(AVG)}/mo
      </text>

      {/* Bars */}
      {MONTHS.map((m, i) => {
        const x = PAD_X + i * (BAR_W + GAP)
        const isNeg = m.value < 0
        const h = isNeg ? Math.abs(m.value) * SCALE_NEG : m.value * SCALE_POS
        const y = isNeg ? MID : MID - h
        const animH = h * reveal
        const animY = isNeg ? MID : MID - animH
        return (
          <g key={i}>
            <rect
              x={x}
              y={animY}
              width={BAR_W}
              height={animH}
              fill={isNeg ? '#c44' : GOLD}
              rx={4}
            />
            <text
              x={x + BAR_W / 2}
              y={BOTTOM + 30}
              fill={CREAM}
              fontFamily={FONT_BODY}
              fontSize={20}
              textAnchor="middle"
              opacity={0.7}
            >
              {m.label}
            </text>
          </g>
        )
      })}

      {/* Vacancy callout */}
      <text
        x={PAD_X + 6 * (BAR_W + GAP) + BAR_W / 2}
        y={MID + 280}
        fill="#e88"
        fontFamily={FONT_BODY}
        fontSize={22}
        textAnchor="middle"
        opacity={reveal}
      >
        ← vacancy
      </text>
    </svg>
  )
}
