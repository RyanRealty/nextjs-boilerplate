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

  // ─────────────────────────────────────────────────────────────────────────
  //  NARRATIVE VO (Matt directive 2026-05-07)
  // ─────────────────────────────────────────────────────────────────────────
  // Old version recited every number ("Median sale price was six hundred
  // ninety-nine thousand, down 13 point 4 percent..."). The numbers are
  // already on screen — Victoria reciting them sounds like a robot reading
  // a spreadsheet. New rule: VO is the analyst commentary that gives the
  // numbers MEANING. The chart, the gauge, the bar — those carry the data.
  // The VO carries the story.
  //
  // Each beat gets ONE narrative sentence. Sentences are short, two-clause
  // max, commas where Victoria would naturally pause. No numbers spoken
  // unless absolutely required (e.g. baseline year for "since 2019").

  const introLine = klass === 'sellers'
    ? `${cityVo}, single family market for ${introMonth.toLowerCase()} ${introYear}. Inventory is tight. Sellers are in control.`
    : klass === 'balanced'
    ? `${cityVo}, single family market for ${introMonth.toLowerCase()} ${introYear}. The pendulum is balanced. Neither side has the edge right now.`
    : `${cityVo}, single family market for ${introMonth.toLowerCase()} ${introYear}. Buyers hold the cards. Sellers need to price to move.`

  // Price beat: narrative about the trajectory, not the dollar figures.
  // The multi-color line chart shows all four years with their values.
  // No em-dash (banned per CLAUDE.md anti-slop rules).
  const priceLine = baseline
    ? yoyDir === 'down'
      ? `Median prices cooled this year. Zoom out, though, and the long arc since ${baselineYear} is still pointing up. Buyers who waited are paying more, not less, in the long run.`
      : yoyDir === 'up'
      ? `Median prices kept climbing this year. The run since ${baselineYear} has been steady, and buyers are still paying for it.`
      : `Median prices held flat this year. The market has been riding a multi-year plateau since ${baselineYear}.`
    : `Median price ${yoyDir === 'up' ? 'kept climbing' : yoyDir === 'down' ? 'cooled this year' : 'held flat'}.`

  // MoS beat: gauge shows the number + verdict pill. VO speaks to meaning.
  const mosLine = klass === 'sellers'
    ? `Supply is constrained. Listings move quickly. Buyers who hesitate are losing out.`
    : klass === 'balanced'
    ? `Supply is healthy at this level. Buyers have options. Sellers can still command their price.`
    : `Supply is heavy. Buyers can take their time. Sellers have to compete for attention.`

  // DOM beat: hero number on screen. VO speaks to pace.
  const domLine = domDelta < -3
    ? `Listings are moving faster than they were a year ago. The pace has clearly picked up.`
    : domDelta > 3
    ? `Listings are sitting longer than they were a year ago. Pace has cooled.`
    : `Pace is steady, in line with last year. Nothing has shifted on the time-on-market side.`

  // STL beat: percent on screen. VO speaks to negotiation room.
  const stlLine = slPct >= 99
    ? `Negotiation room is gone. Sellers are getting full ask. If you are buying, you bring your strongest offer.`
    : slPct >= 97
    ? `Negotiation room is limited. Sellers are still getting close to asking, and buyers have to come in tight.`
    : slPct >= 95
    ? `Buyers have a little leverage on price. There is room to negotiate, but not much.`
    : `Buyers have real room to negotiate. Sellers should expect to come off ask.`

  // Active beat: count on screen. VO speaks to market depth.
  const pendingToActive = pending / Math.max(1, active)
  const activeLine = pendingToActive >= 0.4
    ? `The market is moving. Pending volume is strong against active supply, which means contracts are happening.`
    : pendingToActive >= 0.25
    ? `The pipeline is healthy and demand is steady. Buyers are out there, and contracts are flowing.`
    : `Inventory is heavy and demand has not caught up. Sellers should expect to wait.`

  const outroLine = `Full report at ryan-realty.com. Subscribe for monthly updates.`

  // Per-beat sentences. fullText is just these joined — synth-vo derives
  // beat boundaries by counting words per sentence rather than fragile phrase
  // matching, so the narrative VO can use whatever wording fits the data.
  const beatSentences = [
    { id: 'intro',  sentence: introLine },
    { id: 'price',  sentence: priceLine },
    { id: 'mos',    sentence: mosLine },
    { id: 'dom',    sentence: domLine },
    { id: 'stl',    sentence: stlLine },
    { id: 'active', sentence: activeLine },
    { id: 'outro',  sentence: outroLine },
  ]
  const fullText = beatSentences.map(b => b.sentence).join(' ')

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS — one beat per metric, rich layout per beat
  // ─────────────────────────────────────────────────────────────────────────
  // Multi-color line chart for the price beat (Matt directive 2026-05-07
  // "different year and color for each line"). Each ChartPoint carries its
  // own brand-aligned color; the segment LEADING INTO that point uses that
  // color. Sequence: 2019 (deep blue baseline) → 2024 (teal) → 2025 (soft
  // gold transition) → 2026 (full gold, the current year).
  const YEAR_COLORS = {
    baseline: '#5BA8D4',    // azure — the long-ago reference point
    yr2:      '#7BC5A8',    // teal — two years ago
    yr1:      '#C8A864',    // soft gold — one year ago
    current:  '#D4AF37',    // brand gold — the current year, highlighted
  }
  const series = baseline ? [
    { month: baseline.period_label, value: baseline.median_sale_price, color: YEAR_COLORS.baseline, yearLabel: baseline.period_start.slice(0, 4) },
    { month: yr2.period_label,      value: yr2.median_sale_price,      color: YEAR_COLORS.yr2,      yearLabel: yr2.period_start.slice(0, 4) },
    { month: yr1.period_label,      value: yr1.median_sale_price,      color: YEAR_COLORS.yr1,      yearLabel: yr1.period_start.slice(0, 4) },
    { month: cur.period_label,      value: cur.median_sale_price,      color: YEAR_COLORS.current,  yearLabel: cur.period_start.slice(0, 4) },
  ] : null

  const stats = [
    // Stat 1 — Median Sale Price → line_chart with per-point year colors
    // Each year (2019 / 2024 / 2025 / 2026) has its own brand-aligned color.
    // The segment leading into each point inherits that point's color so the
    // viewer sees AT A GLANCE which year-to-year delta is which transition.
    {
      label: 'Median Sale Price',
      value: fmtMoneyShort(medianSale),
      layout: series ? 'line_chart' : 'hero',
      bgVariant: 'navy',
      changeText: yoyText,
      changeDir: yoyDir,
      context: appreciation
        ? `${appreciation > 0 ? '+' : ''}${appreciation}% appreciation over ${yearsSpan} years`
        : `${closedCount} closed homes in ${introMonth} ${introYear}`,
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

  return { props, fullText, beatSentences, citations }
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

  const { props, fullText, beatSentences, citations } = planForCity(raw)
  const cityOut = resolve(OUT, slug)
  await mkdir(cityOut, { recursive: true })
  await writeFile(resolve(cityOut, 'props.json'), JSON.stringify(props, null, 2))
  await writeFile(resolve(cityOut, 'script.json'), JSON.stringify({ city: raw.city, fullText, beatSentences }, null, 2))
  await writeFile(resolve(cityOut, 'citations.json'), JSON.stringify(citations, null, 2))
  console.log(`  Built ${slug}: ${fullText.length} chars, ${beatSentences.length} beats, ${props.stats.length} stat slots`)
}
console.log('\nAll cities planned. Next: scripts/synth-vo.mjs (single continuous synth + alignment)')
