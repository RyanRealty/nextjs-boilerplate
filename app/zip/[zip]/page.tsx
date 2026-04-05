import type { Metadata } from 'next'
import Link from 'next/link'
import ListingTile from '@/components/ListingTile'
import HomeValuationCta from '@/components/HomeValuationCta'
import { getListingsWithAdvanced } from '@/app/actions/listings'

type Params = { zip: string }

function normalizeZip(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 5)
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { zip: rawZip } = await params
  const zip = normalizeZip(rawZip)
  if (!zip) return {}
  const title = `Homes for Sale in ${zip}`
  const description = `Browse current homes for sale in ZIP code ${zip} with updated listings and property details.`
  return {
    title,
    description,
    alternates: { canonical: `/zip/${zip}` },
    openGraph: {
      title,
      description,
      url: `/zip/${zip}`,
      type: 'website',
      images: ['/api/og?type=default'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/api/og?type=default'],
    },
  }
}

export default async function ZipPage({ params }: { params: Promise<Params> }) {
  const { zip: rawZip } = await params
  const zip = normalizeZip(rawZip)
  if (!zip) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">ZIP code not found</h1>
      </main>
    )
  }

  const { listings } = await getListingsWithAdvanced({ postalCode: zip, limit: 48, offset: 0, sort: 'newest' })
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}` },
      { '@type': 'ListItem', position: 2, name: 'Search', item: `${baseUrl}/search` },
      { '@type': 'ListItem', position: 3, name: zip, item: `${baseUrl}/zip/${zip}` },
    ],
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-foreground">Search</Link>
        <span className="mx-2">/</span>
        <span>{zip}</span>
      </nav>
      <h1 className="text-3xl font-semibold text-foreground">Homes for Sale in {zip}</h1>
      <p className="mt-2 text-muted-foreground">
        {listings.length} active listings currently available in this ZIP code.
      </p>
      {listings.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No active listings were found for this ZIP code.</p>
      ) : (
        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, index) => {
            const listingKey = (listing.ListNumber ?? listing.ListingKey ?? `listing-${index}`).toString().trim()
            return <ListingTile key={listingKey} listing={listing} listingKey={listingKey} signedIn={false} />
          })}
        </section>
      )}
      <section className="mt-10">
        <HomeValuationCta />
      </section>
    </main>
  )
}
