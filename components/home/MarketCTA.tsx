'use client'

import Link from 'next/link'
import { trackCtaClick } from '@/lib/cta-tracking'

type MarketStats = {
  count: number
  medianPrice: number | null
  avgDom?: number | null
  closedLast12Months?: number
}

type Props = {
  stats: MarketStats
}

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function MarketCTA({ stats }: Props) {
  return (
    <section className="w-full bg-primary px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="market-cta-heading">
      <div className="w-full text-center">
        <h2 id="market-cta-heading" className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
          Central Oregon Market at a Glance
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <div className="rounded-lg bg-primary-foreground/10 p-4 text-primary-foreground">
            <p className="text-2xl font-bold sm:text-3xl">{formatPrice(stats.medianPrice)}</p>
            <p className="mt-1 text-sm text-primary-foreground/90">Median Price</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-4 text-primary-foreground">
            <p className="text-2xl font-bold sm:text-3xl">{stats.count.toLocaleString()}</p>
            <p className="mt-1 text-sm text-primary-foreground/90">Active Listings</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-4 text-primary-foreground">
            <p className="text-2xl font-bold sm:text-3xl">
              {stats.avgDom != null && stats.avgDom > 0 ? Math.round(stats.avgDom) : '—'}
            </p>
            <p className="mt-1 text-sm text-primary-foreground/90">Avg Days on Market</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-4 text-primary-foreground">
            <p className="text-2xl font-bold sm:text-3xl">
              {(stats.closedLast12Months ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-primary-foreground/90">Homes Sold (12 mo)</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/reports"
            onClick={() =>
              trackCtaClick({
                label: 'View Full Market Report',
                destination: '/reports',
                context: 'home_market_cta',
              })
            }
            className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 font-semibold text-accent-foreground hover:bg-accent/90"
          >
            View Full Market Report
          </Link>
          <Link
            href="/sell"
            onClick={() =>
              trackCtaClick({
                label: "What's Your Home Worth?",
                destination: '/sell',
                context: 'home_market_cta',
              })
            }
            className="inline-flex items-center justify-center rounded-lg border-2 border-primary-foreground/60 px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-foreground/10"
          >
            What&apos;s Your Home Worth?
          </Link>
        </div>
      </div>
    </section>
  )
}
