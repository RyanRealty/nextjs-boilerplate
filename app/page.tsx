import type { Metadata } from 'next'
import path from 'path'
import fs from 'fs'
import { Suspense } from 'react'
import Link from 'next/link'
import { getBrokerageSettings } from './actions/brokerage'
import { getMarketSnapshot, getJustListed } from './actions/home'
import { getSession } from './actions/auth'
import { TESTIMONIALS } from '@/lib/testimonials'
import HomeHero from '../components/home/HomeHero'
import SocialProofSection from '../components/home/SocialProofSection'
import ActivityFeedSection from '../components/activity/ActivityFeedSection'
import MarketPulseSection from '../components/market-report/MarketPulseSection'
import EmailSignup from '../components/home/EmailSignup'
import HomeCommunitiesBlock from '../components/home/HomeCommunitiesBlock'
import HomeCitiesBlock from '../components/home/HomeCitiesBlock'
import ShareButton from '@/components/ShareButton'
import { getActivityFeedWithFallbackMulti } from './actions/activity-feed'
import { ACTIVITY_FEED_DEFAULT_CITIES } from './actions/activity-feed-shared'
import { getBrowseCities } from './actions/listings'
import { getSavedListingKeys } from './actions/saved-listings'
import { getLikedListingKeys } from './actions/likes'
import { getOpenHousesWithListings } from './actions/open-houses'
import type { BrokerageSettingsRow } from './actions/brokerage'
import { listingsBrowsePath } from '@/lib/slug'
import OpenHouseSection from '@/components/open-houses/OpenHouseSection'
import VideoToursRow from '@/components/videos/VideoToursRow'
import AdUnit from '@/components/AdUnit'
import HomeValuationCta from '@/components/HomeValuationCta'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')
const ogImage = `${siteUrl}/og-home.png`

/**
 * Resolve team photo URL for SocialProofSection.
 * To update: (1) Admin → Site/Brokerage: set team_image_url or hero_image_url (saved to DB). (2) Or replace public/images/team.png; the ?v= cache-buster uses file mtime at request time so a new deploy or revalidate picks it up. This page revalidates every 60s.
 */
function getTeamImageSrc(brokerage: BrokerageSettingsRow | null): string {
  const fromAdmin = brokerage?.team_image_url?.trim() || brokerage?.hero_image_url?.trim()
  if (fromAdmin) return fromAdmin
  try {
    const p = path.join(process.cwd(), 'public', 'images', 'team.png')
    const stat = fs.statSync(p)
    return `/images/team.png?v=${stat.mtimeMs}`
  } catch {
    return '/images/team.png'
  }
}

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Ryan Realty — Central Oregon Real Estate | Bend, Redmond, Sisters, Sunriver',
  description:
    'The most comprehensive Central Oregon real estate platform. Search homes in Bend, Redmond, Sisters, Sunriver and surrounding communities. Listings, market insights, and local expertise.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Ryan Realty — Central Oregon Real Estate | Bend, Redmond, Sisters, Sunriver',
    description:
      'The most comprehensive Central Oregon real estate platform. Search homes in Bend, Redmond, Sisters, Sunriver and surrounding communities.',
    url: siteUrl,
    siteName: 'Ryan Realty',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'Ryan Realty — Central Oregon Real Estate' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ryan Realty — Central Oregon Real Estate | Bend, Redmond, Sisters, Sunriver',
    description: 'The most comprehensive Central Oregon real estate platform.',
  },
}

type HomeProps = { searchParams?: Promise<{ city?: string }> }

