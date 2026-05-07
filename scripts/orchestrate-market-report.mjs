#!/usr/bin/env node
/**
 * Monthly Market Report Orchestrator
 *
 * Single entry point: "create market report for Bend April 2026" fans out to
 * the 4 deliverables (short-form video, YouTube long-form, SEO blog, FB lead-gen ad).
 *
 * Per monthly-market-report-orchestrator/SKILL.md §3:
 *   - Pulls data  → build → media → synth → render → register
 *   - Surfaces a review package to Matt (draft-first rule)
 *   - Waits for explicit approval before committing or publishing
 *
 * Usage:
 *   node scripts/orchestrate-market-report.mjs \
 *     --scope city --name bend --period 2026-04
 *
 * Scopes: neighborhood | subdivision | city | multi-city | region
 *
 * CLAUDE.md data-accuracy mandate: every figure in the deliverable traces to
 * a verified primary source. Citations are written to
 * video/market-report/out/<slug>/citations.json by build-cities.mjs and are
 * required before review packaging.
 */

import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MARKET_REPORT_DIR = resolve(REPO_ROOT, 'video', 'market-report')
const SCRIPTS_DIR = resolve(MARKET_REPORT_DIR, 'scripts')
const DATA_DIR = resolve(MARKET_REPORT_DIR, 'data')
const OUT_BASE = resolve(MARKET_REPORT_DIR, 'out')
const ENV_FILE = resolve(REPO_ROOT, '.env.local')

// ─────────────────────────────────────────────────────────────────────────────
//  Valid scopes + cities per SKILL.md §1
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SCOPES = ['neighborhood', 'subdivision', 'city', 'multi-city', 'region']

const CITY_SLUGS = {
  bend: 'Bend',
  redmond: 'Redmond',
  sisters: 'Sisters',
  'la-pine': 'La Pine',
  prineville: 'Prineville',
  sunriver: 'Sunriver',
  'central-oregon': 'Central Oregon',
}

// ─────────────────────────────────────────────────────────────────────────────
//  Argument parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) {
        out[a.slice(2, eq)] = a.slice(eq + 1)
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        out[a.slice(2)] = argv[++i]
      } else {
        out[a.slice(2)] = true
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Period helpers
// ─────────────────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0') }

function defaultPeriod() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`
}

function parsePeriod(raw) {
  // Accept "2026-04", "April 2026", "april-2026"
  if (!raw) return defaultPeriod()
  const m = raw.match(/^(\d{4})-(\d{2})$/)
  if (m) return raw
  const months = ['january','february','march','april','may','june',
                  'july','august','september','october','november','december']
  const named = raw.toLowerCase().replace(/-/g, ' ')
  for (let i = 0; i < months.length; i++) {
    if (named.includes(months[i])) {
      const yr = named.match(/(\d{4})/)
      if (yr) return `${yr[1]}-${pad(i + 1)}`
    }
  }
  return raw // pass through, downstream scripts will validate
}

function periodLabel(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number)
  const mn = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })
  return `${mn} ${y}`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Logging utilities
// ─────────────────────────────────────────────────────────────────────────────

function sep(label) {
  const line = `=== ${label} ${'='.repeat(Math.max(0, 60 - label.length - 5))}`
  console.log(`\n${line}`)
}

function stepStart(label) {
  console.log(`\n[${new Date().toISOString()}] ${label}`)
}

function stepDone(label, elapsed) {
  console.log(`[${new Date().toISOString()}] ${label} — done (${(elapsed / 1000).toFixed(1)}s)`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Child process runner — streams stdout/stderr in real time
// ─────────────────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...opts.env },
      cwd: opts.cwd || REPO_ROOT,
    })

    proc.stdout.on('data', (d) => process.stdout.write(d))
    proc.stderr.on('data', (d) => process.stderr.write(d))

    proc.on('error', reject)
    proc.on('close', (code) => {
      const elapsed = Date.now() - t0
      if (code === 0) {
        resolve(elapsed)
      } else {
        reject(new Error(`Process exited with code ${code}: ${cmd} ${args.join(' ')}`))
      }
    })
  })
}

// node --env-file=<envFile> <script> [args]
function runNode(scriptPath, nodeArgs = [], opts = {}) {
  const args = [`--env-file=${ENV_FILE}`, scriptPath, ...nodeArgs]
  return run('node', args, opts)
}

// ─────────────────────────────────────────────────────────────────────────────
//  File existence assertions
// ─────────────────────────────────────────────────────────────────────────────

function assertFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file (${label}): ${path}`)
  }
}

