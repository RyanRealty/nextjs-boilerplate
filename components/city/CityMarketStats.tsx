'use client'

import GeoMarketOverview from '@/components/geo-page/GeoMarketOverview'
import { reportsExploreYtdPath } from '@/lib/slug'

type Props = {
  cityName: string
  slug: string
  stats: { medianPrice: number | null; count: number; avgDom: number | null; closedLast12Months: number }
  priceHistory: { month: string; medianPrice: number }[]
}

export default function CityMarketStats({ cityName, slug, stats, priceHistory }: Props) {
  return (
    <GeoMarketOverview
      placeName={cityName}
      headingId="city-market-heading"
      stats={stats}
      priceHistory={priceHistory}
      fullReportHref={`/reports/city/${encodeURIComponent(cityName)}`}
      ytdReportHref={reportsExploreYtdPath(cityName)}
      trackContext="city_market_stats"
    />
  )
}
