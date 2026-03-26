import type { Metadata } from 'next'
import ActivityFeedCard from '@/components/activity/ActivityFeedCard'
import { getActivityFeed } from '@/app/actions/activity-feed'
import AdUnit from '@/components/AdUnit'
import HomeValuationCta from '@/components/HomeValuationCta'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Live Market Activity',
  description: 'Track new listings, price drops, pending sales, and closed activity across Central Oregon.',
  alternates: { canonical: `${siteUrl}/activity` },
  openGraph: {
    title: 'Live Market Activity | Ryan Realty',
    description: 'Track listing activity signals across Central Oregon neighborhoods.',
    url: `${siteUrl}/activity`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Live Market Activity | Ryan Realty',
    description: 'Track listing activity signals across Central Oregon neighborhoods.',
  },
}

export default async function ActivityPage() {
  const items = await getActivityFeed({ limit: 24 })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Live Market Activity',
    url: `${siteUrl}/activity`,
    description: 'Recent listing activity events across Central Oregon.',
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-semibold text-foreground">Live market activity</h1>
      <p className="mt-2 text-muted-foreground">
        See what changed recently including new inventory, price moves, pending statuses, and sold updates.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ActivityFeedCard key={item.id} item={item} />
        ))}
      </div>
      <div className="mt-8">
        <AdUnit slot="1001003002" format="horizontal" />
      </div>
      <div className="mt-8">
        <HomeValuationCta />
      </div>
    </main>
  )
}
