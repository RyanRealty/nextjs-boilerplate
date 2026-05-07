#!/usr/bin/env node
/**
 * Fetch Pixabay VIDEOS for a city and register them in the Ryan Realty
 * asset library.
 *
 * Pixabay videos are released under the Pixabay Content License — free for
 * commercial use, no attribution required. We record creator credit anyway
 * for provenance.
 *
 * Endpoint: https://pixabay.com/api/videos/
 * Env var: PIXABAY_API_KEY
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-pixabay-video.mjs <city>
 *
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-pixabay-video.mjs --query "smith rock" --per-page 5
 *
 * Output: public/asset-library/videos/pixabay/<id>.mp4
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
const ASSET_DIR = resolve(ROOT, 'public', 'asset-library', 'videos', 'pixabay')

const { register } = await import('../../../lib/asset-library.mjs')

// ─────────────────────────────────────────────────────────────────────────────
//  API Key
// ─────────────────────────────────────────────────────────────────────────────
const PIXABAY_KEY = process.env.PIXABAY_API_KEY

if (!PIXABAY_KEY) {
  console.warn('PIXABAY_API_KEY not set; skipping Pixabay video fetch.')
  process.exit(0) // graceful — caller continues without Pixabay
}

const PIXABAY_API = 'https://pixabay.com/api/videos/'

// ─────────────────────────────────────────────────────────────────────────────
//  City configs — same landmark queries as the photo fetchers
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
//  Pick the best stream: large → medium → small
// ─────────────────────────────────────────────────────────────────────────────
function pickBestStream(videoObj) {
  // Pixabay response: { videos: { large: { url, width, height, size }, medium: {...}, small: {...}, tiny: {...} } }
  const { large, medium, small, tiny } = videoObj.videos || {}
  for (const stream of [large, medium, small, tiny]) {
    if (stream && stream.url) return stream
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Extract subject tags from Pixabay comma-separated tags string
// ─────────────────────────────────────────────────────────────────────────────
function extractSubjectTags(tagsString = '') {
  const relevantKeywords = [
    'mountain', 'river', 'forest', 'lake', 'sunset', 'sky', 'snow', 'downtown',
    'house', 'home', 'landscape', 'outdoor', 'nature', 'trail', 'park', 'aerial',
    'architecture', 'street', 'neighborhood', 'desert', 'pine', 'waterfall', 'road',
    'drone', 'timelapse', 'panoramic', 'ranch', 'rural',
  ]
  const lower = tagsString.toLowerCase()
  return relevantKeywords.filter(k => lower.includes(k))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pixabay Video search
// ─────────────────────────────────────────────────────────────────────────────
async function searchPixabayVideos(query, { perPage = 10, page = 1 } = {}) {
  const q = encodeURIComponent(query)
  const url = `${PIXABAY_API}?key=${PIXABAY_KEY}&q=${q}&per_page=${perPage}&page=${page}&video_type=film`
  try {
    const { stdout } = await exec('curl', [
      '-sS', '-m', '30', '--connect-timeout', '10',
      '-H', 'Accept: application/json',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 })

    const parsed = JSON.parse(stdout)
    if (parsed.error) throw new Error(`Pixabay error: ${parsed.error}`)
    return parsed.hits || []
  } catch (e) {
    if (e.message?.includes('429') || e.message?.includes('rate')) {
      console.warn('  Pixabay rate limit — sleeping 30s')
      await new Promise(r => setTimeout(r, 30_000))
      return searchPixabayVideos(query, { perPage, page })
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
    maxBuffer: 256 * 1024 * 1024,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Process a single search query
// ─────────────────────────────────────────────────────────────────────────────
async function processQuery(query, geoTags, seen, { perPage = 10 } = {}) {
  let registered = 0
  console.log(`\n  Query: "${query}"`)
  try {
    const hits = await searchPixabayVideos(query, { perPage })
    console.log(`    ${hits.length} results`)

    for (const hit of hits) {
      if (seen.has(hit.id)) continue
      seen.add(hit.id)

      const stream = pickBestStream(hit)
      if (!stream || !stream.url) {
        console.warn(`    Skipping ${hit.id}: no usable video stream`)
        continue
      }

      const destPath = resolve(ASSET_DIR, `${hit.id}.mp4`)
      try {
        await downloadVideo(stream.url, destPath)

        const subjectTags = extractSubjectTags(hit.tags || '')
        const creatorUrl = hit.user ? `https://pixabay.com/users/${hit.user}-${hit.user_id}/` : null

        const asset = await register(destPath, {
          type: 'video',
          source: 'pixabay',
          source_id: String(hit.id),
          license: 'pixabay',
          license_metadata: {
            license_required: false,
            attribution_required: false,
            pixabay_terms: 'https://pixabay.com/service/terms/',
            downloads: hit.downloads || null,
            views: hit.views || null,
            likes: hit.likes || null,
          },
          creator: hit.user || null,
          creator_url: creatorUrl,
          geo: geoTags,
          subject: subjectTags.length ? subjectTags : ['landscape'],
          search_query: query,
          width: stream.width || null,
          height: stream.height || null,
          duration_sec: hit.duration || null,
          approval: 'approved', // Pixabay is free — auto-approve
        })

        registered++
        console.log(`    OK ${hit.id} (${hit.user || 'unknown'}) ${hit.duration}s ${stream.width}x${stream.height} -> asset ${asset.id.slice(0, 8)}`)
      } catch (dlErr) {
        console.warn(`    Download failed for ${hit.id}: ${dlErr.message}`)
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
  console.log(`\n=== Pixabay video fetch: ${citySlug} ===`)

  const seen = new Set()
  let total = 0

  for (const query of cfg.queries) {
    total += await processQuery(query, cfg.geoTags, seen)
  }

  console.log(`\n  Done: ${total} Pixabay videos registered for ${citySlug}.`)
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ad-hoc mode: --query "..." [--per-page N]
// ─────────────────────────────────────────────────────────────────────────────
async function processAdHoc(query, perPage) {
  await mkdir(ASSET_DIR, { recursive: true })
  console.log(`\n=== Pixabay video fetch (ad-hoc): "${query}" ===`)
  const seen = new Set()
  const total = await processQuery(query, [], seen, { perPage })
  console.log(`\n  Done: ${total} Pixabay videos registered.`)
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
//  Argument parsing
// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

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
    console.error('Usage: node fetch-pixabay-video.mjs --query "search terms" [--per-page N]')
    process.exit(1)
  }
  await processAdHoc(query, perPage)
} else {
  const cityArg = args[0]
  if (!cityArg) {
    console.error('Usage: node fetch-pixabay-video.mjs <city>')
    console.error(`       node fetch-pixabay-video.mjs --query "search terms" [--per-page N]`)
    console.error(`Cities: ${Object.keys(CITY_CONFIGS).join(', ')}`)
    process.exit(1)
  }
  await processCity(cityArg)
}
