#!/usr/bin/env node
// Build Remotion props.json + ONE continuous VO script per city.
//
// REWRITTEN 2026-05-07 (Matt directive). Three changes vs. the prior version:
//
//   1. NO label-only intro beats. The old layout said "DAYS ON MARKET" on its
//      own scene, then "DAYS ON MARKET 46 DAYS" on the next scene. Redundant.
//      We now emit one beat per stat. Title card → Price → MoS → DOM → STL →
//      Active → Outro. 7 beats total (was 11).
//
//   2. Rich chart layouts per beat:
//        Price beat   → line_chart with the 4-year multi-year series
//        MoS beat     → gauge (semicircular, color zones, verdict pill)
//        DOM beat     → compare (current vs last year, large value + delta)
//        STL beat     → bar (saturated gauge style, 0-100% scale)
//        Active beat  → compare (active count, pending + new30d in context)
//
//   3. ONE continuous flowing VO script. Old version emitted 11 separate
//      "segments" that synth-vo synthed individually and ffmpeg concat'd —
//      that's why the audio sounded like a list of headers being read aloud.
//      We now emit a single `fullText` paragraph and let synth-vo make ONE
//      ElevenLabs call. Beat boundaries derive from word timings against
//      named trigger phrases.
//
// Output:
//   out/<slug>/props.json       — Remotion composition props (no captionWords yet)
//   out/<slug>/script.json      — { fullText, beatTriggers, city }
//   out/<slug>/citations.json   — every on-screen number traced to source

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'data')
const OUT = resolve(ROOT, 'out')

const ALL_CITIES = [
  { slug: 'bend', dataFile: 'bend.json' },
  { slug: 'redmond', dataFile: 'redmond.json' },
  { slug: 'sisters', dataFile: 'sisters.json' },
  { slug: 'la-pine', dataFile: 'la pine.json' },
  { slug: 'prineville', dataFile: 'prineville.json' },
  { slug: 'sunriver', dataFile: 'sunriver.json' },
]
// Optional CITY env filter — useful for iterating on a single city without
// touching the other five.
const CITY_FILTER = process.env.CITY ? process.env.CITY.split(',').map(s => s.trim()) : null
const CITIES = CITY_FILTER ? ALL_CITIES.filter(c => CITY_FILTER.includes(c.slug)) : ALL_CITIES

const PRONOUNCE = {
  'Deschutes': 'duh-shoots',
  'La Pine': 'La Pine',
  'Sunriver': 'Sun River',
  'Sisters': 'Sisters',
  'Prineville': 'Prineville',
  'Redmond': 'Redmond',
  'Bend': 'Bend',
  'Tumalo': 'TUM-uh-low',
}

const fmtMoneyShort = (n) => {
  if (n == null) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000) return '$' + Math.round(n / 1000) + 'K'
  return '$' + Math.round(n).toLocaleString()
}

const monthName = (iso) => {
  const m = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return m[new Date(iso + 'T12:00:00').getMonth()]
}

