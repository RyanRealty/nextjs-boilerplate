#!/usr/bin/env node
/**
 * Fetch Shutterstock PREVIEW videos for a city and register them in the
 * Ryan Realty asset library.
 *
 * *** DEV MODE — WATERMARKED PREVIEWS ONLY ***
 *
 * Shutterstock video previews are free to download but carry a visible
 * watermark. Do NOT use these in any production render.
 * To license a clip for production: POST to /v2/videos/licenses (paid plan).
 * This script ONLY downloads the preview URL — it never calls /licenses.
 *
 * Auth: Basic <base64(SHUTTERSTOCK_API_KEY:SHUTTERSTOCK_API_SECRET)>
 * Endpoint: https://api.shutterstock.com/v2/videos/search
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-shutterstock-video.mjs <city>
 *
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-shutterstock-video.mjs --query "smith rock" --per-page 5
 *
 * Output: public/asset-library/videos/shutterstock/<id>.mp4
 *         Registered in data/asset-library/manifest.json (approval: 'intake')
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
const ASSET_DIR = resolve(ROOT, 'public', 'asset-library', 'videos', 'shutterstock')

const { register } = await import('../../../lib/asset-library.mjs')

// ─────────────────────────────────────────────────────────────────────────────
//  DEV MODE banner — printed before any work starts
// ─────────────────────────────────────────────────────────────────────────────
console.warn('')
console.warn('*** DEV MODE: Shutterstock video previews are watermarked. ***')
console.warn('    These clips are for scouting only — NOT for production renders.')
console.warn('    License clips via /v2/videos/licenses before any production use.')
console.warn('')

// ─────────────────────────────────────────────────────────────────────────────
//  Auth
// ─────────────────────────────────────────────────────────────────────────────
const API_KEY = process.env.SHUTTERSTOCK_API_KEY
const API_SECRET = process.env.SHUTTERSTOCK_API_SECRET

if (!API_KEY || !API_SECRET) {
  console.error('Missing SHUTTERSTOCK_API_KEY or SHUTTERSTOCK_API_SECRET in .env.local')
  process.exit(1)
}

const AUTH_HEADER = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')
const SSTK_API = 'https://api.shutterstock.com'

// ─────────────────────────────────────────────────────────────────────────────
//  City configs — mirrors the photo fetcher queries
// ─────────────────────────────────────────────────────────────────────────────
const CITY_CONFIGS = {
  bend: {
    geoTags: ['bend', 'central-oregon', 'oregon'],
    queries: [
      'pilot butte bend oregon',
      'mount bachelor oregon',
      'old mill district bend oregon',
      'drake park bend oregon',
      'deschutes river bend oregon',
      'smith rock oregon',
      'tumalo falls oregon',
      'downtown bend oregon',
      'three sisters oregon mountains',
      'bend oregon neighborhood homes',
    ],
  },
  redmond: {
    geoTags: ['redmond', 'central-oregon', 'oregon'],
    queries: [
      'high desert oregon homes',
      'central oregon house exterior',
      'oregon ranch home',
      'redmond oregon landscape',
      'desert landscape oregon',
    ],
  },
  sisters: {
    geoTags: ['sisters', 'central-oregon', 'oregon'],
    queries: [
      'sisters oregon mountains',
      'western town oregon main street',
      'cascade range home',
      'oregon small town',
      'mountains house exterior oregon',
    ],
  },
  'la-pine': {
    geoTags: ['la-pine', 'central-oregon', 'oregon'],
    queries: [
      'ponderosa pine forest oregon',
      'oregon forest cabin',
      'rural oregon house',
      'pine forest house',
      'oregon woodland home',
    ],
  },
  prineville: {
    geoTags: ['prineville', 'central-oregon', 'oregon'],
    queries: [
      'ochoco mountains oregon',
      'oregon high desert home',
      'ranch home exterior oregon',
      'oregon rural landscape',
      'high desert house exterior',
    ],
  },
  sunriver: {
    geoTags: ['sunriver', 'central-oregon', 'oregon'],
    queries: [
      'oregon mountain resort home',
      'deschutes river oregon',
      'central oregon resort community',
      'mountain home exterior oregon',
      'oregon forest river landscape',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Extract subject tags from description
// ─────────────────────────────────────────────────────────────────────────────
function extractSubjectTags(description = '') {
  const keywords = [
    'mountain', 'river', 'forest', 'lake', 'sunset', 'sky', 'snow', 'downtown',
    'house', 'home', 'landscape', 'outdoor', 'nature', 'trail', 'park', 'aerial',
    'architecture', 'street', 'neighborhood', 'desert', 'pine', 'waterfall',
    'drone', 'timelapse', 'panoramic',
  ]
  const lower = description.toLowerCase()
  return keywords.filter(k => lower.includes(k))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shutterstock Video search
// ─────────────────────────────────────────────────────────────────────────────
async function searchSstkVideos(query, { perPage = 10, page = 1 } = {}) {
  const q = encodeURIComponent(query)
  const url = `${SSTK_API}/v2/videos/search?query=${q}&per_page=${perPage}&page=${page}`
  try {
    const { stdout } = await exec('curl', [
      '-sS', '-m', '30', '--connect-timeout', '10',
      '-H', `Authorization: ${AUTH_HEADER}`,
      '-H', 'Accept: application/json',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 })

    const parsed = JSON.parse(stdout)
    if (parsed.message && !parsed.data) {
      throw new Error(`Shutterstock error: ${parsed.message}`)
    }
    return parsed.data || []
  } catch (e) {
    if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
      console.error('  Shutterstock auth failure — check SHUTTERSTOCK_API_KEY / SHUTTERSTOCK_API_SECRET')
    } else if (e.message?.includes('429') || e.message?.includes('rate limit')) {
      console.warn('  Shutterstock rate limit hit — sleeping 30s then retrying')
      await new Promise(r => setTimeout(r, 30_000))
      return searchSstkVideos(query, { perPage, page })
    }
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Download preview video
// ─────────────────────────────────────────────────────────────────────────────
async function downloadPreview(url, destPath) {
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
    const results = await searchSstkVideos(query, { perPage })
    console.log(`    ${results.length} results`)

    for (const hit of results) {
      if (seen.has(hit.id)) continue
      seen.add(hit.id)

      // Shutterstock video assets response shape:
      //   hit.assets.preview_mp4.url  — watermarked preview
      //   hit.assets.thumb_mp4.url    — smaller preview fallback
      const previewUrl =
        hit.assets?.preview_mp4?.url ||
        hit.assets?.thumb_mp4?.url

      if (!previewUrl) {
        console.warn(`    Skipping ${hit.id}: no preview_mp4 URL`)
        continue
      }

      // Dimensions come from the preview asset or the video-level fields
      const previewAsset = hit.assets?.preview_mp4 || hit.assets?.thumb_mp4 || {}
      const width = previewAsset.width || hit.aspect ? Math.round(1920 * (hit.aspect || 1)) : null
      const height = previewAsset.height || null
      const duration = hit.duration || null

      const destPath = resolve(ASSET_DIR, `${hit.id}.mp4`)
      try {
        await downloadPreview(previewUrl, destPath)

        const description = (hit.description || '').slice(0, 200)
        const subjectTags = extractSubjectTags(description)

        const contributorId = hit.contributor?.id
        const creator = contributorId ? `Shutterstock contributor ${contributorId}` : null
        const creatorUrl = contributorId
          ? `https://www.shutterstock.com/g/${contributorId}`
          : null

        const asset = await register(destPath, {
          type: 'video',
          source: 'shutterstock',
          source_id: String(hit.id),
          license: 'shutterstock',
          license_metadata: {
            license_required: true,
            preview_only: true,
            preview_watermarked: true,
            note: 'Call /v2/videos/licenses before production use.',
            sstk_id: hit.id,
          },
          creator,
          creator_url: creatorUrl,
          geo: geoTags,
          subject: subjectTags.length ? subjectTags : ['landscape'],
          search_query: query,
          width: width || null,
          height: height || null,
          duration_sec: duration,
          approval: 'intake', // previews start as intake; promote after licensing
        })

        registered++
        console.log(`    OK ${hit.id} (contributor ${contributorId || 'unknown'}) -> asset ${asset.id.slice(0, 8)} [PREVIEW]`)
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
  console.log(`\n=== Shutterstock video fetch: ${citySlug} ===`)

  const seen = new Set()
  let total = 0

  for (const query of cfg.queries) {
    total += await processQuery(query, cfg.geoTags, seen)
  }

  console.log(`\n  Done: ${total} Shutterstock preview videos registered for ${citySlug}.`)
  console.warn('  *** These are watermarked previews. License before production use. ***')
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ad-hoc mode: --query "..." [--per-page N]
// ─────────────────────────────────────────────────────────────────────────────
async function processAdHoc(query, perPage) {
  await mkdir(ASSET_DIR, { recursive: true })
  console.log(`\n=== Shutterstock video fetch (ad-hoc): "${query}" ===`)
  const seen = new Set()
  const total = await processQuery(query, [], seen, { perPage })
  console.log(`\n  Done: ${total} Shutterstock preview videos registered.`)
  console.warn('  *** These are watermarked previews. License before production use. ***')
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
    console.error('Usage: node fetch-shutterstock-video.mjs --query "search terms" [--per-page N]')
    process.exit(1)
  }
  await processAdHoc(query, perPage)
} else {
  const cityArg = args[0]
  if (!cityArg) {
    console.error('Usage: node fetch-shutterstock-video.mjs <city>')
    console.error(`       node fetch-shutterstock-video.mjs --query "search terms" [--per-page N]`)
    console.error(`Cities: ${Object.keys(CITY_CONFIGS).join(', ')}`)
    process.exit(1)
  }
  await processCity(cityArg)
}
