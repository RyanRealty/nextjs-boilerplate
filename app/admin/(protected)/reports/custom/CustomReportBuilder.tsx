'use client'

import { useState, useCallback } from 'react'
import {
  getReportMetrics,
  getReportPriceBands,
  getReportMetricsTimeSeries,
  getReportSubdivisionsForCity,
  type ReportMetrics,
  type ReportPriceBandsResult,
  type ReportMetricsTimeSeriesPoint,
} from '@/app/actions/reports'
import type { ReportFilters } from '@/app/actions/reports'
import { getMarketReportDataForLocation } from '@/app/actions/market-reports'
import type { ReportListing } from '@/app/actions/market-reports'
import { trackEvent } from '@/lib/tracking'
import {
  REPORT_PROPERTY_TYPE_SEGMENTS,
  REPORT_PROPERTY_TYPE_FILTER_OPTIONS,
  type ReportPropertyTypeSegmentKey,
} from '@/lib/property-type'
import { Badge } from '@/components/ui/badge'
import PropertyTypeBadge from '@/components/ui/PropertyTypeBadge'

type Props = { cities: string[] }

type ReportSegmentResult = {
  key: ReportPropertyTypeSegmentKey
  label: string
  metrics: ReportMetrics
  priceBands: ReportPriceBandsResult
  timeSeries: ReportMetricsTimeSeriesPoint[] | null
}

type ReportResult = {
  metrics: ReportMetrics | null
  priceBands: ReportPriceBandsResult | null
  timeSeries: ReportMetricsTimeSeriesPoint[] | null
  breakdown: ReportSegmentResult[] | null
  pending: ReportListing[]
  closed: ReportListing[]
  periodLabel: string
  locationLabel: string
}

function filtersForSegment(segmentKey: ReportPropertyTypeSegmentKey | ''): ReportFilters {
  if (segmentKey === '') {
    return {}
  }
  const seg = REPORT_PROPERTY_TYPE_SEGMENTS.find((s) => s.key === segmentKey)
  return seg
    ? {
        includeCondoTown: seg.filters.includeCondoTown,
        includeManufactured: seg.filters.includeManufactured,
        includeAcreage: seg.filters.includeAcreage,
      }
    : {}
}

