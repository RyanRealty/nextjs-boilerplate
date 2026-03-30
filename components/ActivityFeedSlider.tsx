'use client'

import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import ActivityFeedCard from '@/components/activity/ActivityFeedCard'
import type { ActivityFeedItem } from '@/app/actions/activity-feed-shared'

type Props = {
  title?: string
  items: ActivityFeedItem[]
  signedIn?: boolean
  savedKeys?: string[]
  likedKeys?: string[]
}

export default function ActivityFeedSlider({
  title = 'What is happening nearby',
  items,
  signedIn = false,
  savedKeys = [],
  likedKeys = [],
}: Props) {
  if (items.length === 0) return null

  return (
    <TilesSlider title={title}>
      {items.map((item, idx) => (
        <TilesSliderItem key={item.id || `${item.listing_key}-${item.event_at}`}>
          <ActivityFeedCard
            item={item}
            priority={idx < 3}
            signedIn={signedIn}
            saved={savedKeys.includes(item.listing_key)}
            liked={likedKeys.includes(item.listing_key)}
          />
        </TilesSliderItem>
      ))}
    </TilesSlider>
  )
}
