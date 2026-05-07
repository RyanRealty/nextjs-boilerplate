#!/usr/bin/env node
/**
 * Fetch Pexels images for a city and register them in the Ryan Realty
 * asset library.
 *
 * Pexels is free — no per-asset license step required. Attribution is
 * encouraged but not legally required. We record photographer credit
 * in the asset manifest for transparency.
 *
 * Auth header: Authorization: <PEXELS_API_KEY>
 *   (NOT "Bearer" — Pexels uses raw key auth)
 *
 * Env var fallback order: PEXELS_API_KEY → PEXELS_ACCESS_KEY → PEXEL_API_KEY
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-pexels.mjs <city>
 *
 * Output: public/asset-library/photos/pexels/<id>.jpg
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
const ASSET_DIR = resolve(ROOT, 'public', 'asset-library', 'photos', 'pexels')

const { register } = await import('../../../lib/asset-library.mjs')

// ─────────────────────────────────────────────────────────────────────────────
//  API Key — try three env var spellings (Pexels key is sometimes mis-named)
// ─────────────────────────────────────────────────────────────────────────────
const PEXELS_KEY =
  process.env.PEXELS_API_KEY ||
  process.env.PEXELS_ACCESS_KEY ||
  process.env.PEXEL_API_KEY

if (!PEXELS_KEY) {
  console.warn('PEXELS_API_KEY not set (also tried PEXELS_ACCESS_KEY, PEXEL_API_KEY); skipping Pexels fetch.')
  process.exit(0) // graceful — caller continues without Pexels
}

const PEXELS_API = 'https://api.pexels.com/v1'

// ─────────────────────────────────────────────────────────────────────────────
//  Pexels search (inline — avoids TS/Next.js import)
// ─────────────────────────────────────────────────────────────────────────────
async function searchPexels(query, { perPage = 10, page = 1 } = {}) {
  const q = encodeURIComponent(query)
  const url = `${PEXELS_API}/search?query=${q}&per_page=${perPage}&page=${page}&orientation=portrait`
  try {
    const { stdout } = await exec('curl', [
      '-sS', '-m', '30', '--connect-timeout', '10',
      '-H', `Authorization: ${PEXELS_KEY}`,
      '-H', 'Accept: application/json',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 })

    const parsed = JSON.parse(stdout)
    if (parsed.error) throw new Error(`Pexels error: ${parsed.error}`)
    return parsed.photos || []
  } catch (e) {
    if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
      console.error('  Pexels auth failure — check PEXELS_API_KEY in .env.local')
    } else if (e.message?.includes('429') || e.message?.includes('rate')) {
      console.warn('  Pexels rate limit — sleeping 30s')
      await new Promise(r => setTimeout(r, 30_000))
      return searchPexels(query, { perPage, page })
    }
    throw e
  }
}

async function downloadPhoto(url, destPath) {
  if (existsSync(destPath)) {
    console.log(`    Already downloaded: ${destPath}`)
    return
  }
  await exec('curl', ['-sS', '-m', '60', '--connect-timeout', '15', '-L', '-o', destPath, url], {
    maxBuffer: 32 * 1024 * 1024,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  City configs
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
//  Extract subject tags from alt text / description
// ─────────────────────────────────────────────────────────────────────────────
function extractSubjectTags(alt = '') {
  const keywords = [
    'mountain', 'river', 'forest', 'lake', 'sunset', 'sky', 'snow', 'downtown',
    'house', 'home', 'landscape', 'outdoor', 'nature', 'trail', 'park', 'aerial',
    'architecture', 'street', 'neighborhood', 'desert', 'pine', 'waterfall', 'road',
  ]
  const lower = alt.toLowerCase()
  return keywords.filter(k => lower.includes(k))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Process one city
// ─────────────────────────────────────────────────────────────────────────────
async function processCity(citySlug) {
  const cfg = CITY_CONFIGS[citySlug]
  if (!cfg) {
    console.error(`Unknown city slug: ${citySlug}. Valid: ${Object.keys(CITY_CONFIGS).join(', ')}`)
    process.exit(1)
  }

  await mkdir(ASSET_DIR, { recursive: true })

  console.log(`\n=== Pexels fetch: ${citySlug} ===`)
  const seen = new Set()
  let registered = 0

  for (const query of cfg.queries) {
    console.log(`\n  Query: "${query}"`)
    try {
      const photos = await searchPexels(query, { perPage: 10 })
      console.log(`    ${photos.length} results`)

      for (const photo of photos) {
        if (seen.has(photo.id)) continue
        seen.add(photo.id)

        // Use src.large — good quality, not oversized
        const photoUrl = photo.src?.large || photo.src?.medium
        if (!photoUrl) {
          console.warn(`    Skipping ${photo.id}: no src.large URL`)
          continue
        }

        const destPath = resolve(ASSET_DIR, `${photo.id}.jpg`)
        try {
          await downloadPhoto(photoUrl, destPath)

          const altText = photo.alt || ''
          const subjectTags = extractSubjectTags(altText)

          const asset = await register(destPath, {
            type: 'photo',
            source: 'pexels',
            source_id: String(photo.id),
            license: 'pexels',
            license_metadata: {
              license_required: false,
              attribution_encouraged: true,
              pexels_terms: 'https://www.pexels.com/license/',
            },
            creator: photo.photographer || null,
            creator_url: photo.photographer_url || null,
            geo: cfg.geoTags,
            subject: subjectTags.length ? subjectTags : ['landscape'],
            search_query: query,
            width: photo.width || null,
            height: photo.height || null,
            approval: 'approved', // Pexels photos are free — auto-approve
          })

          registered++
          console.log(`    ✓ ${photo.id} (${photo.photographer}) registered as asset ${asset.id.slice(0, 8)}`)
        } catch (dlErr) {
          console.warn(`    Download failed for ${photo.id}: ${dlErr.message}`)
        }
      }
    } catch (searchErr) {
      console.warn(`  Search failed for "${query}": ${searchErr.message}`)
    }
  }

  console.log(`\n  Done: ${registered} Pexels photos registered for ${citySlug}.`)
  return registered
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
const cityArg = process.argv[2]
if (!cityArg) {
  console.error('Usage: node fetch-pexels.mjs <city>')
  console.error(`Cities: ${Object.keys(CITY_CONFIGS).join(', ')}`)
  process.exit(1)
}

await processCity(cityArg)
