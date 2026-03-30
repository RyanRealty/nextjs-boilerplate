import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { getBrokerageSettings } from '@/app/actions/brokerage'
import { getReportMetrics, getReportMetricsTimeSeries, getReportPriceBands } from '@/app/actions/reports'
import { ReportPdfDocument, type ReportPdfData } from '@/lib/pdf/report-pdf'

type ExportFormat = 'pdf' | 'xlsx'

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDateRange(startRaw: string | null, endRaw: string | null): { start: string; end: string } {
  const start = parseDate(startRaw)
  const end = parseDate(endRaw)
  if (start && end) return { start: toIsoDate(start), end: toIsoDate(end) }

  const now = new Date()
  const defaultEnd = new Date(now)
  const defaultStart = new Date(now)
  defaultStart.setMonth(defaultStart.getMonth() - 1)
  return { start: toIsoDate(defaultStart), end: toIsoDate(defaultEnd) }
}

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !key?.trim()) return null
  return createClient(url, key)
}

async function getNarrative(city: string, subdivision?: string | null): Promise<string | null> {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return null

  const geoType = subdivision?.trim() ? 'subdivision' : 'city'
  const geoName = subdivision?.trim() ? subdivision.trim() : city.trim()
  const { data } = await supabase
    .from('market_narratives')
    .select('narrative')
    .eq('geo_type', geoType)
    .eq('geo_name', geoName)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { narrative?: string | null } | null)?.narrative?.trim() ?? null
}

function buildPdfFilename(city: string, subdivision: string | null | undefined, periodStart: string, periodEnd: string) {
  const location = subdivision?.trim() ? `${city}-${subdivision}` : city
  return `market-report-${location}-${periodStart}-to-${periodEnd}`.toLowerCase().replace(/\s+/g, '-')
}

async function buildPdf(
  city: string,
  subdivision: string | null | undefined,
  periodStart: string,
  periodEnd: string
): Promise<{ fileName: string; bytes: Uint8Array }> {
  const [brokerage, metricsRes, trendRes, narrative] = await Promise.all([
    getBrokerageSettings(),
    getReportMetrics(city, periodStart, periodEnd, null, subdivision),
    getReportMetricsTimeSeries(city, 12, subdivision),
    getNarrative(city, subdivision),
  ])

  const metrics = metricsRes.data
  const trendRows = trendRes.data ?? []
  const trendLine = trendRows
    .slice(-6)
    .map((row) => `${row.month_label}: ${row.sold_count} sold`)
    .join(' | ')

  const pdfData: ReportPdfData = {
    title: `${subdivision?.trim() ? `${subdivision}, ${city}` : city} Market Report`,
    geoName: subdivision?.trim() ? `${subdivision}, ${city}` : city,
    period: `${periodStart} to ${periodEnd}`,
    metrics: {
      'Median Price': metrics?.median_price ?? 'n/a',
      'Sold Count': metrics?.sold_count ?? 'n/a',
      'Median DOM': metrics?.median_dom ?? 'n/a',
      'Median Price Per SqFt': metrics?.median_ppsf ?? 'n/a',
      'Current Listings': metrics?.current_listings ?? 'n/a',
      '12 Month Sales': metrics?.sales_12mo ?? 'n/a',
      'Inventory Months': metrics?.inventory_months ?? 'n/a',
      'Recent Trend': trendLine || 'n/a',
      Narrative: narrative ?? 'Narrative not available yet.',
    },
    branding: {
      brokerageName: brokerage?.name ?? 'Ryan Realty',
      brokerageLogoUrl: brokerage?.logo_url ?? null,
    },
  }

  const doc = React.createElement(ReportPdfDocument, { data: pdfData })
  type DocElement = Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(doc as DocElement)
  return {
    fileName: `${buildPdfFilename(city, subdivision, periodStart, periodEnd)}.pdf`,
    bytes: new Uint8Array(buffer),
  }
}

async function buildXlsx(
  city: string,
  subdivision: string | null | undefined,
  periodStart: string,
  periodEnd: string
): Promise<{ fileName: string; bytes: Uint8Array }> {
  const [metricsRes, bandsRes, trendRes, narrative] = await Promise.all([
    getReportMetrics(city, periodStart, periodEnd, null, subdivision),
    getReportPriceBands(city, periodStart, periodEnd, false, subdivision),
    getReportMetricsTimeSeries(city, 12, subdivision),
    getNarrative(city, subdivision),
  ])

  const metrics = metricsRes.data
  const bands = bandsRes.data
  const trendRows = trendRes.data ?? []
  const wb = XLSX.utils.book_new()

  const summaryRows = [
    ['City', city],
    ['Subdivision', subdivision?.trim() || 'n/a'],
    ['Period Start', periodStart],
    ['Period End', periodEnd],
    ['Median Price', metrics?.median_price ?? 'n/a'],
    ['Sold Count', metrics?.sold_count ?? 'n/a'],
    ['Median DOM', metrics?.median_dom ?? 'n/a'],
    ['Median Price Per SqFt', metrics?.median_ppsf ?? 'n/a'],
    ['Current Listings', metrics?.current_listings ?? 'n/a'],
    ['12 Month Sales', metrics?.sales_12mo ?? 'n/a'],
    ['Inventory Months', metrics?.inventory_months ?? 'n/a'],
    ['Narrative', narrative ?? 'Narrative not available yet.'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')

  const priceBandRows = [
    ['Type', 'Band', 'Count'],
    ...((bands?.sales_by_band ?? []).map((row) => ['Sold', row.band, row.cnt])),
    ...((bands?.current_listings_by_band ?? []).map((row) => ['Active', row.band, row.cnt])),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(priceBandRows), 'Price Bands')

  const trendSheetRows = [
    ['Month', 'Sold Count', 'Median Price'],
    ...trendRows.map((row) => [row.month_label, row.sold_count, row.median_price ?? 'n/a']),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendSheetRows), 'Trend')

  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return {
    fileName: `${buildPdfFilename(city, subdivision, periodStart, periodEnd)}.xlsx`,
    bytes: new Uint8Array(bytes),
  }
}

export async function GET(request: Request) {
  const rl = await checkRateLimit(request, 'strict')
  if (rl.limited) return rl.response

  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')?.trim() || 'Bend'
  const subdivision = searchParams.get('subdivision')?.trim() || null
  const formatParam = searchParams.get('format')?.toLowerCase()
  const format: ExportFormat = formatParam === 'xlsx' ? 'xlsx' : 'pdf'
  const { start, end } = getDateRange(searchParams.get('periodStart'), searchParams.get('periodEnd'))

  try {
    const built = format === 'xlsx' ? await buildXlsx(city, subdivision, start, end) : await buildPdf(city, subdivision, start, end)
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'

    return new NextResponse(Buffer.from(built.bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${built.fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
