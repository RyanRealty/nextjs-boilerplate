'use client'

import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { trackEvent } from '@/lib/tracking'

export type GeoMarketStats = {
  medianPrice: number | null
  count: number
  avgDom: number | null
  closedLast12Months: number
}

export type PricePoint = { month: string; medianPrice: number }

type Props = {
  /** e.g. "Bend", "Caldera Springs" */
  placeName: string
  headingId: string
  stats: GeoMarketStats
  priceHistory: PricePoint[]
  /** e.g. /reports/city/Bend */
  fullReportHref: string
  /** e.g. /reports/explore */
  exploreHref?: string
  /** For analytics, e.g. "city_market_stats" */
  trackContext: string
}

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatMonth(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

/**
 * Shared Market Overview for city, community, and neighborhood pages.
 * Four stat cards, optional median price chart, and Full report + Explore CTAs.
 */
export default function GeoMarketOverview({
  placeName,
  headingId,
  stats,
  priceHistory,
  fullReportHref,
  exploreHref = '/reports/explore',
  trackContext,
}: Props) {
  const hasChartData = priceHistory.length >= 2

  return (
    <section className="bg-muted px-4 py-10 sm:px-6 sm:py-12" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl">
        <h2 id={headingId} className="text-2xl font-bold tracking-tight text-primary">
          {placeName} Market Overview
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary">{formatPrice(stats.medianPrice)}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Median Price</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary">{stats.count}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Active Listings</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary">
              {stats.avgDom != null && stats.avgDom > 0 ? Math.round(stats.avgDom) : '—'}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">Avg Days on Market</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary">{stats.closedLast12Months}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Homes Sold (12 mo)</p>
          </div>
        </div>
        {hasChartData ? (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary">Median price trend</h3>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory.map((p) => ({ ...p, monthLabel: formatMonth(p.month) }))}>
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [formatPrice(v), 'Median']} labelFormatter={formatMonth} />
                  <Line type="monotone" dataKey="medianPrice" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--muted-foreground)]">
            Market data building — check back soon for price trends and sales volume.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={fullReportHref}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 font-semibold text-primary hover:bg-accent/90"
            onClick={() => trackEvent('view_market_report', { context: trackContext, place: placeName })}
          >
            Full market report
          </Link>
          <Link
            href={exploreHref}
            className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-5 py-2.5 font-medium text-primary hover:bg-[var(--muted)]"
            onClick={() => trackEvent('view_market_report', { context: `${trackContext}_explore`, place: placeName })}
          >
            Explore market data
          </Link>
        </div>
      </div>
    </section>
  )
}