export default function CustomReportBuilder({ cities }: Props) {
  const [city, setCity] = useState('')
  const [subdivision, setSubdivision] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<ReportPropertyTypeSegmentKey | ''>('')
  const [breakDownByPropertyType, setBreakDownByPropertyType] = useState(false)
  const [includeMetrics, setIncludeMetrics] = useState(true)
  const [includePriceBands, setIncludePriceBands] = useState(true)
  const [includeTimeSeries, setIncludeTimeSeries] = useState(true)
  const [timeSeriesMonths, setTimeSeriesMonths] = useState(12)
  const [includePendingClosed, setIncludePendingClosed] = useState(true)
  const [subdivisions, setSubdivisions] = useState<string[]>([])
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)

  const onCityChange = useCallback(async (value: string) => {
    setCity(value)
    setSubdivision('')
    setResult(null)
    if (!value.trim()) {
      setSubdivisions([])
      return
    }
    setLoadingSubdivisions(true)
    try {
      const { subdivisions: subs } = await getReportSubdivisionsForCity(value.trim())
      setSubdivisions(subs)
    } finally {
      setLoadingSubdivisions(false)
    }
  }, [])

  async function handleGenerate() {
    const c = city.trim()
    if (!c) {
      setError('Select a city.')
      return
    }
    if (!dateFrom || !dateTo) {
      setError('Select both start and end date.')
      return
    }
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setError('Invalid date range.')
      return
    }
    if (from > to) {
      setError('Start date must be on or before end date.')
      return
    }
    setError(null)
    setResult(null)
    setLoading(true)
    trackEvent('click_cta', { context: 'admin_custom_report_generate', city: c, date_from: dateFrom, date_to: dateTo })
    try {
      const startStr = dateFrom
      const endStr = dateTo
      const sub = subdivision.trim() || null
      const locationLabel = sub ? `${sub}, ${c}` : c
      const periodLabel = `${dateFrom} – ${dateTo}`
      const months = Math.min(60, Math.max(1, timeSeriesMonths))

      if (breakDownByPropertyType) {
        const segmentResults = await Promise.all(
          REPORT_PROPERTY_TYPE_SEGMENTS.map(async (seg) => {
            const f = filtersForSegment(seg.key)
            const [metricsRes, priceBandsRes, timeSeriesRes] = await Promise.all([
              includeMetrics ? getReportMetrics(c, startStr, endStr, null, sub, f) : Promise.resolve({ data: null, error: null }),
              includePriceBands ? getReportPriceBands(c, startStr, endStr, false, sub, f) : Promise.resolve({ data: null, error: null }),
              includeTimeSeries ? getReportMetricsTimeSeries(c, months, sub, f) : Promise.resolve({ data: null, error: null }),
            ])
            if (metricsRes.error && includeMetrics) return null
            if (priceBandsRes.error && includePriceBands) return null
            if (timeSeriesRes.error && includeTimeSeries) return null
            return {
              key: seg.key,
              label: seg.label,
              metrics: metricsRes.data!,
              priceBands: priceBandsRes.data!,
              timeSeries: includeTimeSeries ? (timeSeriesRes.data ?? null) : null,
            }
          })
        )
        const breakdown = segmentResults.filter((r): r is NonNullable<typeof r> => r != null)
        if (breakdown.length === 0) {
          setError('Failed to load one or more property type segments')
          return
        }
        const pendingClosedRes = includePendingClosed ? await getMarketReportDataForLocation(c, from, to, sub) : { pending: [], closed: [] }
        setResult({
          metrics: null,
          priceBands: null,
          timeSeries: null,
          breakdown,
          pending: pendingClosedRes.pending ?? [],
          closed: pendingClosedRes.closed ?? [],
          periodLabel,
          locationLabel,
        })
      } else {
        const f = filtersForSegment(propertyTypeFilter)
        const [metricsRes, priceBandsRes, timeSeriesRes, pendingClosedRes] = await Promise.all([
          getReportMetrics(c, startStr, endStr, null, sub, f),
          getReportPriceBands(c, startStr, endStr, false, sub, f),
          getReportMetricsTimeSeries(c, months, sub, f),
          getMarketReportDataForLocation(c, from, to, sub),
        ])
        if (metricsRes.error) {
          setError(metricsRes.error)
          return
        }
        if (priceBandsRes.error) {
          setError(priceBandsRes.error)
          return
        }
        if (timeSeriesRes.error) {
          setError(timeSeriesRes.error)
          return
        }
        setResult({
          metrics: includeMetrics ? (metricsRes.data ?? null) : null,
          priceBands: includePriceBands ? (priceBandsRes.data ?? null) : null,
          timeSeries: includeTimeSeries ? (timeSeriesRes.data ?? null) : null,
          breakdown: null,
          pending: includePendingClosed ? (pendingClosedRes.pending ?? []) : [],
          closed: includePendingClosed ? (pendingClosedRes.closed ?? []) : [],
          periodLabel,
          locationLabel,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Location</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">City (required)</span>
            <select
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              className="rounded-lg border border-primary/20 bg-white px-3 py-2 text-primary"
              aria-required
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">Subdivision (optional)</span>
            <select
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
              disabled={loadingSubdivisions || !city}
              className="rounded-lg border border-primary/20 bg-white px-3 py-2 text-primary disabled:opacity-60"
            >
              <option value="">All</option>
              {subdivisions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {loadingSubdivisions && <span className="text-xs text-[var(--muted-foreground)]">Loading…</span>}
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Date range</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Exact start and end date for the report period. No presets.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">From (required)</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-primary/20 bg-white px-3 py-2 text-primary"
              aria-required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">To (required)</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-primary/20 bg-white px-3 py-2 text-primary"
              aria-required
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Property type</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Filter by one type or break out metrics by property type.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">Type</span>
            <select
              value={propertyTypeFilter}
              onChange={(e) => setPropertyTypeFilter((e.target.value || '') as ReportPropertyTypeSegmentKey | '')}
              className="min-w-[180px] rounded-lg border border-primary/20 bg-white px-3 py-2 text-primary"
            >
              {REPORT_PROPERTY_TYPE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          {propertyTypeFilter === '' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={breakDownByPropertyType}
                onChange={(e) => setBreakDownByPropertyType(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 text-primary"
              />
              <span className="text-sm text-[var(--muted-foreground)]">Break out by property type</span>
            </label>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Data to include</h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeMetrics}
              onChange={(e) => setIncludeMetrics(e.target.checked)}
              className="h-4 w-4 rounded border-primary/20 text-primary"
            />
            <span className="text-sm font-medium text-primary">Summary metrics</span>
          </label>
          <p className="ml-7 text-xs text-[var(--muted-foreground)]">Sold count, median price, median DOM, median $/sqft, current listings, 12mo sales, inventory (months).</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includePriceBands}
              onChange={(e) => setIncludePriceBands(e.target.checked)}
              className="h-4 w-4 rounded border-primary/20 text-primary"
            />
            <span className="text-sm font-medium text-primary">Price bands</span>
          </label>
          <p className="ml-7 text-xs text-[var(--muted-foreground)]">Sales and current listings by price range.</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeTimeSeries}
              onChange={(e) => setIncludeTimeSeries(e.target.checked)}
              className="h-4 w-4 rounded border-primary/20 text-primary"
            />
            <span className="text-sm font-medium text-primary">Time series</span>
          </label>
          <div className="ml-7 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={timeSeriesMonths}
              onChange={(e) => setTimeSeriesMonths(Number(e.target.value) || 12)}
              className="w-20 rounded-lg border border-primary/20 px-2 py-1 text-sm"
            />
            <span className="text-sm text-[var(--muted-foreground)]">months</span>
          </div>
          <p className="ml-7 text-xs text-[var(--muted-foreground)]">Monthly sold count and median price trend.</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includePendingClosed}
              onChange={(e) => setIncludePendingClosed(e.target.checked)}
              className="h-4 w-4 rounded border-primary/20 text-primary"
            />
            <span className="text-sm font-medium text-primary">Pending & closed list</span>
          </label>
          <p className="ml-7 text-xs text-[var(--muted-foreground)]">Listing history events (went pending / closed) in the date range.</p>
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate report'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <section className="rounded-lg border border-border bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-xl font-bold text-primary">Report: {result.locationLabel}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{result.periodLabel}</p>

          {result.breakdown != null && result.breakdown.length > 0 ? (
            <div className="mt-6 space-y-8">
              {result.breakdown.map((seg) => (
                <div key={seg.key} className="rounded-lg border border-border bg-[var(--muted)] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-primary">
                    <Badge variant="outline">{seg.label}</Badge>
                  </h3>
                  {includeMetrics && (
                    <div className="overflow-x-auto">
                      <table className="min-w-[280px] border border-border text-sm">
                        <tbody>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium"># Sales (period)</td><td className="border border-border px-3 py-2">{seg.metrics.sold_count}</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Median price</td><td className="border border-border px-3 py-2">${Number(seg.metrics.median_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Median DOM</td><td className="border border-border px-3 py-2">{seg.metrics.median_dom} days</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Median $/sqft</td><td className="border border-border px-3 py-2">${Number(seg.metrics.median_ppsf).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Current listings</td><td className="border border-border px-3 py-2">{seg.metrics.current_listings}</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Sales (prior 12 mo)</td><td className="border border-border px-3 py-2">{seg.metrics.sales_12mo}</td></tr>
                          <tr><td className="border border-border bg-white px-3 py-2 font-medium">Inventory (months)</td><td className="border border-border px-3 py-2">{seg.metrics.inventory_months ?? '—'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {includePriceBands && (seg.priceBands.sales_by_band?.length > 0 || seg.priceBands.current_listings_by_band?.length > 0) && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Sales by price band</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {(seg.priceBands.sales_by_band ?? []).slice(0, 6).map((b) => (
                            <li key={b.band} className="flex justify-between gap-2">
                              <span className="text-[var(--muted-foreground)]">{b.band}</span>
                              <span className="font-medium">{b.cnt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Listings by price band</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {(seg.priceBands.current_listings_by_band ?? []).slice(0, 6).map((b) => (
                            <li key={b.band} className="flex justify-between gap-2">
                              <span className="text-[var(--muted-foreground)]">{b.band}</span>
                              <span className="font-medium">{b.cnt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {includeTimeSeries && seg.timeSeries != null && seg.timeSeries.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[280px] border border-border text-sm">
                        <thead>
                          <tr>
                            <th className="border border-border bg-white px-3 py-2 text-left font-medium">Month</th>
                            <th className="border border-border bg-white px-3 py-2 text-right font-medium">Sold</th>
                            <th className="border border-border bg-white px-3 py-2 text-right font-medium">Median price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seg.timeSeries.slice(0, 12).map((row) => (
                            <tr key={row.period_start}>
                              <td className="border border-border px-3 py-2">{row.month_label}</td>
                              <td className="border border-border px-3 py-2 text-right">{row.sold_count}</td>
                              <td className="border border-border px-3 py-2 text-right">
                                {row.median_price != null ? `$${Number(row.median_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : result.metrics !== null && (
            <div className="mt-6">
              <h3 className="text-base font-semibold text-primary">Summary metrics</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[320px] border border-border text-sm">
                  <tbody>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium"># Sales (period)</td><td className="border border-border px-3 py-2">{result.metrics.sold_count}</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Median price</td><td className="border border-border px-3 py-2">${Number(result.metrics.median_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Median DOM</td><td className="border border-border px-3 py-2">{result.metrics.median_dom} days</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Median $/sqft</td><td className="border border-border px-3 py-2">${Number(result.metrics.median_ppsf).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Current listings</td><td className="border border-border px-3 py-2">{result.metrics.current_listings}</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Sales (prior 12 mo)</td><td className="border border-border px-3 py-2">{result.metrics.sales_12mo}</td></tr>
                    <tr><td className="border border-border bg-[var(--muted)] px-3 py-2 font-medium">Inventory (months)</td><td className="border border-border px-3 py-2">{result.metrics.inventory_months ?? '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.priceBands != null && (result.priceBands.sales_by_band?.length > 0 || result.priceBands.current_listings_by_band?.length > 0) && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-primary">Sales by price band</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {(result.priceBands.sales_by_band ?? []).map((b) => (
                    <li key={b.band} className="flex justify-between gap-4">
                      <span className="text-[var(--muted-foreground)]">{b.band}</span>
                      <span className="font-medium">{b.cnt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary">Current listings by price band</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {(result.priceBands.current_listings_by_band ?? []).map((b) => (
                    <li key={b.band} className="flex justify-between gap-4">
                      <span className="text-[var(--muted-foreground)]">{b.band}</span>
                      <span className="font-medium">{b.cnt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {result.timeSeries != null && result.timeSeries.length > 0 && (
            <div className="mt-8">
              <h3 className="text-base font-semibold text-primary">Time series (monthly)</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[320px] border border-border text-sm">
                  <thead>
                    <tr>
                      <th className="border border-border bg-[var(--muted)] px-3 py-2 text-left font-medium">Month</th>
                      <th className="border border-border bg-[var(--muted)] px-3 py-2 text-right font-medium">Sold</th>
                      <th className="border border-border bg-[var(--muted)] px-3 py-2 text-right font-medium">Median price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.timeSeries.map((row) => (
                      <tr key={row.period_start}>
                        <td className="border border-border px-3 py-2">{row.month_label}</td>
                        <td className="border border-border px-3 py-2 text-right">{row.sold_count}</td>
                        <td className="border border-border px-3 py-2 text-right">
                          {row.median_price != null ? `$${Number(row.median_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(result.pending.length > 0 || result.closed.length > 0) && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {result.pending.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-primary">Went pending ({result.pending.length})</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted-foreground)]">
                    {result.pending.slice(0, 25).map((item) => (
                      <li key={item.listing_key} className="flex flex-wrap items-center gap-2">
                        <PropertyTypeBadge value={item.property_type} />
                        {item.price != null ? `$${Number(item.price).toLocaleString()}` : ''} {(item.description ?? '').slice(0, 50)}
                      </li>
                    ))}
                    {result.pending.length > 25 && <li>… and {result.pending.length - 25} more</li>}
                  </ul>
                </div>
              )}
              {result.closed.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-primary">Closed ({result.closed.length})</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted-foreground)]">
                    {result.closed.slice(0, 25).map((item) => (
                      <li key={item.listing_key} className="flex flex-wrap items-center gap-2">
                        <PropertyTypeBadge value={item.property_type} />
                        {item.price != null ? `$${Number(item.price).toLocaleString()}` : ''} {(item.description ?? '').slice(0, 50)}
                      </li>
                    ))}
                    {result.closed.length > 25 && <li>… and {result.closed.length - 25} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
