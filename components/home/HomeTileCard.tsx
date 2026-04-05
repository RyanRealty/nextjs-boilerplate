'use client'

import ListingTile from '@/components/ListingTile'
import type { HomeTileRow } from '@/app/actions/listings'

type Props = {
  listing: HomeTileRow
  listingKey: string
  monthlyPayment: string | undefined
  saved: boolean | undefined
  liked?: boolean
  signedIn: boolean
  userEmail?: string | null
  /** When true, show "Hot" badge (e.g. Trending section). */
  hotBadge?: boolean
  /** When true, show price reduction badge. */
  hasRecentPriceChange?: boolean
  /** Amount reduced when known. */
  priceDropAmount?: number | null
  viewCount?: number
  likeCount?: number
  saveCount?: number
  shareCount?: number
}

/** Home page listing card. Uses the shared ListingTile so all listing tiles stay consistent site-wide. */
export default function HomeTileCard({
  listing,
  listingKey,
  monthlyPayment,
  saved,
  liked,
  signedIn,
  userEmail,
  hotBadge,
  hasRecentPriceChange,
  priceDropAmount,
  viewCount,
  likeCount,
  saveCount,
  shareCount,
}: Props) {
  return (
    <ListingTile
      listing={listing}
      listingKey={listingKey}
      monthlyPayment={monthlyPayment}
      saved={signedIn ? saved : undefined}
      liked={signedIn ? liked : undefined}
      signedIn={signedIn}
      userEmail={userEmail}
      hotBadge={hotBadge}
      hasRecentPriceChange={hasRecentPriceChange}
      priceDropAmount={priceDropAmount}
      viewCount={viewCount}
      likeCount={likeCount}
      saveCount={saveCount}
      shareCount={shareCount}
    />
  )
}