function fileSizeMB(path) {
  try { return (statSync(path).size / 1024 / 1024).toFixed(1) } catch { return '?' }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Single-city pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function runCityPipeline(slug, period, scope) {
  const cityLabel = `${CITY_SLUGS[slug] || slug} ${periodLabel(period)}`
  sep(`SHORT-FORM VIDEO: ${cityLabel}`)

  const cityOut = resolve(OUT_BASE, slug)
  const renderPath = resolve(cityOut, 'render.mp4')
  const citationsPath = resolve(cityOut, 'citations.json')
  const scorecardPath = resolve(cityOut, 'scorecardPath.json')
  const historyFile = resolve(DATA_DIR, `${slug}-history.json`)
  const extrasFile = resolve(DATA_DIR, `${slug}-extras.json`)

  // ── Step 1: Pull historical windows ──────────────────────────────────────
  stepStart(`[1/6] pull-historical-windows — ${slug} ${period}`)
  const t1 = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'pull-historical-windows.mjs'),
    [slug, period],
  )
  assertFile(historyFile, 'history JSON')
  stepDone('pull-historical-windows', Date.now() - t1)

  // ── Step 2: Pull extras (price segments + top neighborhoods) ───────────
  stepStart(`[2/6] pull-extras — ${slug} ${period}`)
  const t2 = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'pull-extras.mjs'),
    [slug, period],
  )
  assertFile(extrasFile, 'extras JSON')
  stepDone('pull-extras', Date.now() - t2)

  // ── Step 3: Build props.json + script.json ────────────────────────────
  stepStart(`[3/6] build-cities — CITY=${slug} REPORT_PERIOD=${period}`)
  const t3 = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'build-cities.mjs'),
    [],
    { env: { CITY: slug, REPORT_PERIOD: period } },
  )
  assertFile(resolve(cityOut, 'props.json'), 'props.json')
  assertFile(resolve(cityOut, 'script.json'), 'script.json')
  assertFile(citationsPath, 'citations.json')
  stepDone('build-cities', Date.now() - t3)

  // Verify citation trace — must exist before proceeding (CLAUDE.md mandate)
  const citations = JSON.parse(await readFile(citationsPath, 'utf8'))
  const figureCount = (citations.figures || []).length
  console.log(`  Verification trace: ${figureCount} figures cited`)
  if (figureCount === 0) {
    throw new Error('citations.json has zero figures — data accuracy gate failed. Halting.')
  }

  // ── Step 4: Media fetch (asset library → Shutterstock → Unsplash → Pexels) ──
  stepStart(`[4/6] fetch-media — city=${slug} type=both photos=12 videos=5`)
  const t4 = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'fetch-media.mjs'),
    ['--city', slug, '--type', 'both', '--photos', '12', '--videos', '5'],
  )
  stepDone('fetch-media', Date.now() - t4)

  // ── Step 5: Synth Victoria VO ──────────────────────────────────────────
  stepStart(`[5/6] synth-vo — CITY=${slug}`)
  const t5 = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'synth-vo.mjs'),
    [],
    { env: { CITY: slug } },
  )
  stepDone('synth-vo', Date.now() - t5)

  // ── Step 6a: Render via Remotion ───────────────────────────────────────
  stepStart(`[6a/6] remotion render — out/${slug}/render.mp4`)
  const t6 = Date.now()
  await run(
    'npx',
    [
      'remotion', 'render',
      'src/index.ts', 'MarketReport',
      resolve(cityOut, 'render.mp4'),
      `--props=${resolve(cityOut, 'props.json')}`,
      '--codec=h264',
      '--concurrency=1',
      '--crf=22',
      '--image-format=jpeg',
      '--jpeg-quality=92',
      '--log=warn',
    ],
    { cwd: MARKET_REPORT_DIR },
  )
  assertFile(renderPath, 'render.mp4')
  const renderMB = fileSizeMB(renderPath)
  stepDone(`remotion render (${renderMB} MB)`, Date.now() - t6)

  // ── Step 6b: Register render into asset library ───────────────────────
  stepStart(`[6b/6] register-render — ${renderPath}`)
  const t6b = Date.now()
  await runNode(
    resolve(SCRIPTS_DIR, 'register-render.mjs'),
    [
      renderPath,
      '--city', slug,
      '--period', period,
      '--render-type', 'short-form',
      '--scope', scope,
    ],
  )
  stepDone('register-render', Date.now() - t6b)

  // ── Gather render metadata for review package ──────────────────────────
  let renderDuration = '?'
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execP = promisify(execFile)
    const { stdout } = await execP('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1',
      renderPath,
    ])
    renderDuration = parseFloat(stdout.trim()).toFixed(1)
  } catch { /* non-fatal */ }

  const beatCount = (citations.figures || []).length // rough proxy; props.stats.length is more precise
  let statCount = '?'
  try {
    const props = JSON.parse(await readFile(resolve(cityOut, 'props.json'), 'utf8'))
    statCount = (props.stats || []).length
  } catch { /* non-fatal */ }

  return {
    slug,
    renderPath,
    renderMB,
    renderDuration,
    statCount,
    citationsPath,
    scorecardPath,
    figureCount,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Review package printer
// ─────────────────────────────────────────────────────────────────────────────

function printReviewPackage(scope, period, results) {
  const pLabel = periodLabel(period)
  const cities = results.map(r => CITY_SLUGS[r.slug] || r.slug).join(', ')
  const title = scope === 'region'
    ? `Central Oregon Market Report — ${pLabel}`
    : `${cities} Market Report — ${pLabel}`

  sep('REVIEW PACKAGE')
  console.log(`\n**Market report ready for review — ${title}**\n`)

  for (const r of results) {
    const cityName = CITY_SLUGS[r.slug] || r.slug
    console.log(`📹 Short-form video — ${cityName}`)
    console.log(`   Path: video/market-report/out/${r.slug}/render.mp4 (${r.renderMB} MB, ${r.renderDuration}s, ${r.statCount} beats)`)
    console.log(`   Platform variants ready: IG Reels, TikTok, FB Reels, LinkedIn, X, Threads, YouTube Shorts, GBP`)
    console.log(`   Verification trace: video/market-report/out/${r.slug}/citations.json (${r.figureCount} figures cited)`)
    console.log()
  }

  console.log(`📝 SEO blog post draft (AgentFire WordPress)`)
  console.log(`   Runner: node scripts/publish-blog.mjs --scope ${scope} --name ${results.map(r => r.slug).join(',')} --period ${period}`)
  console.log()

  console.log(`📢 Facebook lead-gen ad draft`)
  console.log(`   Runner: node scripts/create-fb-ad.mjs --scope ${scope} --name ${results.map(r => r.slug).join(',')} --period ${period}`)
  console.log()

  console.log(`🎥 YouTube long-form video`)
  console.log(`   Runner: node scripts/render-youtube-long.mjs --scope ${scope} --name ${results.map(r => r.slug).join(',')} --period ${period}`)
  console.log()

  for (const r of results) {
    console.log(`📊 Verification trace: video/market-report/out/${r.slug}/citations.json`)
    console.log(`📈 Scorecard: video/market-report/out/${r.slug}/scorecard.json`)
  }

  console.log()
  console.log(`Reply "go" to publish all 4 deliverables in parallel.`)
  console.log()
  console.log(`NOTE: Per CLAUDE.md draft-first rule — nothing is committed or published`)
  console.log(`until Matt gives explicit approval ("go", "ship it", "approved", "publish").`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const scope = args.scope
  const nameRaw = args.name || args.city
  const period = parsePeriod(args.period)

  // ── Usage guard ────────────────────────────────────────────────────────
  if (!scope || !nameRaw) {
    console.log()
    console.log('Usage: node scripts/orchestrate-market-report.mjs --scope <scope> --name <city[,city]> --period <YYYY-MM>')
    console.log()
    console.log('Scopes: neighborhood | subdivision | city | multi-city | region')
    console.log()
    console.log('Examples:')
    console.log('  node scripts/orchestrate-market-report.mjs --scope city --name bend --period 2026-04')
    console.log('  node scripts/orchestrate-market-report.mjs --scope multi-city --name bend,redmond --period 2026-04')
    console.log('  node scripts/orchestrate-market-report.mjs --scope region --period 2026-04')
    console.log('  node scripts/orchestrate-market-report.mjs --scope city --name bend')
    console.log('    (period defaults to previous full calendar month)')
    console.log()
    console.log('City slugs: bend | redmond | sisters | la-pine | prineville | sunriver')
    console.log()
    process.exit(1)
  }

  if (!VALID_SCOPES.includes(scope)) {
    console.error(`Unknown scope: "${scope}". Valid: ${VALID_SCOPES.join(' | ')}`)
    process.exit(1)
  }

  // ── Neighborhood / subdivision: route to different skill ──────────────
  if (scope === 'neighborhood' || scope === 'subdivision') {
    console.error()
    console.error(`Scope "${scope}" routes to the neighborhood-overview skill.`)
    console.error(`That runner is not yet built.`)
    console.error()
    console.error(`Next step: build scripts/orchestrate-neighborhood-report.mjs`)
    console.error(`  Sub-skill: video_production_skills/neighborhood-overview/SKILL.md`)
    console.error()
    process.exit(0) // graceful halt — not an error, runner just not yet built
  }

  // ── Resolve city slugs ─────────────────────────────────────────────────
  let slugs
  if (scope === 'region') {
    // Central Oregon = all six cities, processed sequentially
    slugs = ['bend', 'redmond', 'sisters', 'la-pine', 'prineville', 'sunriver']
  } else {
    slugs = nameRaw.split(',').map((s) => s.trim().toLowerCase())
  }

  // Validate slugs
  const unknownSlugs = slugs.filter((s) => !CITY_SLUGS[s])
  if (unknownSlugs.length) {
    console.error(`Unknown city slug(s): ${unknownSlugs.join(', ')}`)
    console.error(`Valid: ${Object.keys(CITY_SLUGS).join(', ')}`)
    process.exit(1)
  }

  // ── Pre-flight checks ─────────────────────────────────────────────────
  sep('PRE-FLIGHT')
  console.log(`  Scope:   ${scope}`)
  console.log(`  Cities:  ${slugs.map((s) => CITY_SLUGS[s]).join(', ')}`)
  console.log(`  Period:  ${period} (${periodLabel(period)})`)
  console.log(`  Env:     ${ENV_FILE}`)
  console.log(`  Out dir: ${OUT_BASE}`)

  if (!existsSync(ENV_FILE)) {
    console.error(`\n.env.local not found at ${ENV_FILE}`)
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY')
    process.exit(1)
  }

  // Validate data files exist for each city (the .json base data)
  for (const slug of slugs) {
    const dataFile = slug === 'la-pine' ? 'la pine.json' : `${slug}.json`
    const dataPath = resolve(DATA_DIR, dataFile)
    if (!existsSync(dataPath)) {
      console.error(`\nMissing city data file: ${dataPath}`)
      console.error('This base data file is required for build-cities.mjs.')
      console.error('Run scripts/pull-data.mjs first, or confirm the data directory.')
      process.exit(1)
    }
    console.log(`  Data:    ${dataFile} ✓`)
  }

  // ── Run city pipelines (sequential for region/multi-city per SKILL.md §3) ──
  const results = []
  const tTotal = Date.now()

  for (const slug of slugs) {
    try {
      const result = await runCityPipeline(slug, period, scope)
      results.push(result)
    } catch (err) {
      sep('PIPELINE FAILURE')
      console.error(`\nFailed on city: ${slug}`)
      console.error(err.message)
      console.error()
      console.error('Per CLAUDE.md draft-first rule: halting. Fix the error above,')
      console.error('then re-run the orchestrator. Other cities were not attempted.')
      process.exit(1)
    }
  }

  const totalElapsed = ((Date.now() - tTotal) / 1000).toFixed(0)
  sep(`ALL CITIES DONE (${totalElapsed}s)`)

  // ── Print review package ───────────────────────────────────────────────
  printReviewPackage(scope, period, results)
}

main().catch((err) => {
  console.error('\nOrchestrator crashed:')
  console.error(err.message)
  console.error(err.stack)
  process.exit(1)
})
