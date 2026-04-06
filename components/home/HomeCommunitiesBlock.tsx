import { getCommunitiesForIndex } from '@/app/actions/communities'
import { getSavedCommunityKeys } from '@/app/actions/saved-communities'
import { sortResortCommunitiesInPrimaryCities } from '@/lib/communities'
import { getPrimaryCityRank } from '@/lib/cities'
import ResortCommunitiesSlider from '@/components/area-guides/ResortCommunitiesSlider'
import type { AuthUser } from '@/app/actions/auth'
import { withTimeoutFallback } from '@/lib/with-timeout-fallback'

type Props = { session: { user: AuthUser } | null }

const HOME_COMMUNITIES_MS = 12_000

/** Async block: fetches communities + saved keys so the home page can stream this section. */
export default async function HomeCommunitiesBlock({ session }: Props) {
  const [allCommunities, savedCommunityKeys] = await Promise.all([
    withTimeoutFallback(getCommunitiesForIndex(), [], HOME_COMMUNITIES_MS, 'home-communities-index'),
    session?.user
      ? withTimeoutFallback(getSavedCommunityKeys().catch(() => []), [], HOME_COMMUNITIES_MS, 'home-saved-community-keys')
      : Promise.resolve([]),
  ])
  const resortCommunities = sortResortCommunitiesInPrimaryCities(
    allCommunities ?? [],
    getPrimaryCityRank
  )
  return (
    <ResortCommunitiesSlider
      communities={resortCommunities}
      savedCommunityKeys={savedCommunityKeys}
      signedIn={!!session?.user}
    />
  )
}
