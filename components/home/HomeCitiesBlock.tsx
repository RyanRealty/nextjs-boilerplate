import { getCitiesForIndex } from '@/app/actions/cities'
import { getSavedCitySlugs } from '@/app/actions/saved-cities'
import { getHomePopularCitiesOrdered } from '@/lib/cities'
import PopularCitiesSection from '@/components/home/PopularCitiesSection'
import type { AuthUser } from '@/app/actions/auth'
import { withTimeoutFallback } from '@/lib/with-timeout-fallback'

type Props = { session: { user: AuthUser } | null }

const HOME_CITIES_MS = 12_000

/** Async block: fetches cities + saved slugs so the home page can stream this section. */
export default async function HomeCitiesBlock({ session }: Props) {
  const [allCities, savedCitySlugs] = await Promise.all([
    withTimeoutFallback(getCitiesForIndex(), [], HOME_CITIES_MS, 'home-cities-index'),
    session?.user
      ? withTimeoutFallback(getSavedCitySlugs().catch(() => []), [], HOME_CITIES_MS, 'home-saved-city-slugs')
      : Promise.resolve([]),
  ])
  const popularCitiesBase = getHomePopularCitiesOrdered(allCities ?? [])
  const popularCities = popularCitiesBase.length > 0 ? popularCitiesBase : (allCities ?? []).slice(0, 8)
  return (
    <PopularCitiesSection
      cities={popularCities}
      savedSlugs={savedCitySlugs}
      signedIn={!!session?.user}
    />
  )
}
