'use client'

import GeoMarketOverview from '@/components/geo-page/GeoMarketOverview'
import { reportsExploreYtdPath } from '@/lib/slug'

type Props = {
  communityName: string
  city: string
  subdivision: string
  slug: string
  stats: { medianPrice: number | null; count: number; avgDom: number | null; closedLast12Months: number }
  priceHistory: { month: string; medianPrice: number }[]
}

export default function CommunityMarketStats({ communityName, city, subdivision, stats, priceHistory }: Props) {
  return (
    <GeoMarketOverview
      placeName={communityName}
      headingId="market-stats-heading"
      stats={stats}
      priceHistory={priceHistory}
      fullReportHref={`/reports/community/${encodeURIComponent(communityName)}`}
      ytdReportHref={reportsExploreYtdPath(city, subdivision)}
      trackContext="community_market_stats"
    />
  )
}
