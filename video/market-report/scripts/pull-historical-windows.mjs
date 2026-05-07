#!/usr/bin/env node
/**
 * Pull historical comparison windows for market reports.
 *
 * Per Matt's directive: every market report should always include
 * multi-year context — same window in 2025 (1y prior), 2024 (2y prior),
 * and 2019 (pre-pandemic baseline).
 *
 * Source of truth: `listings` table direct query (verified 2026-05-07
 * against in-app `market_stats_cache` which diverges by 10-15% — that
 * cache RPC has a known bug, see todo "investigate compute_and_cache_period_stats").
 *
 * Run: node --env-file=.env.local scripts/pull-historical-windows.mjs <city> [YYYY-MM]
 *   <city> = bend|redmond|sisters|la-pine|prineville|sunriver
 *   YYYY-MM = report month (e.g. 2026-04 = full April 2026 window).
 *             Defaults to previous full calendar month.
 *
 * Output: writes `<city>-history.json` next to existing `<city>.json` data file.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '..', 'data')

const CITIES = {
  bend: 'Bend',
  redmond: 'Redmond',
  sisters: 'Sisters',
  'la-pine': 'La Pine',
  prineville: 'Prineville',
  sunriver: 'Sunriver',
}

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function pad(n) { return String(n).padStart(2, '0') }

function getDefaultMonth() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`
}

function monthBounds(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number)
  const start = `${y}-${pad(m)}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  const end = `${endY}-${pad(endM)}-01`
  return { start, end, year: y, monthName: new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' }) }
}

async function pullWindow(cityName, period) {
  // Build URL manually — URLSearchParams double-encodes `%` so the ilike wildcard breaks.
  const cityEnc = encodeURIComponent(cityName)
  const url =
    `${URL_BASE}/rest/v1/listings` +
    `?City=ilike.${cityEnc}` +
    `&CloseDate=gte.${period.start}` +
    `&CloseDate=lt.${period.end}` +
    `&PropertyType=eq.A` +
    `&StandardStatus=ilike.%25Closed%25` +
    `&select=ClosePrice,DaysOnMarket,OriginalListPrice,TotalLivingAreaSqFt` +
    `&limit=2000`

  const res = await fetch(url, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Listings query failed: ${res.status} ${res.statusText}\nURL: ${url}\nBody: ${body.slice(0, 400)}`)
  }
  const rows = await res.json()

  const prices = rows.map((r) => r.ClosePrice).filter((p) => typeof p === 'number')
  const dom = rows.map((r) => r.DaysOnMarket).filter((d) => typeof d === 'number')
  const ratios = rows
    .filter((r) => typeof r.ClosePrice === 'number' && typeof r.OriginalListPrice === 'number' && r.OriginalListPrice > 0)
    .map((r) => r.ClosePrice / r.OriginalListPrice)
  const ppsf = rows
    .filter((r) => typeof r.ClosePrice === 'number' && typeof r.TotalLivingAreaSqFt === 'number' && r.TotalLivingAreaSqFt > 0)
    .map((r) => r.ClosePrice / r.TotalLivingAreaSqFt)

  return {
    period_label: `${period.monthName} ${period.year}`,
    period_start: period.start,
    period_end: period.end,
    closed_count: rows.length,
    median_sale_price: median(prices),
    avg_sale_price: prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : null,
    median_dom: median(dom),
    median_sale_to_list_ratio: median(ratios),
    median_ppsf: median(ppsf),
    sample_sizes: {
      prices: prices.length,
      dom: dom.length,
      ratios: ratios.length,
      ppsf: ppsf.length,
    },
  }
}

async function main() {
  const citySlug = process.argv[2]
  const reportMonth = process.argv[3] || getDefaultMonth()
  if (!citySlug || !CITIES[citySlug]) {
    console.error(`Usage: node pull-historical-windows.mjs <city> [YYYY-MM]`)
    console.error(`Cities: ${Object.keys(CITIES).join(', ')}`)
    process.exit(1)
  }

  const cityName = CITIES[citySlug]
  const { year: currentYear } = monthBounds(reportMonth)
  const month = reportMonth.split('-')[1]

  // Always pull: current month, 1y prior, 2y prior, pre-pandemic 2019
  const windows = [
    monthBounds(`${currentYear}-${month}`),       // 2026-04
    monthBounds(`${currentYear - 1}-${month}`),    // 2025-04
    monthBounds(`${currentYear - 2}-${month}`),    // 2024-04
    monthBounds(`2019-${month}`),                  // pre-pandemic baseline
  ]

  console.log(`\nPulling ${cityName} historical windows for ${reportMonth} (cross-year same-month):\n`)

  const out = {
    city: cityName,
    city_slug: citySlug,
    report_month: reportMonth,
    pulled_at: new Date().toISOString(),
    source: 'listings table direct query (PropertyType=A AND StandardStatus ilike "%Closed%")',
    note:
      'market_stats_cache.compute_and_cache_period_stats RPC has a verified bug that produces ' +
      'incorrect counts/prices/DOM (off by 10-15% on count, 3-7% on price, DOM wildly wrong). ' +
      'This script bypasses the cache and queries listings directly. Verified 2026-05-07.',
    windows: [],
  }

  for (const w of windows) {
    const stats = await pullWindow(cityName, w)
    out.windows.push(stats)
    console.log(
      `  ${stats.period_label.padEnd(15)} | ${String(stats.closed_count).padStart(4)} closed | ` +
      `median $${(stats.median_sale_price || 0).toLocaleString().padStart(9)} | ` +
      `DOM ${String(Math.round(stats.median_dom || 0)).padStart(3)}d | ` +
      `S/L ${((stats.median_sale_to_list_ratio || 0) * 100).toFixed(1)}%`
    )
  }

  // Compute YoY + multi-year deltas for each window vs the current
  const current = out.windows[0]
  out.deltas_vs_current = {}
  for (let i = 1; i < out.windows.length; i++) {
    const prior = out.windows[i]
    const delta = {
      label: `${current.period_label} vs ${prior.period_label}`,
      sold_pct: prior.closed_count
        ? ((current.closed_count - prior.closed_count) / prior.closed_count) * 100
        : null,
      median_price_pct: prior.median_sale_price
        ? ((current.median_sale_price - prior.median_sale_price) / prior.median_sale_price) * 100
        : null,
      dom_change_days:
        current.median_dom !== null && prior.median_dom !== null
          ? current.median_dom - prior.median_dom
          : null,
    }
    out.deltas_vs_current[`vs_${prior.period_start.slice(0, 4)}`] = delta
  }

  console.log(`\nDeltas vs current (${current.period_label}):`)
  for (const [k, d] of Object.entries(out.deltas_vs_current)) {
    console.log(
      `  ${k}: median price ${d.median_price_pct?.toFixed(1)}% | ` +
      `count ${d.sold_pct?.toFixed(1)}% | ` +
      `DOM ${d.dom_change_days >= 0 ? '+' : ''}${d.dom_change_days}d`
    )
  }

  const outPath = resolve(DATA_DIR, `${citySlug}-history.json`)
  await writeFile(outPath, JSON.stringify(out, null, 2))
  console.log(`\nWritten to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
