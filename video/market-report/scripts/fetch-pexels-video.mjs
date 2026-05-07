#!/usr/bin/env node
/**
 * Fetch Pexels VIDEOS for a city and register them in the Ryan Realty
 * asset library.
 *
 * Pexels is free — no per-asset license step required. Attribution is
 * encouraged but not legally required.
 *
 * Auth header: Authorization: <PEXELS_API_KEY>
 *   (NOT "Bearer" — Pexels uses raw key auth)
 *
 * Env var fallback order: PEXELS_API_KEY → PEXELS_ACCESS_KEY → PEXEL_API_KEY
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-pexels-video.mjs <city>
 *
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-pexels-video.mjs --query "smith rock" --per-page 5
 *
 * Output: public/asset-library/videos/pexels/<id>.mp4
 *         Registered in data/asset-library/manifest.json
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..', '..')
const ASSET_DIR = resolve(ROOT, 'public', 'asset-library', 'videos', 'pexels')

const { register } = await import('../../../lib/asset-library.mjs')

// ─────────────────────────────────────────────────────────────────────────────
//  API Key — try three env var spellings (Pexels key is sometimes mis-named)
// ─────────────────────────────────────────────────────────────────────────────
const PEXELS_KEY =
  process.env.PEXELS_API_KEY ||
  process.env.PEXELS_ACCESS_KEY ||
  process.env.PEXEL_API_KEY

if (!PEXELS_KEY) {
  console.warn('PEXELS_API_KEY not set (also tried PEXELS_ACCESS_KEY, PEXEL_API_KEY); skipping Pexels video fetch.')
  process.exit(0) // graceful — caller continues without Pexels
}

const PEXELS_VIDEO_API = 'https://api.pexels.com/videos'

// ─────────────────────────────────────────────────────────────────────────────
//  City configs — same landmark queries as the photo fetcher
// ─────────────────────────────────────────────────────────────────────────────
const CITY_CONFIGS = {
  bend: {
    geoTags: ['bend', 'central-oregon', 'oregon'],
    queries: [
      'pilot butte bend oregon',
      'mount bachelor oregon skiing',
      'old mill district bend oregon',
      'deschutes river oregon landscape',
      'smith rock oregon landscape',
      'tumalo falls oregon waterfall',
      'downtown bend oregon street',
      'three sisters mountains oregon',
      'bend oregon neighborhood',
      'cascade range landscape oregon',
    ],
  },
  redmond: {
    geoTags: ['redmond', 'central-oregon', 'oregon'],
    queries: [
      'high desert oregon landscape',
      'central oregon house exterior',
      'oregon ranch home',
      'desert landscape oregon',
      'oregon plateau landscape',
    ],
  },
  sisters: {
    geoTags: ['sisters', 'central-oregon', 'oregon'],
    queries: [
      'cascade mountains oregon',
      'small town oregon main street',
      'mountain landscape oregon',
      'oregon western town',
      'mountain house exterior',
    ],
  },
  'la-pine': {
    geoTags: ['la-pine', 'central-oregon', 'oregon'],
    queries: [
      'ponderosa pine forest oregon',
      'oregon forest house',
      'rural oregon landscape',
      'pine forest cabin',
      'woodland home exterior',
    ],
  },
  prineville: {
    geoTags: ['prineville', 'central-oregon', 'oregon'],
    queries: [
      'oregon high desert landscape',
      'ranch home exterior',
      'ochoco mountains oregon',
      'rural oregon house',
      'high desert sunset oregon',
    ],
  },
  sunriver: {
    geoTags: ['sunriver', 'central-oregon', 'oregon'],
    queries: [
      'mountain resort community oregon',
      'deschutes river landscape',
      'central oregon resort',
      'mountain home exterior',
      'oregon forest river',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pick the best video file from a Pexels video's file list.
//  Prefer HD (≤1920×1080) landscape or portrait (≤1080×1920).
//  Fallback: largest dimension we can find.
// ─────────────────────────────────────────────────────────────────────────────
function pickBestFile(videoFiles) {
  if (!videoFiles || videoFiles.length === 0) return null

  // Filter to playable mp4 files
  const mp4s = videoFiles.filter(f => f.link && (f.file_type === 'video/mp4' || f.link.includes('.mp4')))
  if (mp4s.length === 0) return videoFiles[0] // fallback to whatever we have

  // Sort: HD files (1080p-ish) first, then by largest width
  const ranked = mp4s.slice().sort((a, b) => {
    const aIsHd = a.quality === 'hd' ? 1 : 0
    const bIsHd = b.quality === 'hd' ? 1 : 0
    if (aIsHd !== bIsHd) return bIsHd - aIsHd
    // Within same quality tier: prefer resolutions up to 1920 wide
    const aW = Math.min(a.width || 0, 1920)
    const bW = Math.min(b.width || 0, 1920)
    return bW - aW
  })

  // Accept portrait (≤1080×1920) or landscape (≤1920×1080)
  for (const f of ranked) {
    const w = f.width || 0
    const h = f.height || 0
    const isPortrait = w <= 1080 && h <= 1920
    const isLandscape = w <= 1920 && h <= 1080
    if (isPortrait || isLandscape) return f
  }

  // Nothing within bounds — take the best ranked anyway
  return ranked[0]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Extract subject tags from description text
// ─────────────────────────────────────────────────────────────────────────────
function extractSubjectTags(text = '') {
  const keywords = [
    'mountain', 'river', 'forest', 'lake', 'sunset', 'sky', 'snow', 'downtown',
    'house', 'home', 'landscape', 'outdoor', 'nature', 'trail', 'park', 'aerial',
    'architecture', 'street', 'neighborhood', 'desert', 'pine', 'waterfall', 'road',
    'drone', 'timelapse', 'flyover', 'panoramic',
  ]
  const lower = text.toLowerCase()
  return keywords.filter(k => lower.includes(k))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pexels Video search
// ─────────────────────────────────────────────────────────────────────────────
async function searchPexelsVideos(query, { perPage = 10, page = 1, orientation = 'portrait' } = {}) {
  const q = encodeURIComponent(query)
  const url = `${PEXELS_VIDEO_API}/search?query=${q}&per_page=${perPage}&page=${page}&orientation=${orientation}`
  try {
    const { stdout } = await exec('curl', [
      '-sS', '-m', '30', '--connect-timeout', '10',
      '-H', `Authorization: ${PEXELS_KEY}`,
      '-H', 'Accept: application/json',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 })

    const parsed = JSON.parse(stdout)
    if (parsed.error) throw new Error(`Pexels error: ${parsed.error}`)
    return parsed.videos || []
  } catch (e) {
    if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
      console.error('  Pexels auth failure — check PEXELS_API_KEY in .env.local')
    } else if (e.message?.includes('429') || e.message?.includes('rate')) {
      console.warn('  Pexels rate limit — sleeping 30s')
      await new Promise(r => setTimeout(r, 30_000))
      return searchPexelsVideos(query, { perPage, page, orientation })
    }
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Download a video file
// ─────────────────────────────────────────────────────────────────────────────
async function downloadVideo(url, destPath) {
  if (existsSync(destPath)) {
    console.log(`    Already downloaded: ${destPath}`)
    return
  }
  await exec('curl', ['-sS', '-m', '120', '--connect-timeout', '15', '-L', '-o', destPath, url], {
    maxBuffer: 256 * 1024 * 1024, // videos can be large
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Process a single search query (shared by city mode + ad-hoc mode)
// ─────────────────────────────────────────────────────────────────────────────
async function processQuery(query, geoTags, seen, { perPage = 10 } = {}) {
  let registered = 0
  console.log(`\n  Query: "${query}"`)
  try {
    const videos = await searchPexelsVideos(query, { perPage })
    console.log(`    ${videos.length} results`)

    for (const video of videos) {
      if (seen.has(video.id)) continue
      seen.add(video.id)

      const bestFile = pickBestFile(video.video_files)
      if (!bestFile || !bestFile.link) {
        console.warn(`    Skipping ${video.id}: no usable video file`)
        continue
      }

      const destPath = resolve(ASSET_DIR, `${video.id}.mp4`)
      try {
        await downloadVideo(bestFile.link, destPath)

        const description = video.url || ''
        const subjectTags = extractSubjectTags(description)

        // Build geo_tags: start from the provided list and add any city name
        // we can extract from the query itself
        const geoFromQuery = query.toLowerCase().split(' ')
          .filter(w => w.length > 3 && !['oregon', 'landscape', 'house', 'home', 'exterior'].includes(w))

        const asset = await register(destPath, {
          type: 'video',
          source: 'pexels',
          source_id: String(video.id),
          license: 'pexels',
          license_metadata: {
            license_required: false,
            attribution_encouraged: true,
            pexels_terms: 'https://www.pexels.com/license/',
          },
          creator: video.user?.name || null,
          creator_url: video.user?.url || null,
          geo: [...new Set([...geoTags, ...geoFromQuery])],
          subject: subjectTags.length ? subjectTags : ['landscape'],
          search_query: query,
          width: bestFile.width || video.width || null,
          height: bestFile.height || video.height || null,
          duration_sec: video.duration || null,
          approval: 'approved', // Pexels videos are free — auto-approve
        })

        registered++
        console.log(`    OK ${video.id} (${video.user?.name || 'unknown'}) ${video.duration}s ${bestFile.width}x${bestFile.height} -> asset ${asset.id.slice(0, 8)}`)
      } catch (dlErr) {
        console.warn(`    Download failed for ${video.id}: ${dlErr.message}`)
      }
    }
  } catch (searchErr) {
    console.warn(`  Search failed for "${query}": ${searchErr.message}`)
  }
  return registered
}

// ─────────────────────────────────────────────────────────────────────────────
//  City mode
// ─────────────────────────────────────────────────────────────────────────────
async function processCity(citySlug) {
  const cfg = CITY_CONFIGS[citySlug]
  if (!cfg) {
    console.error(`Unknown city slug: ${citySlug}. Valid: ${Object.keys(CITY_CONFIGS).join(', ')}`)
    process.exit(1)
  }

  await mkdir(ASSET_DIR, { recursive: true })
  console.log(`\n=== Pexels video fetch: ${citySlug} ===`)

  const seen = new Set()
  let total = 0

  for (const query of cfg.queries) {
    total += await processQuery(query, cfg.geoTags, seen)
  }

  console.log(`\n  Done: ${total} Pexels videos registered for ${citySlug}.`)
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ad-hoc mode: --query "..." [--per-page N]
// ─────────────────────────────────────────────────────────────────────────────
async function processAdHoc(query, perPage) {
  await mkdir(ASSET_DIR, { recursive: true })
  console.log(`\n=== Pexels video fetch (ad-hoc): "${query}" ===`)
  const seen = new Set()
  const total = await processQuery(query, [], seen, { perPage })
  console.log(`\n  Done: ${total} Pexels videos registered.`)
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
//  Argument parsing
// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

// Check for --query flag (ad-hoc mode)
const queryFlagIdx = args.findIndex(a => a === '--query' || a.startsWith('--query='))
if (queryFlagIdx >= 0) {
  let query
  let perPage = 10
  if (args[queryFlagIdx].includes('=')) {
    query = args[queryFlagIdx].split('=').slice(1).join('=')
  } else {
    query = args[queryFlagIdx + 1]
  }
  const ppIdx = args.findIndex(a => a === '--per-page' || a.startsWith('--per-page='))
  if (ppIdx >= 0) {
    perPage = parseInt(args[ppIdx].includes('=') ? args[ppIdx].split('=')[1] : args[ppIdx + 1], 10) || 10
  }
  if (!query) {
    console.error('Usage: node fetch-pexels-video.mjs --query "search terms" [--per-page N]')
    process.exit(1)
  }
  await processAdHoc(query, perPage)
} else {
  // City mode
  const cityArg = args[0]
  if (!cityArg) {
    console.error('Usage: node fetch-pexels-video.mjs <city>')
    console.error(`       node fetch-pexels-video.mjs --query "search terms" [--per-page N]`)
    console.error(`Cities: ${Object.keys(CITY_CONFIGS).join(', ')}`)
    process.exit(1)
  }
  await processCity(cityArg)
}
