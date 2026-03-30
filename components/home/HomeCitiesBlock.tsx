import { getCitiesForIndex } from '@/app/actions/cities'
import { getSavedCitySlugs } from '@/app/actions/saved-cities'
import { getBrowseCities } from '@/app/actions/listings'
import { getHomePopularCitiesOrdered, HOME_POPULAR_CITY_NAMES, type CityForIndex } from '@/lib/cities'
import PopularCitiesSection from '@/components/home/PopularCitiesSection'
import type { AuthUser } from '@/app/actions/auth'
import { slugify } from '@/lib/slug'

type Props = { session: { user: AuthUser } | null }

/** Async block: fetches cities + saved slugs so the home page can stream this section. */
export default async function HomeCitiesBlock({ session }: Props) {
  const [allCities, browseCities, savedCitySlugs] = await Promise.all([
    getCitiesForIndex(),
    getBrowseCities().catch(() => []),
    session?.user ? getSavedCitySlugs().catch(() => []) : Promise.resolve([]),
  ])
  const popularCitiesBase = getHomePopularCitiesOrdered(allCities ?? [])
  const allByLowerName = new Map((allCities ?? []).map((c) => [c.name.trim().toLowerCase(), c] as const))
  const browseByLowerName = new Map((browseCities ?? []).map((c) => [c.City.trim().toLowerCase(), c] as const))
  const allMatchFor = (name: string): CityForIndex | null => {
    const key = name.toLowerCase()
    return (
      allByLowerName.get(key) ??
      (key === 'sunriver' ? allByLowerName.get('sun river') : null) ??
      (key === 'la pine' ? allByLowerName.get('lapine') : null) ??
      null
    )
  }
  const fallbackPopularCities: CityForIndex[] = HOME_POPULAR_CITY_NAMES.map((name) => {
    const key = name.toLowerCase()
    const existing = allMatchFor(name)
    if (existing) return existing
    const browseMatch =
      browseByLowerName.get(key) ??
      (key === 'sunriver' ? browseByLowerName.get('sun river') : null) ??
      (key === 'la pine' ? browseByLowerName.get('lapine') : null)
    return {
      slug: slugify(name),
      name,
      activeCount: Number(browseMatch?.count ?? 0),
      medianPrice: null,
      communityCount: 0,
      heroImageUrl: null,
      description: null,
    }
  }).filter((city) => city.activeCount > 0 || city.name === 'Bend')
  const popularCities = popularCitiesBase.length >= 6 ? popularCitiesBase : fallbackPopularCities
  return (
    <PopularCitiesSection
      cities={popularCities}
      savedSlugs={savedCitySlugs}
      signedIn={!!session?.user}
    />
  )
}
