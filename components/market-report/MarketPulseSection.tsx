import { getMarketReportData } from '@/app/actions/market-report'
import MarketPulseCarousel from '@/components/market-report/MarketPulseCarousel'

type Props = {
  className?: string
}

export default async function MarketPulseSection({ className }: Props = {}) {
  const end = new Date()
  const start = new Date(end.getFullYear(), 0, 1)
  const periodStart = start.toISOString().slice(0, 10)
  const periodEnd = end.toISOString().slice(0, 10)
  const data = await getMarketReportData({ periodStart, periodEnd })
  return <MarketPulseCarousel data={data} className={className} />
}
