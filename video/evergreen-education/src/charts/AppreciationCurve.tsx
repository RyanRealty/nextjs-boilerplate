import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CREAM, FONT_BODY, FONT_HEAD, GOLD, NAVY_DEEP, NAVY_RICH, WHITE } from '../brand'

/**
 * AppreciationCurve — line chart of property value over 20 years at 3% annual
 * appreciation. Marker dots at year 1, 5, 10, 20 with dollar callouts.
 */
type Props = {
  /** array of {year, value} pairs from compute-equity-table series */
  data: Array<{ year: number; value: number }>
  enterDelaySec?: number
}

const W = 960
const H = 600

export const AppreciationCurve: React.FC<Props> = ({ data, enterDelaySec = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - Math.round(enterDelaySec * fps))
  const reveal = interpolate(f, [0, fps * 1.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const PAD_X = 80
  const TOP = 90
  const HEIGHT = 360
  const BOTTOM = TOP + HEIGHT
  const minY = 500_000
  const maxY = data.length ? Math.max(...data.map((d) => d.value)) : 1_000_000
  const minX = 0
  const maxX = data.length ? data[data.length - 1].year : 20

  const xAt = (yr: number) => PAD_X + ((yr - minX) / (maxX - minX)) * (W - PAD_X * 2)
  const yAt = (v: number) => BOTTOM - ((v - minY) / (maxY - minY)) * HEIGHT

  // Build path up to reveal fraction
  const pointsAll = data.map((d) => ({ x: xAt(d.year), y: yAt(d.value) }))
  const visibleCount = Math.max(2, Math.round(pointsAll.length * reveal))
  const pts = pointsAll.slice(0, visibleCount)
  const pathD = pts.length ? `M ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}` : ''

  // Markers + callouts at 1, 5, 10, 20
  const markers = [1, 5, 10, 20].map((y) => data.find((d) => d.year === y)).filter(Boolean) as Array<{ year: number; value: number }>

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 960, maxHeight: 600 }}>
      {/* Headline */}
      <text x={W / 2} y={50} fill={WHITE} fontFamily={FONT_HEAD} fontSize={42} textAnchor="middle">
        Property value at 3%/yr
      </text>

      {/* Axes */}
      <line x1={PAD_X} y1={BOTTOM} x2={W - PAD_X} y2={BOTTOM} stroke={NAVY_RICH} strokeWidth={2} />
      <line x1={PAD_X} y1={TOP} x2={PAD_X} y2={BOTTOM} stroke={NAVY_RICH} strokeWidth={2} />

      {/* Curve */}
      <path d={pathD} fill="none" stroke={GOLD} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />

      {/* X-axis year labels */}
      {[1, 5, 10, 20].map((y) => (
        <text
          key={y}
          x={xAt(y)}
          y={BOTTOM + 32}
          fill={CREAM}
          fontFamily={FONT_BODY}
          fontSize={22}
          textAnchor="middle"
          opacity={0.75}
        >
          y{y}
        </text>
      ))}

      {/* Marker dots + callouts (revealed when curve passes them) */}
      {markers.map((m) => {
        const cx = xAt(m.year)
        const cy = yAt(m.value)
        const passed = pts.length && pts[pts.length - 1].x >= cx
        if (!passed) return null
        return (
          <g key={m.year}>
            <circle cx={cx} cy={cy} r={9} fill={GOLD} stroke={NAVY_DEEP} strokeWidth={3} />
            <text
              x={cx}
              y={cy - 22}
              fill={WHITE}
              fontFamily={FONT_HEAD}
              fontSize={26}
              textAnchor="middle"
            >
              ${(m.value / 1000).toFixed(0)}K
            </text>
          </g>
        )
      })}
    </svg>
  )
}
