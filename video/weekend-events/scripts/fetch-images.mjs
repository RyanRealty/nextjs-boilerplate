#!/usr/bin/env node
// Fetch one background image per event from Unsplash.
// Reads: out/weekend-events-<slug>/events.json  (array of EventData)
// Writes: public/images/<event.slug>.jpg
//         out/weekend-events-<slug>/images.json  (photographer credits)
//
// Usage:
//   node scripts/fetch-images.mjs
//   SLUG=weekend-events-2026-05 node scripts/fetch-images.mjs
//
// Requires UNSPLASH_ACCESS_KEY in env.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const KEY = process.env.UNSPLASH_ACCESS_KEY
if (!KEY) { console.error('Missing UNSPLASH_ACCESS_KEY'); process.exit(1) }

const SLUG = process.env.SLUG || 'weekend-events-2026-05'
const OUT_DIR = resolve(ROOT, 'out', SLUG)
const PUB_IMAGES = resolve(ROOT, 'public', 'images')

await mkdir(PUB_IMAGES, { recursive: true })
await mkdir(OUT_DIR, { recursive: true })

const eventsPath = resolve(OUT_DIR, 'events.json')
let events
try {
  events = JSON.parse(await readFile(eventsPath, 'utf8'))
} catch {
  console.error(`Missing ${eventsPath} — create this file with your EventData array first.`)
  process.exit(1)
}

const imagesMeta = []

for (const event of events) {
  const query = encodeURIComponent(event.unsplash_query || event.title)
  const url = `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=3&order_by=relevant`
  console.log(`\n[${event.slug}] Querying Unsplash: ${decodeURIComponent(query)}`)

  let body
  try {
    const { stdout } = await exec('curl', [
      '-sS',
      '-H', `Authorization: Client-ID ${KEY}`,
      url,
    ])
    body = JSON.parse(stdout)
  } catch (e) {
    console.error(`  Unsplash request failed: ${e.message}`)
    continue
  }

  const results = body.results || []
  if (!results.length) {
    console.warn(`  No results for "${decodeURIComponent(query)}" — skipping`)
    continue
  }

  // Pick first result.
  const photo = results[0]
  const downloadUrl = photo.urls?.regular
  if (!downloadUrl) {
    console.warn(`  No regular URL — skipping`)
    continue
  }

  const outFile = resolve(PUB_IMAGES, `${event.slug}.jpg`)
  console.log(`  Downloading ${downloadUrl.slice(0, 80)}...`)
  try {
    await exec('curl', ['-sS', '-L', '-o', outFile, downloadUrl])
    console.log(`  Saved → ${outFile}`)
  } catch (e) {
    console.error(`  Download failed: ${e.message}`)
    continue
  }

  // Trigger Unsplash download endpoint (required by API guidelines).
  const dlLink = photo.links?.download_location
  if (dlLink) {
    try {
      await exec('curl', ['-sS', '-H', `Authorization: Client-ID ${KEY}`, dlLink])
    } catch { /* non-fatal */ }
  }

  const meta = {
    slug: event.slug,
    unsplash_id: photo.id,
    photographer: photo.user?.name ?? 'Unknown',
    photographer_url: photo.user?.links?.html ?? '',
    photo_credit: `Photo: ${photo.user?.name ?? 'Unsplash'}`,
    url: downloadUrl,
    file: `public/images/${event.slug}.jpg`,
  }
  imagesMeta.push(meta)

  // Update event.photo_credit with actual photographer name.
  event.photo_credit = meta.photo_credit
  console.log(`  Credit: ${meta.photo_credit}`)
}

await writeFile(resolve(OUT_DIR, 'images.json'), JSON.stringify(imagesMeta, null, 2))
// Write back events.json with updated photo_credit fields.
await writeFile(eventsPath, JSON.stringify(events, null, 2))
console.log(`\nDone. ${imagesMeta.length} images fetched.`)
console.log(`images.json written to ${resolve(OUT_DIR, 'images.json')}`)
console.log(`events.json updated with photo_credit fields.`)
