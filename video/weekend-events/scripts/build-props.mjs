#!/usr/bin/env node
// Build out/<SLUG>/props.json from data/<SLUG>/{events,images,script}.json.
//
// Inputs (committed source-of-truth):
//   data/<SLUG>/events.json   — { slug, weekend_window, intro, events[], outro }
//   data/<SLUG>/images.json   — query specs + attribution rules
//   data/<SLUG>/script.json   — { fullText, beatSentences, ... }
//
// Output (gitignored, working file):
//   out/<SLUG>/props.json     — shape per src/VideoProps.ts (extended later
//                               by fetch-images.mjs and synth-vo.mjs)
//
// Usage:
//   node scripts/build-props.mjs
//   SLUG=weekend-events-2026-05 node scripts/build-props.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SLUG     = process.env.SLUG || 'weekend-events-2026-05'
const DATA_DIR = resolve(ROOT, 'data', SLUG)
const OUT_DIR  = resolve(ROOT, 'out',  SLUG)

await mkdir(OUT_DIR, { recursive: true })

const events  = JSON.parse(await readFile(resolve(DATA_DIR, 'events.json'),  'utf8'))
const images  = JSON.parse(await readFile(resolve(DATA_DIR, 'images.json'),  'utf8'))
const script  = JSON.parse(await readFile(resolve(DATA_DIR, 'script.json'),  'utf8'))

// Map each event in events.events[] → EventData per src/VideoProps.ts.
// VideoProps.EventData fields: slug, title, date_time, venue, description, photo_credit.
const eventCards = events.events.map((e) => {
  const dateTime = [e.date_label, e.time_label].filter(Boolean).join(' · ')
  const venue    = [e.venue, e.city].filter(Boolean).join(' · ')
  // Find matching image query (by event_id) for description fallback.
  const imgQuery = images.image_search_queries?.find(q => q.event_id === e.id)
  return {
    slug:         e.id,                                    // used for image filename
    title:        e.title,
    date_time:    dateTime,
    venue,
    description:  imgQuery?.notes ?? '',
    photo_credit: '',                                      // filled by fetch-images.mjs
  }
})

// Default beatDurations placeholder (intro 3.0s + 5×5s + outro 2.5s = 30.5s).
// synth-vo.mjs overwrites with real VO-aligned durations.
const placeholderBeatDurations = [3.0, 5.0, 5.0, 5.0, 5.0, 5.0, 2.5]

const props = {
  events:        eventCards,
  voPath:        '',                                      // filled by synth-vo.mjs
  captionWords:  [],                                      // filled by synth-vo.mjs
  beatDurations: placeholderBeatDurations,
  aspect:        '9x16',                                  // overridden per-render by Root.tsx
  dateline:      events.intro?.dateline ?? '',
  outroCta:      [events.outro?.headline, events.outro?.sub].filter(Boolean).join(' · '),
  introTitle: {
    line1:   events.intro?.title_l1 ?? '',
    line2:   events.intro?.title_l2 ?? '',
    tagline: events.intro?.tagline  ?? '',
  },
  meta: {
    slug:    events.slug,
    city:    events.city,
    weekend: events.weekend_window,
    voice_id: script.voice_id,
    voice_settings: script.voice_settings,
  },
}

await writeFile(resolve(OUT_DIR, 'props.json'), JSON.stringify(props, null, 2))
console.log(`Wrote ${resolve(OUT_DIR, 'props.json')}`)
console.log(`  ${eventCards.length} events`)
console.log(`  dateline: ${props.dateline}`)
console.log(`  outroCta: ${props.outroCta}`)
console.log(`Next: node scripts/fetch-images.mjs`)
