import { cn } from '@/lib/utils'

type Props = {
  values: number[]
  className?: string
}

export default function MiniSparkline({ values, className }: Props) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const width = 100
  const height = 32
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('block', className)} role="img" aria-label="Price trend">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
