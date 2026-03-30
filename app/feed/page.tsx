import type { Metadata } from 'next'
import { getFeedListings } from '../actions/feed'
import { getSession } from '../actions/auth'
import { getSavedListingKeys } from '../actions/saved-listings'
import { getLikedListingKeys } from '../actions/likes'
import FeedInfiniteList from '@/components/FeedInfiniteList'
import Breadcrumb from '@/components/Breadcrumb'
import ShareButton from '@/components/ShareButton'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')
const defaultOgImage = `${siteUrl}/api/og?type=default`

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Browse the latest Central Oregon homes for sale. Infinite scroll feed.',
  alternates: { canonical: `${siteUrl}/feed` },
  openGraph: {
    title: 'Feed | Ryan Realty',
    description: 'Browse the latest Central Oregon homes for sale.',
    url: `${siteUrl}/feed`,
    type: 'website',
    siteName: 'Ryan Realty',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Ryan Realty' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feed | Ryan Realty',
    description: 'Browse the latest Central Oregon homes for sale.',
    images: [defaultOgImage],
  },
}

export default async function FeedPage() {
  const [{ listings: initialListings, nextOffset: initialNextOffset }, session] = await Promise.all([
    getFeedListings({ offset: 0 }),
    getSession(),
  ])

  const [savedKeys, likedKeys] =
    session?.user
      ? await Promise.all([getSavedListingKeys(), getLikedListingKeys()])
      : [[], [] as string[]]

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Ryan Realty', href: siteUrl },
          { label: 'Feed' },
        ]}
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Latest listings</h1>
        <ShareButton
          url={`${siteUrl}/feed`}
          title="Latest listings in Central Oregon"
          text="Browse the newest listings across Bend, Redmond, Sisters, Sunriver and nearby areas."
          trackContext="feed_page"
          variant="compact"
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Scroll for more. Newest first.</p>
      <div className="mt-6">
        <FeedInfiniteList
          initialListings={initialListings}
          initialNextOffset={initialNextOffset}
          likedKeys={likedKeys}
          savedKeys={savedKeys}
          signedIn={!!session?.user}
          userEmail={session?.user?.email ?? null}
        />
      </div>
    </main>
  )
}
