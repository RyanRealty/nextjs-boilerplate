#!/usr/bin/env node
/**
 * Asset-library-FIRST photo orchestrator for the market-report pipeline.
 *
 * Algorithm:
 *   1. Query asset library for city photos (unused in last 30 days).
 *      If ≥ N unused photos found, return them — skip all external fetching.
 *   2. If insufficient: run Shutterstock preview fetch → Pexels fetch →
 *      Unsplash fetch (all auto-register into asset library).
 *   3. Re-query asset library — now has new arrivals.
 *   4. Copy top N photos to video/market-report/public/<slug>/img_<n>.jpg
 *      (the filename convention build-cities.mjs expects).
 *
 * External fetchers (fetch-shutterstock, fetch-pexels, fetch-unsplash) each
 * run as child processes via the same node --env-file= invocation.
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-photos.mjs <city> [N]
 *
 *   <city>  slug: bend | redmond | sisters | la-pine | prineville | sunriver
 *   N       number of photos to output (default 10)
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..', '..')
const PUB = resolve(__dirname, '..', 'public')

// Asset library lives in the repo root
const { search, markUsed } = await import('../../../lib/asset-library.mjs')

// ─────────────────────────────────────────────────────────────────────────────
//  City → geo_tag mapping (must match what the fetchers register)
// ─────────────────────────────────────────────────────────────────────────────
const CITY_GEO = {
  bend: ['bend', 'central-oregon'],
  redmond: ['redmond', 'central-oregon'],
  sisters: ['sisters', 'central-oregon'],
  'la-pine': ['la-pine', 'central-oregon'],
  prineville: ['prineville', 'central-oregon'],
  sunriver: ['sunriver', 'central-oregon'],
}

// ─────────────────────────────────────────────────────────────────────────────
//  Run a child fetcher via node --env-file
// ─────────────────────────────────────────────────────────────────────────────
async function runFetcher(scriptPath, citySlug) {
  const envFile = resolve(ROOT, '.env.local')
  const args = [
    '--env-file=' + envFile,
    scriptPath,
    citySlug,
  ]
  console.log(`  Running: node ${args.join(' ')}`)
  try {
    const { stdout, stderr } = await exec('node', args, {
      maxBuffer: 16 * 1024 * 1024,
      timeout: 5 * 60 * 1000, // 5-minute ceiling per fetcher
    })
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  } catch (e) {
    // Surface warning but don't abort — partial results are fine
    console.warn(`  Fetcher ${basename(scriptPath)} failed: ${e.message.slice(0, 200)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
const citySlug = process.argv[2]
const N = parseInt(process.argv[3] || '10', 10)

if (!citySlug || !CITY_GEO[citySlug]) {
  console.error('Usage: node fetch-photos.mjs <city> [N]')
  console.error(`Cities: ${Object.keys(CITY_GEO).join(', ')}`)
  process.exit(1)
}

const geoFilter = CITY_GEO[citySlug]
const cityOut = resolve(PUB, citySlug)
await mkdir(cityOut, { recursive: true })

// ─────────────────────────────────────────────────────────────────────────────
//  Step 1: check asset library
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n=== fetch-photos: ${citySlug} (need ${N}) ===`)
console.log(`  Step 1: querying asset library for geo=[${geoFilter.join(',')}] type=photo...`)

let libraryPhotos = await search({
  geo: geoFilter,
  type: 'photo',
  limit: N * 3, // cast a wider net, pick best
  unusedOnly: true,
})

const SUFFICIENT = N
const hasSufficient = libraryPhotos.length >= SUFFICIENT

if (hasSufficient) {
  console.log(`  Asset library has ${libraryPhotos.length} unused photos — skipping external fetch.`)
} else {
  console.log(`  Asset library only has ${libraryPhotos.length} unused photos (need ${SUFFICIENT}). Fetching external sources...`)

  // ─────────────────────────────────────────────────────────────────────────
  //  Step 2a: Shutterstock (paid previews — dev/scouting only)
  // ─────────────────────────────────────────────────────────────────────────
  const shutterstockScript = resolve(__dirname, 'fetch-shutterstock.mjs')
  if (existsSync(shutterstockScript)) {
    console.log('\n  Step 2a: Shutterstock...')
    await runFetcher(shutterstockScript, citySlug)
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Step 2b: Pexels (free)
  // ─────────────────────────────────────────────────────────────────────────
  const pexelsScript = resolve(__dirname, 'fetch-pexels.mjs')
  if (existsSync(pexelsScript)) {
    console.log('\n  Step 2b: Pexels...')
    await runFetcher(pexelsScript, citySlug)
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Step 2c: Unsplash (free, rate-limited)
  // ─────────────────────────────────────────────────────────────────────────
  const unsplashScript = resolve(__dirname, 'fetch-unsplash.mjs')
  if (existsSync(unsplashScript)) {
    console.log('\n  Step 2c: Unsplash...')
    await runFetcher(unsplashScript, citySlug)
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Step 3: re-query after fetching
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n  Step 3: re-querying asset library after external fetches...')
  libraryPhotos = await search({
    geo: geoFilter,
    type: 'photo',
    limit: N * 5,
    unusedOnly: false, // include all — we may need to tolerate recently-used
  })
  console.log(`  Asset library now has ${libraryPhotos.length} photos for ${citySlug}.`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Step 4: pick top N, copy to public/<slug>/img_<n>.jpg
// ─────────────────────────────────────────────────────────────────────────────
// Prefer: approved > intake. Within same approval tier: most recently registered.
// Never pick photos without a file_path that actually exists.
const candidates = libraryPhotos
  .filter(a => {
    if (!a.file_path) return false
    const abs = resolve(ROOT, a.file_path)
    return existsSync(abs)
  })
  .sort((a, b) => {
    const scoreA = a.approval === 'approved' ? 1 : 0
    const scoreB = b.approval === 'approved' ? 1 : 0
    if (scoreA !== scoreB) return scoreB - scoreA
    return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
  })

if (candidates.length === 0) {
  console.error(`  No usable asset-library photos found for ${citySlug}.`)
  console.error(`  Check that fetch-unsplash/fetch-pexels/fetch-shutterstock ran successfully.`)
  process.exit(1)
}

if (candidates.length < N) {
  console.warn(`  Only ${candidates.length} usable photos in library (need ${N}). build-cities may fail on diversity check.`)
}

const selected = candidates.slice(0, N)
const credits = []

for (let i = 0; i < selected.length; i++) {
  const asset = selected[i]
  const srcAbs = resolve(ROOT, asset.file_path)
  const destPath = resolve(cityOut, `img_${i + 1}.jpg`)
  await copyFile(srcAbs, destPath)

  // Mark used in the asset library
  try {
    await markUsed(asset.id, {
      render_path: destPath,
      scene_id: `img_${i + 1}`,
      render_type: 'market-report',
    })
  } catch (_) {
    // mark-used failure is non-fatal — continue
  }

  credits.push({
    slot: `img_${i + 1}`,
    asset_id: asset.id,
    source: asset.source,
    source_id: asset.source_id,
    creator: asset.creator,
    creator_url: asset.creator_url,
    geo_tags: asset.geo_tags,
    subject_tags: asset.subject_tags,
    search_query: asset.search_query,
    license: asset.license,
    preview_only: asset.license_metadata?.preview_only || false,
    file_path: asset.file_path,
    approval: asset.approval,
  })

  const previewNote = asset.license_metadata?.preview_only ? ' [PREVIEW - watermarked]' : ''
  console.log(`  img_${i + 1}: ${asset.source}/${asset.source_id || asset.id.slice(0, 8)} — ${asset.creator || 'unknown'}${previewNote}`)
}

// Write combined credits file (replaces unsplash_credits.json for multi-source runs)
const creditsPath = resolve(cityOut, 'photo_credits.json')
await writeFile(creditsPath, JSON.stringify({
  city: citySlug,
  generated_at: new Date().toISOString(),
  photo_count: selected.length,
  photos: credits,
}, null, 2))
console.log(`\n  Wrote ${creditsPath} (${selected.length} entries)`)
console.log(`  Photos copied to ${cityOut}/img_1.jpg ... img_${selected.length}.jpg`)

if (credits.some(c => c.preview_only)) {
  console.warn('\n  ⚠️  Some photos are Shutterstock PREVIEWS (watermarked). License before production render.')
}
