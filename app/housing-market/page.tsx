import type { Metadata } from 'next'
import Link from 'next/link'
import { getReportCities } from '@/app/actions/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Housing Market Hub',
  description: 'Central Oregon housing market hub with city and community market pages, trends, and report access.',
  alternates: { canonical: `${siteUrl}/housing-market` },
  openGraph: {
    title: 'Housing Market Hub | Ryan Realty',
    description: 'Central Oregon housing market hub with city and community market pages.',
    url: `${siteUrl}/housing-market`,
    type: 'website',
    images: [`${siteUrl}/api/og?type=default`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Housing Market Hub | Ryan Realty',
    description: 'Central Oregon housing market hub with city and community market pages.',
    images: [`${siteUrl}/api/og?type=default`],
  },
}

export default async function HousingMarketHubPage() {
  const { cities } = await getReportCities()
  const topCities = (cities ?? []).slice(0, 12)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Housing Market Hub',
    url: `${siteUrl}/housing-market`,
    description: 'Central Oregon housing market hub with city and community market pages, trends, and report access.',
    hasPart: topCities.map((city) => ({
      '@type': 'WebPage',
      name: `${city} Housing Market`,
      url: `${siteUrl}/housing-market/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}`,
    })),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Housing Market',
          item: `${siteUrl}/housing-market`,
        },
      ],
    },
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-semibold text-foreground">Housing Market Hub</h1>
      <p className="mt-3 text-muted-foreground">
        Track local pricing, inventory, and market pace across Central Oregon.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/housing-market/reports" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          View report index
        </Link>
        <Link href="/housing-market/explore" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          Open data explorer
        </Link>
        <Link href="/housing-market/central-oregon" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          Central Oregon hub
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground">Cities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topCities.map((city) => (
            <Card key={city}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{city}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={`/housing-market/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}`} className="text-sm font-medium text-primary hover:underline">
                  Open market page
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
