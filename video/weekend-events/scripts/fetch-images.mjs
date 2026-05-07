#!/usr/bin/env node
// Fetch one Unsplash background image per event + the intro card image.
// Reads:
//   out/<SLUG>/props.json   — built by build-props.mjs (events array)
//   data/<SLUG>/images.json — rich query specs (primary_query, fallbacks, etc.)
// Writes:
//   public/images/<event.slug>.jpg
//   public/images/intro_card.jpg
//   out/<SLUG>/props.json   — updated with photo_credit per event
//   out/<SLUG>/images.fetched.json — full attribution manifest
//
// Requires UNSPLASH_ACCESS_KEY in env.
//
// Usage:
//   SLUG=weekend-events-2026-05 node scripts/fetch-images.mjs

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

const SLUG       = process.env.SLUG || 'weekend-events-2026-05'
const DATA_DIR   = resolve(ROOT, 'data', SLUG)
const OUT_DIR    = resolve(ROOT, 'out', SLUG)
const PUB_IMAGES = resolve(ROOT, 'public', 'images')

await mkdir(PUB_IMAGES, { recursive: true })
await mkdir(OUT_DIR,    { recursive: true })

const propsPath = resolve(OUT_DIR, 'props.json')
let props
try {
  props = JSON.parse(await readFile(propsPath, 'utf8'))
} catch {
  console.error(`Missing ${propsPath} — run 'node scripts/build-props.mjs' first.`)
  process.exit(1)
}

const imagesSpec = JSON.parse(await readFile(resolve(DATA_DIR, 'images.json'), 'utf8'))

function unsplashSearchUrl(query, opts = {}) {
  const params = new URLSearchParams({
    query,
    orientation: opts.orientation || 'landscape',
    per_page: '5',
    order_by: 'relevant',
  })
  return `https://api.unsplash.com/search/photos?${params}`
}

async function unsplashSearch(query, opts) {
  const url = unsplashSearchUrl(query, opts)
  const { stdout } = await exec('curl', [
    '-sS', '-m', '30',
    '-H', `Authorization: Client-ID ${KEY}`,
    url,
  ], { maxBuffer: 16 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function pickPhoto(spec) {
  const queries = [spec.primary_query, ...(spec.fallback_queries || [])]
  for (const q of queries) {
    console.log(`  query: "${q}"`)
    const body = await unsplashSearch(q, { orientation: spec.orientation || 'landscape' })
    const results = body.results || []
    // Reject results matching rejection_keywords.
    const filtered = results.filter((r) => {
      const txt = `${r.alt_description || ''} ${r.description || ''}`.toLowerCase()
      return !(spec.rejection_keywords || []).some(kw => txt.includes(kw.toLowerCase()))
    })
    const candidates = filtered.length ? filtered : results
    if (candidates.length) return candidates[0]
  }
  return null
}

async function downloadPhoto(photo, outFile) {
  const url = photo.urls?.regular
  if (!url) throw new Error('no regular url')
  await exec('curl', ['-sS', '-L', '-o', outFile, '-m', '60', url])
  // Trigger Unsplash download endpoint (required by API guidelines).
  const dl = photo.links?.download_location
  if (dl) {
    try { await exec('curl', ['-sS', '-m', '15', '-H', `Authorization: Client-ID ${KEY}`, dl]) } catch { /* non-fatal */ }
  }
}

const fetched = []

// Per-event images.
for (let i = 0; i < props.events.length; i++) {
  const ev = props.events[i]
  const spec = (imagesSpec.image_search_queries || []).find(s => s.event_id === ev.slug)
  if (!spec) {
    console.warn(`No image query spec for event ${ev.slug} — skipping`)
    continue
  }
  console.log(`\n[${ev.slug}] ${ev.title}`)
  const photo = await pickPhoto(spec)
  if (!photo) {
    console.warn(`  no usable result — leaving photo_credit empty`)
    continue
  }
  const outFile = resolve(PUB_IMAGES, `${ev.slug}.jpg`)
  console.log(`  downloading ${photo.id}`)
  await downloadPhoto(photo, outFile)
  const photographer = photo.user?.name ?? 'Unsplash'
  const profileUrl   = photo.user?.links?.html ? `${photo.user.links.html}?utm_source=ryan_realty&utm_medium=referral` : ''
  ev.photo_credit = `Photo: ${photographer} / Unsplash`
  fetched.push({
    event_id:        ev.slug,
    file:            `public/images/${ev.slug}.jpg`,
    unsplash_id:     photo.id,
    photographer,
    photographer_url: profileUrl,
    unsplash_url:    photo.links?.html ? `${photo.links.html}?utm_source=ryan_realty&utm_medium=referral` : '',
    credit_pill:     ev.photo_credit,
    downloaded_at_iso: new Date().toISOString(),
  })
  console.log(`  credit: ${ev.photo_credit}`)
}

// Intro card image.
if (imagesSpec.intro_card_image) {
  console.log(`\n[intro_card]`)
  const photo = await pickPhoto(imagesSpec.intro_card_image)
  if (photo) {
    const outFile = resolve(PUB_IMAGES, `intro_card.jpg`)
    await downloadPhoto(photo, outFile)
    const photographer = photo.user?.name ?? 'Unsplash'
    fetched.push({
      event_id:        'intro_card',
      file:            'public/images/intro_card.jpg',
      unsplash_id:     photo.id,
      photographer,
      photographer_url: photo.user?.links?.html ? `${photo.user.links.html}?utm_source=ryan_realty&utm_medium=referral` : '',
      unsplash_url:    photo.links?.html ? `${photo.links.html}?utm_source=ryan_realty&utm_medium=referral` : '',
      credit_pill:     `Photo: ${photographer} / Unsplash`,
      downloaded_at_iso: new Date().toISOString(),
    })
    props.introCardCredit = `Photo: ${photographer} / Unsplash`
    console.log(`  credit: ${props.introCardCredit}`)
  } else {
    console.warn('  no intro card image — comp will use solid navy gradient fallback')
  }
}

// Persist updated props + full fetched manifest.
await writeFile(propsPath, JSON.stringify(props, null, 2))
await writeFile(resolve(OUT_DIR, 'images.fetched.json'), JSON.stringify({ slug: SLUG, fetched }, null, 2))
console.log(`\nDone. ${fetched.length} images fetched.`)
console.log(`Next: node --env-file=.env.local scripts/synth-vo.mjs`)
