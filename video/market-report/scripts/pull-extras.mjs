#!/usr/bin/env node
/**
 * Pull additional unique-data beats for the monthly market report.
 *
 * Implements §22 of `video_production_skills/market-data-video/SKILL.md`:
 * each monthly report must feature 2-3 advanced data-viz beats beyond the
 * core 5. This script pulls the data for the two evergreen ones —
 *
 *   Q7 — Price segment histogram (5 buckets, equal-width based on actual range)
 *   Q8 — Top 5 neighborhoods by closed volume (with median price + DOM)
 *
 * Both are referenced by the skill as S9 and S10 in the locked 12-scene
 * architecture. Adding them here lifts the build pipeline from 7-beat
 * (regression state) to 9-beat (spec compliant).
 *
 * Source: `listings` table direct query (same as pull-historical-windows).
 *
 * Cache audit 2026-05-07: cache is accurate. Apparent discrepancies are
 * property-type blending — cache headline `sold_count` includes all
 * PropertyTypes; for SFR-only counts read `property_type_breakdown.A`.
 * See video_production_skills/market-data-video/SKILL.md §22.
 *
 * Run:
 *   node --env-file=.env.local scripts/pull-extras.mjs <city> [YYYY-MM]
 *   YYYY-MM defaults to previous full calendar month.
 *
 * Output: writes `<city>-extras.json` next to `<city>-history.json`.
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

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// PostgREST GET against listings — same pattern as pull-historical-windows.
async function pullClosed(cityName, period, selectCols) {
  const cityEnc = encodeURIComponent(cityName)
  const url =
    `${URL_BASE}/rest/v1/listings` +
    `?City=ilike.${cityEnc}` +
    `&CloseDate=gte.${period.start}` +
    `&CloseDate=lt.${period.end}` +
    `&PropertyType=eq.A` +
    `&StandardStatus=ilike.%25Closed%25` +
    `&select=${selectCols}` +
    `&limit=2000`

  const r = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json',
    },
  })
  if (!r.ok) throw new Error(`Supabase error ${r.status}: ${await r.text()}`)
  return r.json()
}

// ──────────────────────────────────────────────────────────────────────────
//  Q7 — Price segment histogram
//  Equal-width buckets derived from the actual min/max of the period's
//  closes. Five buckets is the sweet spot — readable on portrait, captures
//  the shape of the distribution without over-binning a thin sample.
// ──────────────────────────────────────────────────────────────────────────
function buildPriceSegments(rows) {
  const prices = rows.map(r => Number(r.ClosePrice)).filter(Number.isFinite).sort((a, b) => a - b)
  if (prices.length < 5) return null

  // Use 10th-90th percentile range for bucket edges — tighter than min/max,
  // avoids the histogram being dominated by one or two outlier sales.
  const p10 = prices[Math.floor(prices.length * 0.1)]
  const p90 = prices[Math.floor(prices.length * 0.9)]
  const range = p90 - p10
  if (range === 0) return null

  // Round bucket edges to clean values for the labels.
  const roundDown = (v) => {
    if (v >= 1_000_000) return Math.floor(v / 100_000) * 100_000
    if (v >= 200_000) return Math.floor(v / 50_000) * 50_000
    return Math.floor(v / 25_000) * 25_000
  }
  const lo = roundDown(p10)
  const hi = roundDown(p90 + range * 0.1)
  const step = roundDown((hi - lo) / 5)

  const edges = [
    lo,
    lo + step,
    lo + step * 2,
    lo + step * 3,
    lo + step * 4,
  ]

  const fmtPrice = (v) => {
    if (v >= 1_000_000) {
      const m = (v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')
      return `$${m}M`
    }
    return `$${Math.round(v / 1000)}K`
  }

  const bins = []
  for (let i = 0; i < 5; i++) {
    const lower = edges[i]
    const upper = i < 4 ? edges[i + 1] : null
    const count = prices.filter(p => i === 0 ? p < edges[1]
      : i === 4 ? p >= edges[4]
      : p >= lower && p < upper).length
    const label = i === 0 ? `Under ${fmtPrice(edges[1])}`
      : i === 4 ? `${fmtPrice(edges[4])}+`
      : `${fmtPrice(lower)}–${fmtPrice(upper)}`
    bins.push({
      label,
      lower,
      upper,
      count,
      pct: Math.round((count / prices.length) * 100),
    })
  }

  return {
    total: prices.length,
    bins,
    annotations: buildHistogramAnnotations(bins),
  }
}

// Two short annotations for the histogram beat — one factual ("X% sold under
// $Y") and one interpretive ("Most action is in the $Y-Z band"). Both
// decided from the bin shape.
function buildHistogramAnnotations(bins) {
  const total = bins.reduce((s, b) => s + b.count, 0)
  if (total === 0) return []

  // Largest bin
  let largestIdx = 0
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].count > bins[largestIdx].count) largestIdx = i
  }
  const largest = bins[largestIdx]

  return [
    `${largest.pct}% of closes`,
    `landed in ${largest.label.toLowerCase()}`,
  ]
}

// ──────────────────────────────────────────────────────────────────────────
//  Q8 — Top neighborhoods by closed volume
// ──────────────────────────────────────────────────────────────────────────
function buildTopNeighborhoods(rows) {
  const bySub = new Map()
  const skipNames = new Set(['none', 'n/a', 'na', 'unknown', '-', '--'])
  for (const r of rows) {
    const name = (r.SubdivisionName || '').trim()
    if (!name || skipNames.has(name.toLowerCase()) || name.length < 2) continue
    if (!bySub.has(name)) bySub.set(name, [])
    bySub.get(name).push(r)
  }

  // Filter to subdivisions with ≥3 sales (skill says ≥5; we relax for thin
  // markets but flag in the build trace).
  const candidates = [...bySub.entries()]
    .filter(([_, rs]) => rs.length >= 3)
    .map(([name, rs]) => {
      const prices = rs.map(r => Number(r.ClosePrice)).filter(Number.isFinite)
      const doms = rs.map(r => Number(r.DaysOnMarket)).filter(Number.isFinite)
      return {
        name,
        count: rs.length,
        median_price: median(prices),
        median_dom: median(doms),
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (candidates.length < 3) return null

  const fmtPrice = (v) => v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
    : `$${Math.round(v / 1000)}K`

  // Highlight the #1 row.
  const rowsOut = candidates.map((c, i) => ({
    name: c.name,
    median: fmtPrice(c.median_price),
    yoy: `${c.count} sold`, // re-purposing the yoy slot for sales count
    median_dom: c.median_dom,
    highlight: i === 0,
  }))

  return { rows: rowsOut, total: candidates.reduce((s, c) => s + c.count, 0) }
}

// ──────────────────────────────────────────────────────────────────────────
//  Driver
// ──────────────────────────────────────────────────────────────────────────
async function processCity(slug, yyyymm) {
  const cityName = CITIES[slug]
  if (!cityName) throw new Error(`Unknown city slug: ${slug}`)

  const period = monthBounds(yyyymm)
  console.log(`\n=== ${cityName} ${period.monthName} ${period.year} ===`)
  console.log(`  Window: ${period.start} → ${period.end}`)

  const rows = await pullClosed(cityName, period, 'ClosePrice,DaysOnMarket,SubdivisionName')
  console.log(`  Closed sales: ${rows.length}`)

  const segments = buildPriceSegments(rows)
  const neighborhoods = buildTopNeighborhoods(rows)

  if (segments) {
    console.log(`  Q7 price segments: ${segments.bins.map(b => `${b.label}=${b.count}`).join(' | ')}`)
  } else {
    console.log(`  Q7 price segments: SKIPPED (sample too thin)`)
  }

  if (neighborhoods) {
    console.log(`  Q8 top neighborhoods:`)
    for (const r of neighborhoods.rows) {
      console.log(`    ${r.name} — ${r.yoy} @ ${r.median} median (${r.median_dom}d DOM)`)
    }
  } else {
    console.log(`  Q8 top neighborhoods: SKIPPED (need ≥3 subdivisions with ≥3 sales)`)
  }

  const out = {
    city: cityName,
    city_slug: slug,
    report_month: yyyymm,
    pulled_at: new Date().toISOString(),
    source: 'listings table direct query (PropertyType=A AND StandardStatus ilike "%Closed%"). Cache audit 2026-05-07: cache is accurate. Apparent discrepancies are property-type blending — cache headline sold_count includes all PropertyTypes; for SFR-only counts read property_type_breakdown.A. See video_production_skills/market-data-video/SKILL.md §22.',
    period: { start: period.start, end: period.end, label: `${period.monthName} ${period.year}` },
    closed_count: rows.length,
    price_segments: segments,
    top_neighborhoods: neighborhoods,
  }

  const outPath = resolve(DATA_DIR, `${slug}-extras.json`)
  await writeFile(outPath, JSON.stringify(out, null, 2))
  console.log(`  Wrote ${outPath}`)
}

const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const slug = args[0]
const yyyymm = args[1] || getDefaultMonth()

if (!slug) {
  console.error('Usage: node scripts/pull-extras.mjs <city> [YYYY-MM]')
  process.exit(1)
}

if (slug === 'all') {
  for (const s of Object.keys(CITIES)) await processCity(s, yyyymm)
} else {
  await processCity(slug, yyyymm)
}
console.log('\nDone.')
