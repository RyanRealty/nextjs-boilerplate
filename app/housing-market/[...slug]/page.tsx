import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCachedStats, getLiveMarketPulse } from '@/app/actions/market-stats'
import { getGuidesByCity } from '@/app/actions/guides'
import CityClusterNav from '@/components/CityClusterNav'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')

function unslug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  if (!slug || slug.length === 0) return {}
  const title = `${unslug(slug[slug.length - 1] ?? '')} Housing Market`
  const canonicalPath = `/housing-market/${slug.map((part) => encodeURIComponent(part)).join('/')}`
  const ogPath = `/housing-market/og/${slug.map((part) => encodeURIComponent(part)).join('/')}`
  return {
    title,
    description: `Market overview and recent trends for ${title}.`,
    alternates: { canonical: `${siteUrl}${canonicalPath}` },
    openGraph: {
      title: `${title} | Ryan Realty`,
      description: `Market overview and recent trends for ${title}.`,
      url: `${siteUrl}${canonicalPath}`,
      type: 'website',
      images: [ogPath],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ryan Realty`,
      description: `Market overview and recent trends for ${title}.`,
      images: [ogPath],
    },
  }
}

export default async function HousingMarketGeoPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (!slug || slug.length === 0) notFound()
  const cityName = unslug(slug[0] ?? '')
  const communityName = slug[1] ? unslug(slug[1]) : null
  const level = communityName ? 'subdivision' : 'city'
  const geoSlug = communityName ? (slug[1] ?? '') : (slug[0] ?? '')
  const geoName = communityName ?? cityName
  const [stats, pulse, cityGuides] = await Promise.all([
    getCachedStats({ geoType: level, geoSlug, periodType: 'monthly' }),
    getLiveMarketPulse({ geoType: level, geoSlug }),
    getGuidesByCity(cityName),
  ])
  const cityGuideSlug = cityGuides.length > 0 ? cityGuides[0]!.slug : null
  const citySlug = slug[0] ?? ''
  const canonicalUrl = `${siteUrl}/housing-market/${slug.map((part) => encodeURIComponent(part)).join('/')}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${geoName} Housing Market`,
    url: canonicalUrl,
    description: `Market overview and recent trends for ${geoName}.`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Housing Market',
          item: `${siteUrl}/housing-market`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: geoName,
          item: canonicalUrl,
        },
      ],
    },
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/housing-market" className="hover:text-foreground">Housing market</Link>
        <span className="mx-2">/</span>
        <span>{geoName}</span>
      </nav>
      <h1 className="text-3xl font-semibold text-foreground">{geoName} Housing Market</h1>
      <p className="mt-3 text-muted-foreground">
        Local market snapshot for pricing, inventory, and pace. Use the links below for deeper report views.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Median sale price</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {stats?.median_sale_price ? `$${Math.round(Number(stats.median_sale_price)).toLocaleString()}` : 'Not available'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Market health</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {stats?.market_health_label ?? 'Not available'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Median days on market</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {stats?.median_dom != null ? Math.round(Number(stats.median_dom)) : 'Not available'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Active inventory</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pulse?.active_count != null ? Math.round(Number(pulse.active_count)).toLocaleString() : 'Not available'}
          </p>
        </div>
      </div>
      <div className="mt-8">
        <CityClusterNav
          cityName={cityName}
          citySlug={citySlug}
          activePage="housing-market"
          guideSlug={cityGuideSlug}
        />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/housing-market/reports/${communityName ? 'community' : 'city'}/${encodeURIComponent(geoName)}`} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          View report page
        </Link>
        <Link href="/housing-market/explore" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          Open explorer
        </Link>
      </div>
    </main>
  )
}
