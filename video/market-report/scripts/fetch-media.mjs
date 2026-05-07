#!/usr/bin/env node
/**
 * Unified media orchestrator for the Ryan Realty market-report pipeline.
 *
 * Replaces fetch-photos.mjs as the single entry point for fetching both
 * photos and videos. fetch-photos.mjs is preserved as the photo-only
 * convenience wrapper — don't delete it.
 *
 * Algorithm:
 *   1. Asset-library-FIRST query for the city × type.
 *      If ≥ N unused approved assets exist, return them — skip external fetch.
 *   2. If insufficient, run the relevant child fetchers:
 *      Photos: fetch-shutterstock.mjs, fetch-pexels.mjs, fetch-unsplash.mjs
 *      Videos: fetch-pexels-video.mjs, fetch-pixabay-video.mjs,
 *              fetch-shutterstock-video.mjs
 *   3. Re-query the asset library (now includes new arrivals).
 *   4. Copy top N to video/market-report/public/<slug>/:
 *        Photos: img_1.jpg ... img_N.jpg
 *        Videos: vid_1.mp4 ... vid_N.mp4
 *   5. Write media_credits.json with full attribution for every selected asset.
 *   6. Call markUsed() on each selected asset.
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-media.mjs --city bend --type both --photos 10 --videos 5
 *
 *   node --env-file=/... scripts/fetch-media.mjs --city bend --type photo
 *   node --env-file=/... scripts/fetch-media.mjs --city bend --type video --videos 8
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..', '..')
const PUB = resolve(__dirname, '..', 'public')

// Asset library lives in the repo root
const { search, markUsed } = await import('../../../lib/asset-library.mjs')

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
      } else {
        const next = argv[i + 1]
        if (next && !next.startsWith('--')) {
          out[a.slice(2)] = next
          i++
        } else {
          out[a.slice(2)] = true
        }
      }
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

const citySlug = args.city || args.c
if (!citySlug) {
  console.error('Usage: node fetch-media.mjs --city <slug> [--type photo|video|both] [--photos N] [--videos N]')
  console.error('')
  console.error('Options:')
  console.error('  --city <slug>          City slug: bend | redmond | sisters | la-pine | prineville | sunriver')
  console.error('  --type photo|video|both  What to fetch (default: both)')
  console.error('  --photos N             Number of photos to output (default: 10)')
  console.error('  --videos N             Number of videos to output (default: 5)')
  process.exit(1)
}

const mediaType = (args.type || 'both').toLowerCase()
if (!['photo', 'video', 'both'].includes(mediaType)) {
  console.error(`--type must be photo, video, or both (got: ${mediaType})`)
  process.exit(1)
}

const N_PHOTOS = parseInt(args.photos || args.p || '10', 10)
const N_VIDEOS = parseInt(args.videos || args.v || '5', 10)

const doPhotos = mediaType === 'photo' || mediaType === 'both'
const doVideos = mediaType === 'video' || mediaType === 'both'

// ─────────────────────────────────────────────────────────────────────────────
//  City → geo_tag mapping
// ─────────────────────────────────────────────────────────────────────────────
const CITY_GEO = {
  bend: ['bend', 'central-oregon'],
  redmond: ['redmond', 'central-oregon'],
  sisters: ['sisters', 'central-oregon'],
  'la-pine': ['la-pine', 'central-oregon'],
  prineville: ['prineville', 'central-oregon'],
  sunriver: ['sunriver', 'central-oregon'],
}

const geoFilter = CITY_GEO[citySlug]
if (!geoFilter) {
  console.error(`Unknown city slug: ${citySlug}. Valid: ${Object.keys(CITY_GEO).join(', ')}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Run a child fetcher via node --env-file
// ─────────────────────────────────────────────────────────────────────────────
async function runFetcher(scriptName, citySlug) {
  const scriptPath = resolve(__dirname, scriptName)
  if (!existsSync(scriptPath)) {
    console.warn(`  Fetcher not found: ${scriptPath} — skipping`)
    return
  }
  const envFile = resolve(ROOT, '.env.local')
  const args = ['--env-file=' + envFile, scriptPath, citySlug]
  console.log(`  Running: node ${args.join(' ')}`)
  try {
    const { stdout, stderr } = await exec('node', args, {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10-minute ceiling per fetcher (videos are larger)
    })
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  } catch (e) {
    // Surface warning but don't abort — partial results are fine
    console.warn(`  Fetcher ${scriptName} failed: ${e.message.slice(0, 300)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Query library and filter to assets that exist on disk
// ─────────────────────────────────────────────────────────────────────────────
async function queryLibrary(type, limit, unusedOnly = true) {
  const results = await search({
    geo: geoFilter,
    type,
    limit,
    unusedOnly,
  })
  return results.filter(a => {
    if (!a.file_path) return false
    return existsSync(resolve(ROOT, a.file_path))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sort candidates: approved first, then most recently registered
// ─────────────────────────────────────────────────────────────────────────────
function sortCandidates(candidates) {
  return candidates.slice().sort((a, b) => {
    const aApproved = a.approval === 'approved' ? 1 : 0
    const bApproved = b.approval === 'approved' ? 1 : 0
    if (aApproved !== bApproved) return bApproved - aApproved
    return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
const cityOut = resolve(PUB, citySlug)
await mkdir(cityOut, { recursive: true })

console.log(`\n=== fetch-media: ${citySlug} | type=${mediaType} | photos=${doPhotos ? N_PHOTOS : 'skip'} videos=${doVideos ? N_VIDEOS : 'skip'} ===`)

// ── Photos ────────────────────────────────────────────────────────────────────
let selectedPhotos = []

if (doPhotos) {
  console.log(`\n--- PHOTOS ---`)
  console.log(`  Step 1: querying asset library for geo=[${geoFilter.join(',')}] type=photo...`)

  let libraryPhotos = await queryLibrary('photo', N_PHOTOS * 3, true)
  console.log(`  Found ${libraryPhotos.length} unused photos in library (need ${N_PHOTOS}).`)

  if (libraryPhotos.length < N_PHOTOS) {
    console.log('  Insufficient — fetching from external sources...')

    console.log('\n  Step 2a: Shutterstock photos...')
    await runFetcher('fetch-shutterstock.mjs', citySlug)

    console.log('\n  Step 2b: Pexels photos...')
    await runFetcher('fetch-pexels.mjs', citySlug)

    console.log('\n  Step 2c: Unsplash photos...')
    await runFetcher('fetch-unsplash.mjs', citySlug)

    console.log('\n  Step 3: re-querying asset library...')
    libraryPhotos = await queryLibrary('photo', N_PHOTOS * 5, false)
    console.log(`  Asset library now has ${libraryPhotos.length} photos for ${citySlug}.`)
  }

  if (libraryPhotos.length === 0) {
    console.error('  No usable photos found for this city. Check env vars for PEXELS_API_KEY, UNSPLASH_ACCESS_KEY.')
  } else {
    selectedPhotos = sortCandidates(libraryPhotos).slice(0, N_PHOTOS)
    if (selectedPhotos.length < N_PHOTOS) {
      console.warn(`  Only ${selectedPhotos.length} photos available (need ${N_PHOTOS}).`)
    }
  }
}

// ── Videos ────────────────────────────────────────────────────────────────────
let selectedVideos = []

if (doVideos) {
  console.log(`\n--- VIDEOS ---`)
  console.log(`  Step 1: querying asset library for geo=[${geoFilter.join(',')}] type=video...`)

  let libraryVideos = await queryLibrary('video', N_VIDEOS * 3, true)
  console.log(`  Found ${libraryVideos.length} unused videos in library (need ${N_VIDEOS}).`)

  if (libraryVideos.length < N_VIDEOS) {
    console.log('  Insufficient — fetching from external sources...')

    console.log('\n  Step 2a: Pexels videos...')
    await runFetcher('fetch-pexels-video.mjs', citySlug)

    console.log('\n  Step 2b: Pixabay videos...')
    await runFetcher('fetch-pixabay-video.mjs', citySlug)

    console.log('\n  Step 2c: Shutterstock video previews (DEV mode)...')
    await runFetcher('fetch-shutterstock-video.mjs', citySlug)

    console.log('\n  Step 3: re-querying asset library...')
    libraryVideos = await queryLibrary('video', N_VIDEOS * 5, false)
    console.log(`  Asset library now has ${libraryVideos.length} videos for ${citySlug}.`)
  }

  if (libraryVideos.length === 0) {
    console.warn('  No usable videos found for this city. Check env vars for PEXELS_API_KEY, PIXABAY_API_KEY.')
  } else {
    // Prefer approved (licensed) over intake (preview/watermarked) for video selection
    selectedVideos = sortCandidates(libraryVideos).slice(0, N_VIDEOS)
    if (selectedVideos.length < N_VIDEOS) {
      console.warn(`  Only ${selectedVideos.length} videos available (need ${N_VIDEOS}).`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Copy selected assets to public/<slug>/ and mark used
// ─────────────────────────────────────────────────────────────────────────────
const credits = { city: citySlug, generated_at: new Date().toISOString(), photos: [], videos: [] }

// Photos → img_1.jpg ... img_N.jpg
for (let i = 0; i < selectedPhotos.length; i++) {
  const asset = selectedPhotos[i]
  const srcAbs = resolve(ROOT, asset.file_path)
  const destPath = resolve(cityOut, `img_${i + 1}.jpg`)
  await copyFile(srcAbs, destPath)

  try {
    await markUsed(asset.id, {
      render_path: destPath,
      scene_id: `img_${i + 1}`,
      render_type: 'market-report',
    })
  } catch (_) {}

  const previewNote = asset.license_metadata?.preview_only ? ' [PREVIEW - watermarked]' : ''
  console.log(`  img_${i + 1}: ${asset.source}/${asset.source_id || asset.id.slice(0, 8)} — ${asset.creator || 'unknown'}${previewNote}`)

  credits.photos.push({
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
    width: asset.width,
    height: asset.height,
    file_path: asset.file_path,
    approval: asset.approval,
  })
}

// Videos → vid_1.mp4 ... vid_N.mp4
for (let i = 0; i < selectedVideos.length; i++) {
  const asset = selectedVideos[i]
  const srcAbs = resolve(ROOT, asset.file_path)
  const ext = extname(asset.file_path) || '.mp4'
  const destPath = resolve(cityOut, `vid_${i + 1}${ext}`)
  await copyFile(srcAbs, destPath)

  try {
    await markUsed(asset.id, {
      render_path: destPath,
      scene_id: `vid_${i + 1}`,
      render_type: 'market-report',
    })
  } catch (_) {}

  const previewNote = asset.license_metadata?.preview_only ? ' [PREVIEW - watermarked]' : ''
  console.log(`  vid_${i + 1}: ${asset.source}/${asset.source_id || asset.id.slice(0, 8)} — ${asset.creator || 'unknown'} ${asset.duration_sec}s${previewNote}`)

  credits.videos.push({
    slot: `vid_${i + 1}`,
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
    width: asset.width,
    height: asset.height,
    duration_sec: asset.duration_sec,
    file_path: asset.file_path,
    approval: asset.approval,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Write media_credits.json
// ─────────────────────────────────────────────────────────────────────────────
const creditsPath = resolve(cityOut, 'media_credits.json')
await writeFile(creditsPath, JSON.stringify(credits, null, 2))
console.log(`\n  Wrote ${creditsPath}`)
console.log(`  Photos: ${selectedPhotos.length} | Videos: ${selectedVideos.length}`)

if (credits.photos.some(c => c.preview_only) || credits.videos.some(c => c.preview_only)) {
  console.warn('\n  *** Some assets are watermarked PREVIEWS. License before production render. ***')
}

console.log('\n  Done.')
