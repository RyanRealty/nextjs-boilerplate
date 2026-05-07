#!/usr/bin/env node
/**
 * Fetch Shutterstock PREVIEW images for a city and register them in the
 * Ryan Realty asset library.
 *
 * ⚠️  DEV MODE: Shutterstock previews are watermarked. License before
 *     production use. Do NOT call /v2/images/licenses in this script —
 *     that would charge the account. We only download the free preview
 *     JPGs (visible watermark) for development and scouting purposes.
 *
 * Auth: Basic <base64(SHUTTERSTOCK_API_KEY:SHUTTERSTOCK_API_SECRET)>
 * Endpoint: https://api.shutterstock.com/v2/images/search
 *
 * Run:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/fetch-shutterstock.mjs <city>
 *
 * Output: public/asset-library/photos/shutterstock/<id>.jpg
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
const ASSET_DIR = resolve(ROOT, 'public', 'asset-library', 'photos', 'shutterstock')

// Load asset-library from repo root
const { register } = await import('../../../lib/asset-library.mjs')

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

console.warn('\n⚠️  DEV MODE: Shutterstock previews are watermarked.')
console.warn('    License assets via /v2/images/licenses before using in production.\n')

// ─────────────────────────────────────────────────────────────────────────────
//  Shutterstock search (re-implemented inline — avoids TS/Next.js import)
// ─────────────────────────────────────────────────────────────────────────────
const SSTK_API = 'https://api.shutterstock.com'

async function searchShutterstock(query, { perPage = 10, page = 1 } = {}) {
  const q = encodeURIComponent(query)
  const url = `${SSTK_API}/v2/images/search?query=${q}&per_page=${perPage}&page=${page}&orientation=vertical&image_type=photo`
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
    if (e.message.includes('401') || e.message.includes('Unauthorized')) {
      console.error('  Shutterstock auth failure — check SHUTTERSTOCK_API_KEY / SHUTTERSTOCK_API_SECRET')
    } else if (e.message.includes('429') || e.message.includes('rate limit')) {
      console.warn('  Shutterstock rate limit hit — sleeping 30s then retrying')
      await new Promise(r => setTimeout(r, 30_000))
      return searchShutterstock(query, { perPage, page })
    }
    throw e
  }
}

async function downloadPreview(url, destPath) {
  if (existsSync(destPath)) {
    console.log(`    Already downloaded: ${destPath}`)
    return
  }
  await exec('curl', ['-sS', '-m', '60', '--connect-timeout', '15', '-L', '-o', destPath, url], {
    maxBuffer: 32 * 1024 * 1024,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  City configs — mirrors fetch-unsplash queries
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
function extractSubjectTags(description) {
  if (!description) return []
  const keywords = [
    'mountain', 'river', 'forest', 'lake', 'sunset', 'sky', 'snow', 'downtown',
    'house', 'home', 'landscape', 'outdoor', 'nature', 'trail', 'park', 'aerial',
    'architecture', 'street', 'neighborhood', 'desert', 'pine', 'waterfall',
  ]
  const lower = description.toLowerCase()
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

  console.log(`\n=== Shutterstock fetch: ${citySlug} ===`)
  const seen = new Set()
  let registered = 0

  for (const query of cfg.queries) {
    console.log(`\n  Query: "${query}"`)
    try {
      const results = await searchShutterstock(query, { perPage: 10 })
      console.log(`    ${results.length} results`)

      for (const hit of results) {
        if (seen.has(hit.id)) continue
        seen.add(hit.id)

        // Preview URL — assets.preview is the watermarked preview
        const previewUrl = hit.assets?.preview?.url || hit.assets?.small_thumb?.url
        if (!previewUrl) {
          console.warn(`    Skipping ${hit.id}: no preview URL`)
          continue
        }

        const destPath = resolve(ASSET_DIR, `${hit.id}.jpg`)
        try {
          await downloadPreview(previewUrl, destPath)

          // Contributor info
          const creator = hit.contributor?.id
            ? `Shutterstock contributor ${hit.contributor.id}`
            : null
          const description = (hit.description || '').slice(0, 200)
          const subjectTags = extractSubjectTags(description)

          const asset = await register(destPath, {
            type: 'photo',
            source: 'shutterstock',
            source_id: String(hit.id),
            license: 'shutterstock',
            license_metadata: {
              license_required: true,
              preview_only: true,
              preview_watermarked: true,
              note: 'Call /v2/images/licenses before production use.',
            },
            creator,
            geo: cfg.geoTags,
            subject: subjectTags.length ? subjectTags : ['landscape'],
            search_query: query,
            width: hit.assets?.preview?.width || null,
            height: hit.assets?.preview?.height || null,
            approval: 'intake', // previews start as intake; promote to approved after licensing
          })

          registered++
          console.log(`    ✓ ${hit.id} registered as asset ${asset.id.slice(0, 8)}`)
        } catch (dlErr) {
          console.warn(`    Download failed for ${hit.id}: ${dlErr.message}`)
        }
      }
    } catch (searchErr) {
      console.warn(`  Search failed for "${query}": ${searchErr.message}`)
    }
  }

  console.log(`\n  Done: ${registered} Shutterstock previews registered for ${citySlug}.`)
  console.warn(`  ⚠️  These are watermarked previews. License before production use.`)
  return registered
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
const cityArg = process.argv[2]
if (!cityArg) {
  console.error('Usage: node fetch-shutterstock.mjs <city>')
  console.error(`Cities: ${Object.keys(CITY_CONFIGS).join(', ')}`)
  process.exit(1)
}

await processCity(cityArg)
