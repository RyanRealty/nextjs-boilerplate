'use client'

import type { ActivityFeedItem } from '@/app/actions/activity-feed-shared'
import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import { TILE_MIN_HEIGHT_PX } from '@/lib/tile-constants'
import ActivityFeedCard from './ActivityFeedCard'

type Props = {
  title: string
  items: ActivityFeedItem[]
  signedIn?: boolean
  savedKeys?: string[]
  likedKeys?: string[]
}

/** Latest activity section: single-row slider, all items intermingled, sorted by newest first, each card badged by event type. */
export default function GeoSectionLatestActivity({ title, items, signedIn = false, savedKeys = [], likedKeys = [] }: Props) {
  if (items.length === 0) return null

  const sorted = [...items].sort(
    (a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()
  )

  return (
    <TilesSlider
      title={title}
      titleId="latest-activity-heading"
      className="bg-muted px-4 py-10 sm:px-6 sm:py-12"
    >
      {sorted.map((item) => (
        <TilesSliderItem key={item.id} style={{ minHeight: TILE_MIN_HEIGHT_PX }}>
          <ActivityFeedCard
            item={item}
            signedIn={signedIn}
            saved={savedKeys.includes(item.listing_key)}
            liked={likedKeys.includes(item.listing_key)}
          />
        </TilesSliderItem>
      ))}
    </TilesSlider>
  )
}