const planForCity = (data) => {
  const city = data.city
  const cityVo = PRONOUNCE[city] || city
  const pulse = data.pulse

  // Prefer the month-only history window (April 2026) over the YTD aggregate
  // for headline stats. The data file's `_history.windows[0]` is the current
  // month; falls back to ytd_2026 if history isn't loaded yet.
  const cur = data._history?.windows?.[0]
  const yr1 = data._history?.windows?.[1]
  const yr2 = data._history?.windows?.[2]
  const baseline = data._history?.windows?.[3]

  const medianSale = cur ? cur.median_sale_price : data.ytd_2026.medianSalePrice
  const closedCount = cur ? cur.closed_count : data.ytd_2026.count
  const dom = cur ? cur.median_dom : Math.round(data.ytd_2026.medianDOM)
  const slRatio = cur ? cur.median_sale_to_list_ratio : data.ytd_2026.medianSaleToOriginalListRatio
  const slPct = slRatio * 100
  const slPctDisplay = slPct.toFixed(1).replace(/\.0$/, '')
  const slBarPct = Math.max(0.05, Math.min(1, (slPct - 80) / 20))

  const yr1Sale = yr1 ? yr1.median_sale_price : data.ytd_2025.medianSalePrice
  const yoy = (medianSale - yr1Sale) / yr1Sale
  const yoyPct = yoy * 100
  const yoyDir = yoy > 0.005 ? 'up' : yoy < -0.005 ? 'down' : 'flat'
  const yoyText = yoyDir === 'flat' ? 'flat vs last year' : `${yoyDir === 'up' ? '+' : ''}${yoyPct.toFixed(1)}% vs last year`

  const yr1Dom = yr1 ? yr1.median_dom : Math.round(data.ytd_2025.medianDOM)
  const domDelta = dom - yr1Dom

  const active = pulse.active_count
  const pending = pulse.pending_count
  const new30d = pulse.new_count_30d
  const mos = pulse.months_of_supply

  // MoS classification — verdict pill on gauge.
  const klass = mos < 4 ? 'sellers' : mos < 6 ? 'balanced' : 'buyers'
  const klassPill = klass === 'sellers' ? "SELLER'S MARKET"
    : klass === 'balanced' ? 'BALANCED MARKET'
    : "BUYER'S MARKET"
  const klassImplication = klass === 'sellers'
    ? 'Inventory is tight, pricing has held.'
    : klass === 'balanced'
    ? 'Buyers have options without forcing the market.'
    : 'Buyers hold the cards. Price to move.'

  const introMonth = monthName(data.period.ytd_end)
  const introYear = data.period.ytd_end.slice(0, 4)

  // ─────────────────────────────────────────────────────────────────────────
  //  ONE CONTINUOUS VO SCRIPT
  // ─────────────────────────────────────────────────────────────────────────
  // Written as a single flowing paragraph. ElevenLabs synths it in ONE call,
  // returns continuous word timing, and we derive beat boundaries from the
  // alignment by finding trigger phrases. No segment-level concatenation,
  // no per-segment attack/release, no choppy joins.
  //
  // Per-figure verbalization (numbers spoken, not symbol-read) so Victoria
  // pronounces them naturally:

  const moneyToSpoken = (n) => {
    // 699000 → "six hundred ninety-nine thousand"
    // 1200000 → "one point two million"
    if (n >= 1_000_000) {
      const m = (n / 1_000_000).toFixed(1).replace(/\.0$/, '')
      return `${m} million`
    }
    const k = Math.round(n / 1000)
    if (k < 100) return `${k} thousand`
    const ones = ['','one','two','three','four','five','six','seven','eight','nine']
    const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
    const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
    const hundreds = Math.floor(k / 100)
    const rest = k % 100
    let result = `${ones[hundreds]} hundred`
    if (rest === 0) return `${result} thousand`
    if (rest < 10) return `${result} ${ones[rest]} thousand`
    if (rest < 20) return `${result} ${teens[rest - 10]} thousand`
    const t = Math.floor(rest / 10)
    const o = rest % 10
    return `${result} ${tens[t]}${o ? '-' + ones[o] : ''} thousand`
  }
  const decimalSpoken = (n) => {
    const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten']
    const rounded = Math.round(n * 10) / 10
    const whole = Math.floor(rounded)
    const tenth = Math.round((rounded - whole) * 10)
    if (tenth === 0) return ones[whole] || `${whole}`
    return `${ones[whole] || whole} point ${ones[tenth]}`
  }
  const pctSpoken = (p) => {
    const abs = Math.abs(p * 100)
    const r = Math.round(abs * 10) / 10
    const whole = Math.floor(r)
    const tenth = Math.round((r - whole) * 10)
    if (tenth === 0) return `${whole} percent`
    return `${whole} point ${tenth} percent`
  }
  const intSpoken = (n) => {
    if (n < 100) return `${n}`
    return `${n}`
  }

  // Multi-year context for the price beat
  const yr1Money = yr1 ? moneyToSpoken(yr1.median_sale_price) : null
  const yr2Money = yr2 ? moneyToSpoken(yr2.median_sale_price) : null
  const baselineMoney = baseline ? moneyToSpoken(baseline.median_sale_price) : null
  const baselineYear = baseline ? baseline.period_start.slice(0, 4) : null
  const baselineLabel = baseline ? baseline.period_label : null
  const appreciation = baseline
    ? Math.round(((medianSale - baseline.median_sale_price) / baseline.median_sale_price) * 100)
    : null
  const yearsSpan = baseline ? parseInt(introYear) - parseInt(baselineYear) : null

  const yoyVo = yoyDir === 'up' ? `up ${pctSpoken(yoy)} from last year`
    : yoyDir === 'down' ? `down ${pctSpoken(yoy)} from last year`
    : 'flat versus last year'

  const domDeltaVo = domDelta === 0
    ? 'right in line with last year'
    : domDelta > 0
    ? (domDelta === 1 ? 'one day slower than last year' : `${domDelta} days slower than last year`)
    : (Math.abs(domDelta) === 1 ? 'one day faster than last year' : `${Math.abs(domDelta)} days faster than last year`)

  const stlPctVo = pctSpoken(slRatio)
  const stlColor = slPct >= 99
    ? 'Sellers are getting full ask'
    : slPct >= 97
    ? 'Pricing has held firm'
    : slPct >= 95
    ? 'There is room to negotiate'
    : 'Buyers are finding room on price'

  // The single continuous read. Sentences are short, two-clause max, with
  // commas where Victoria would naturally pause. No semicolons (banned), no
  // em-dashes (banned). No "approximately."
  const introLine = klass === 'sellers'
    ? `${cityVo} single family market, ${introMonth.toLowerCase()} ${introYear}. With ${decimalSpoken(mos)} months of supply, inventory is tight.`
    : klass === 'balanced'
    ? `${cityVo} single family market, ${introMonth.toLowerCase()} ${introYear}. At ${decimalSpoken(mos)} months of supply, this market is balanced.`
    : `${cityVo} single family market, ${introMonth.toLowerCase()} ${introYear}. At ${decimalSpoken(mos)} months of supply, buyers hold the cards.`

  const priceLine = baseline
    ? `Median sale price was ${moneyToSpoken(medianSale)}, ${yoyVo}. Compare to ${yr1Money} last ${introMonth.toLowerCase()}, ${yr2Money} the year before, and ${baselineMoney} back in ${baselineYear}. ${appreciation} percent appreciation over ${yearsSpan} years.`
    : `Median sale price was ${moneyToSpoken(medianSale)}, ${yoyVo}.`

  const mosLine = klass === 'sellers'
    ? `Months of supply sits at ${decimalSpoken(mos)}, firmly in seller territory. ${klassImplication}`
    : klass === 'balanced'
    ? `Months of supply sits at ${decimalSpoken(mos)}, comfortable territory for both sides. ${klassImplication}`
    : `Months of supply sits at ${decimalSpoken(mos)}, deep in buyer territory. ${klassImplication}`

  const domLine = `Median time to contract is ${intSpoken(dom)} days, ${domDeltaVo}.`

  const stlLine = `Sellers are getting ${stlPctVo} of asking price. ${stlColor}.`

  const activeLine = `${active.toLocaleString()} active listings on the market right now, ${pending} pending, ${new30d} new in the last thirty days.`

  const outroLine = `Full report at ryan-realty.com.`

  // Stitch into ONE paragraph.
  const fullText = [introLine, priceLine, mosLine, domLine, stlLine, activeLine, outroLine].join(' ')

  // Trigger phrases — synth-vo finds the first occurrence of each in the
  // alignment word stream and treats it as the start of that beat. The
  // first beat starts at word 0 by definition.
  const beatTriggers = [
    { id: 'intro',  triggerPhrase: null },
    { id: 'price',  triggerPhrase: 'Median sale price' },
    { id: 'mos',    triggerPhrase: 'Months of supply' },
    { id: 'dom',    triggerPhrase: 'Median time' },
    { id: 'stl',    triggerPhrase: 'Sellers are getting' },
    { id: 'active', triggerPhrase: 'active listings' },
    { id: 'outro',  triggerPhrase: 'Full report' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS — one beat per metric, rich layout per beat
  // ─────────────────────────────────────────────────────────────────────────
  // Multi-year series for the line_chart layout. Sorted oldest → newest so
  // the line draws left to right.
  const series = baseline ? [
    { month: baseline.period_label.split(' ').pop(), value: baseline.median_sale_price },
    { month: yr2.period_label.split(' ').pop(), value: yr2.median_sale_price },
    { month: yr1.period_label.split(' ').pop(), value: yr1.median_sale_price },
    { month: cur.period_label.split(' ').pop(), value: cur.median_sale_price },
  ] : null

  const stats = [
    // Stat 1 — Median Sale Price → line_chart with 4-year history
    {
      label: 'Median Sale Price',
      value: fmtMoneyShort(medianSale),
      layout: series ? 'line_chart' : 'hero',
      bgVariant: 'navy',
      changeText: yoyText,
      changeDir: yoyDir,
      context: `${closedCount} closed homes in ${introMonth} ${introYear}`,
      series,
      currentLabel: `${introMonth.toUpperCase()} ${introYear}`,
    },
    // Stat 2 — Months of Supply → gauge
    {
      label: 'Months of Supply',
      value: mos.toFixed(1).replace(/\.0$/, ''),
      unit: 'mo',
      layout: 'gauge',
      bgVariant: 'navy-rich',
      gaugeValue: mos,
      gaugeMin: 0,
      gaugeMax: 10,
      verdict: klass,
      verdictText: klassPill,
      context: klassImplication,
    },
    // Stat 3 — Days on Market → compare (current vs last year)
    {
      label: 'Days on Market',
      value: String(dom),
      unit: 'days',
      layout: 'compare',
      bgVariant: 'gold-tint',
      changeText: domDelta === 0 ? 'flat YoY' : `${domDelta > 0 ? '+' : ''}${domDelta} days vs last year`,
      changeDir: domDelta > 0 ? 'up' : domDelta < 0 ? 'down' : 'flat',
      context: domDelta === 0
        ? 'In line with last year.'
        : domDelta > 0
        ? `Slower than last year's ${yr1Dom} days.`
        : `Faster than last year's ${yr1Dom} days.`,
    },
    // Stat 4 — Sale-to-List Ratio → bar (gauge-style 0-100%)
    {
      label: 'Sale-to-List Ratio',
      value: slPctDisplay,
      unit: '%',
      layout: 'bar',
      bgVariant: 'cream',
      barPct: slBarPct,
      context: stlColor + '.',
    },
    // Stat 5 — Active Inventory → compare with pending breakdown
    {
      label: 'Active Listings',
      value: active.toLocaleString(),
      layout: 'compare',
      bgVariant: 'navy',
      context: `${pending} pending  ·  ${new30d} new in last 30 days`,
    },
  ]

  // Citations — every on-screen figure traces to source.
  const citations = {
    deliverable: `${city} Market Report — ${introMonth} ${introYear}`,
    rendered_at: new Date().toISOString(),
    verified_at: data.verified_at,
    source_primary: data.sources.live,
    source_secondary: data._history ? 'listings table direct query (multi-year history bypass)' : data.sources.ytd_closed,
    sfr_filter: data.sfr_filter,
    period: data.period,
    figures: [
      { stat: `Median Sale Price (${introMonth} ${introYear})`, on_screen: fmtMoneyShort(medianSale), exact: medianSale,
        query: cur ? `bend-history.json windows[0] median_sale_price n=${cur.closed_count}` : `listings YTD ${introYear} closed SFR median(ClosePrice)` },
      { stat: 'YoY Median Sale Price', on_screen: yoyText, direction: yoyDir, exact: yoy,
        query: `(${medianSale} - ${yr1Sale}) / ${yr1Sale}` },
      { stat: 'Active Listings', on_screen: active.toLocaleString(), exact: active,
        query: `market_pulse_live property_type='A' geo_slug='${city.toLowerCase()}', updated_at=${pulse.pulse_updated_at}` },
      { stat: 'Pending Listings', on_screen: `${pending}`, exact: pending, query: `market_pulse_live pending_count` },
      { stat: 'New 30d', on_screen: `${new30d}`, exact: new30d, query: `market_pulse_live new_count_30d` },
      { stat: 'Months of Supply', on_screen: mos.toFixed(1), exact: mos, query: `market_pulse_live months_of_supply` },
      { stat: 'Market Classification', on_screen: klassPill, exact: klass,
        query: `MoS ${mos.toFixed(2)} → seller (<4) | balanced (4-6) | buyer (>=6)` },
      { stat: 'Median Days on Market', on_screen: `${dom} days`, exact: dom,
        query: cur ? `bend-history.json windows[0] median_dom` : `listings YTD ${introYear} closed SFR median(DOM)` },
      { stat: 'Sale-to-List Ratio', on_screen: `${slPctDisplay}%`, exact: slRatio,
        query: cur ? `bend-history.json windows[0] median_sale_to_list_ratio` : `listings YTD ${introYear} median(ClosePrice/OriginalListPrice)` },
    ],
  }

  // Beat duration defaults — overridden by synth-vo once word timings are known.
  // 7 beats: intro, price, mos, dom, stl, active, outro
  const defaultBeatDurations = [4.5, 9.0, 7.0, 6.0, 6.0, 7.0, 5.0] // sums to 44.5s

  const props = {
    city,
    citySlug: city.toLowerCase().replace(/\s+/g, '-'),
    period: introYear,
    // Subhead uses the RELEASE month (current calendar month) — typically
    // one month after the data window. Data window says "April 2026"; the
    // release goes out in May, so the title card reads "Market Report — May 2026".
    subhead: `Market Report — ${monthName(new Date().toISOString().slice(0, 10))} ${introYear}`,
    voPath: 'voiceover.mp3',
    captionWords: [],
    beatDurations: defaultBeatDurations,
    stats,
    imageCount: 7,
  }

  return { props, fullText, beatTriggers, citations }
}

async function loadHistory(slug) {
  try {
    const historyPath = resolve(DATA, `${slug}-history.json`)
    return JSON.parse(await readFile(historyPath, 'utf8'))
  } catch {
    return null
  }
}

await mkdir(OUT, { recursive: true })
for (const { slug, dataFile } of CITIES) {
  const dataPath = resolve(DATA, dataFile)
  const raw = JSON.parse(await readFile(dataPath, 'utf8'))
  raw._history = await loadHistory(slug)

  const { props, fullText, beatTriggers, citations } = planForCity(raw)
  const cityOut = resolve(OUT, slug)
  await mkdir(cityOut, { recursive: true })
  await writeFile(resolve(cityOut, 'props.json'), JSON.stringify(props, null, 2))
  await writeFile(resolve(cityOut, 'script.json'), JSON.stringify({ city: raw.city, fullText, beatTriggers }, null, 2))
  await writeFile(resolve(cityOut, 'citations.json'), JSON.stringify(citations, null, 2))
  console.log(`  Built ${slug}: ${fullText.length} chars, ${beatTriggers.length} beats, ${props.stats.length} stat slots`)
}
console.log('\nAll cities planned. Next: scripts/synth-vo.mjs (single continuous synth + alignment)')
