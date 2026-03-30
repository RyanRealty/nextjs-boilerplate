'use client'

import Link from 'next/link'
import type { CommunityForIndex } from '@/lib/communities'
import type { HotCommunity } from '@/app/actions/listings'
import { subdivisionEntityKey } from '@/lib/slug'
import CommunityTile from '@/components/CommunityTile'
import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import { TILE_MIN_HEIGHT_PX } from '@/lib/tile-constants'

function toHotCommunity(c: CommunityForIndex): HotCommunity {
  return {
    subdivisionName: c.subdivision,
    forSale: c.activeCount,
    pending: 0,
    newLast7Days: 0,
    medianListPrice: c.medianPrice,
  }
}

export type CommunitiesSliderProps = {
  /** Section title (e.g. "Popular communities") */
  title: string
  /** Communities to show. On city page: that city's communities. On community/neighborhood: parent city's communities. */
  communities: CommunityForIndex[]
  /** Link for "View all" (e.g. /cities/[slug] or /communities) */
  viewAllHref: string
  viewAllLabel?: string
  /** When on a community page, exclude this community from the list */
  excludeSlug?: string | null
  signedIn?: boolean
  savedEntityKeys?: string[]
  likedEntityKeys?: string[]
}

/**
 * Reusable community slider: same look on city, community, neighborhood, and listing pages.
 * Pass the appropriate communities array for the context (e.g. parent city's communities on community/neighborhood pages).
 */
export default function CommunitiesSlider({
  title,
  communities,
  viewAllHref,
  viewAllLabel = 'View all communities',
  excludeSlug,
  signedIn = false,
  savedEntityKeys = [],
  likedEntityKeys = [],
}: CommunitiesSliderProps) {
  const resortFirst = [...communities]
    .filter((c) => c.slug !== excludeSlug)
    .sort((a, b) => (b.isResort ? 1 : 0) - (a.isResort ? 1 : 0))

  if (resortFirst.length === 0) return null

  const savedSet = new Set(savedEntityKeys)
  const likedSet = new Set(likedEntityKeys)

  return (
    <TilesSlider
      title={title}
      titleId="popular-communities-heading"
      headerRight={
        <Link href={viewAllHref} className="text-sm font-semibold text-accent-foreground hover:text-accent-foreground">
          {viewAllLabel}
        </Link>
      }
      className="bg-muted px-4 py-10 sm:px-6 sm:py-12"
    >
      {resortFirst.map((c) => {
        const entityKey = subdivisionEntityKey(c.city, c.subdivision)
        return (
          <TilesSliderItem key={c.slug} style={{ minHeight: TILE_MIN_HEIGHT_PX }}>
            <CommunityTile
              city={c.city}
              community={toHotCommunity(c)}
              bannerUrl={c.heroImageUrl}
              signedIn={signedIn}
              saved={savedSet.has(entityKey)}
              liked={likedSet.has(entityKey)}
            />
          </TilesSliderItem>
        )
      })}
    </TilesSlider>
  )
}
