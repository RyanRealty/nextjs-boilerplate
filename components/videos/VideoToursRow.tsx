'use client'

import Link from 'next/link'
import type { ListingTileRow } from '@/app/actions/listings'
import type { EngagementCounts } from '@/app/actions/engagement'
import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import ListingTile from '@/components/ListingTile'

type Props = {
  title: string
  listings: (ListingTileRow & { details?: unknown; OpenHouses?: unknown })[]
  signedIn: boolean
  savedKeys?: string[]
  likedKeys?: string[]
  userEmail?: string | null
  engagementMap?: Record<string, EngagementCounts>
  viewAllHref?: string
}

function hasVideo(listing: ListingTileRow & { details?: unknown }): boolean {
  const details = listing.details as { Videos?: Array<{ Uri?: string | null }> } | null | undefined
  return Array.isArray(details?.Videos) && details.Videos.some((video) => String(video?.Uri ?? '').trim().length > 0)
}

export default function VideoToursRow({
  title,
  listings,
  signedIn,
  savedKeys = [],
  likedKeys = [],
  userEmail,
  engagementMap,
  viewAllHref,
}: Props) {
  const withVideo = listings.filter(hasVideo).slice(0, 12)
  if (withVideo.length === 0) return null

  return (
    <TilesSlider
      title={title}
      headerRight={
        viewAllHref ? (
          <Link href={viewAllHref} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            View all videos →
          </Link>
        ) : null
      }
    >
      {withVideo.map((listing) => {
        const listingKey = (listing.ListingKey ?? listing.ListNumber ?? '').toString().trim()
        if (!listingKey) return null
        const engagement = engagementMap?.[listingKey]
        return (
          <TilesSliderItem key={listingKey}>
            <ListingTile
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              listing={listing as any}
              listingKey={listingKey}
              signedIn={signedIn}
              saved={savedKeys.includes(listingKey)}
              liked={likedKeys.includes(listingKey)}
              userEmail={userEmail}
              viewCount={engagement?.view_count ?? 0}
              likeCount={engagement?.like_count ?? 0}
              saveCount={engagement?.save_count ?? 0}
              shareCount={engagement?.share_count ?? 0}
            />
          </TilesSliderItem>
        )
      })}
    </TilesSlider>
  )
}