export default async function Home(props: HomeProps) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url?.trim() || !anonKey?.trim()) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-foreground">
          <h1 className="text-xl font-semibold">Setup required</h1>
          <p className="mt-2 text-sm">
            Add <code className="rounded bg-warning/15 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-warning/15 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
            <code className="rounded bg-warning/15 px-1">.env.local</code> and restart the dev server.
          </p>
        </div>
      </main>
    )
  }

  let session: Awaited<ReturnType<typeof getSession>>
  let brokerage: Awaited<ReturnType<typeof getBrokerageSettings>>
  let marketSnapshot: Awaited<ReturnType<typeof getMarketSnapshot>>
  let activityFeed: Awaited<ReturnType<typeof getActivityFeedWithFallbackMulti>>
  let browseCities: Awaited<ReturnType<typeof getBrowseCities>>
  let weekendOpenHouses: Awaited<ReturnType<typeof getOpenHousesWithListings>>
  let justListed: Awaited<ReturnType<typeof getJustListed>>

  let activitySavedKeys: string[] = []
  let activityLikedKeys: string[] = []

  try {
    ;[session, brokerage, marketSnapshot, activityFeed, browseCities, weekendOpenHouses, justListed] = await Promise.all([
      getSession(),
      getBrokerageSettings(),
      getMarketSnapshot(),
      getActivityFeedWithFallbackMulti({ cities: [...ACTIVITY_FEED_DEFAULT_CITIES], limit: 12 }),
      getBrowseCities(),
      getOpenHousesWithListings(),
      getJustListed('Bend'),
    ])
    if (session?.user) {
      ;[activitySavedKeys, activityLikedKeys] = await Promise.all([
        getSavedListingKeys(),
        getLikedListingKeys(),
      ])
    }
  } catch (err) {
    console.error('[Home] Data fetch failed:', err)
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-foreground">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm">We couldn&apos;t load this page. Please try again in a moment.</p>
        </div>
      </main>
    )
  }

  const marketForHero = {
    count: marketSnapshot.count,
    medianPrice: marketSnapshot.medianPrice,
    avgDom: marketSnapshot.avgDom ?? null,
  }

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'RealEstateAgent',
                name: 'Ryan Realty',
                url: siteUrl,
                areaServed: [
                  { '@type': 'City', name: 'Bend', addressRegion: 'OR' },
                  { '@type': 'City', name: 'Redmond', addressRegion: 'OR' },
                  { '@type': 'City', name: 'Sisters', addressRegion: 'OR' },
                  { '@type': 'City', name: 'Sunriver', addressRegion: 'OR' },
                ],
              },
              {
                '@type': 'WebSite',
                name: 'Ryan Realty',
                url: siteUrl,
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${siteUrl}/homes-for-sale?keywords={search_term_string}`,
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }),
        }}
      />

      <HomeHero
        marketSnapshot={marketForHero}
        heroVideoUrl={brokerage?.hero_video_url?.trim() || '/videos/hero.mp4'}
        heroImageUrl={brokerage?.hero_image_url ?? null}
      />
      <div className="mx-auto mt-4 flex w-full max-w-7xl justify-end px-4 sm:px-6">
        <ShareButton
          url={siteUrl}
          title="Ryan Realty Central Oregon Real Estate"
          text="Search listings, market insights, and neighborhoods across Central Oregon."
          trackContext="home_page"
          variant="compact"
        />
      </div>

      <SocialProofSection testimonials={TESTIMONIALS} teamImageSrc={getTeamImageSrc(brokerage)} />

      <ActivityFeedSection
        initialItems={activityFeed}
        defaultCities={[...ACTIVITY_FEED_DEFAULT_CITIES]}
        allCities={browseCities.map((c) => ({ city: c.City, count: c.count }))}
        heading="Latest activity"
        viewAllHref={listingsBrowsePath()}
        viewAllLabel="View all listings"
        limit={12}
        signedIn={!!session?.user}
        savedKeys={activitySavedKeys}
        likedKeys={activityLikedKeys}
      />

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Discover by lifestyle</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/search/bend/waterfront" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Waterfront homes
            </Link>
            <Link href="/search/bend/on-golf-course" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Golf course homes
            </Link>
            <Link href="/search/bend/new-listings" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              New listings
            </Link>
            <Link href="/search/bend/luxury" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Luxury homes
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Browse by price range</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/search/bend/under-500k" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Under $500K
            </Link>
            <Link href="/search/bend/under-750k" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Under $750K
            </Link>
            <Link href="/search/bend/under-1m" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              Under $1M
            </Link>
            <Link href="/search/bend/luxury" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:bg-muted">
              $1M and up
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="min-h-[280px] bg-muted/30" aria-hidden />}>
        <MarketPulseSection />
      </Suspense>
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <OpenHouseSection
            title="Open houses this weekend"
            items={weekendOpenHouses.slice(0, 10)}
            viewAllHref="/open-houses"
          />
        </div>
      </section>
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <VideoToursRow
            title="Video tours in Bend"
            listings={justListed}
            signedIn={!!session?.user}
            savedKeys={activitySavedKeys}
            likedKeys={activityLikedKeys}
            userEmail={session?.user?.email ?? null}
          />
        </div>
      </section>

      <Suspense fallback={<div className="min-h-[320px] bg-muted/30" aria-hidden />}>
        <HomeCommunitiesBlock session={session} />
      </Suspense>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <AdUnit slot="3003001001" format="horizontal" />
        </div>
      </section>

      <Suspense fallback={<div className="min-h-[320px] bg-muted/30" aria-hidden />}>
        <HomeCitiesBlock session={session} />
      </Suspense>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-lg border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Find your perfect match</h2>
          <p className="mt-2 text-sm text-muted-foreground">Save a search and get alerts when matching homes hit the market.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/account/saved-searches" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Get notified
            </Link>
            <Link href={listingsBrowsePath()} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Browse listings
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-lg border border-border bg-muted p-6">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Your local team</h2>
          <p className="mt-2 text-sm text-muted-foreground">Meet brokers who live and work across Central Oregon neighborhoods.</p>
          <Link href="/team" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Meet the team
          </Link>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <HomeValuationCta />
        </div>
      </section>

      <EmailSignup />
    </main>
  )
}
