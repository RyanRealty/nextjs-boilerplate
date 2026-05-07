#!/usr/bin/env node
// Post-approval publish script.
// Uploads each aspect to Supabase Storage then calls /api/social/publish
// for each platform with the correct aspect ratio.
//
// Platform → aspect mapping (per CLAUDE.md):
//   IG Reels       → 9x16
//   IG Feed        → 4x5
//   FB Reels       → 9x16
//   FB Feed        → 1x1
//   YouTube        → 16x9
//   YouTube Shorts → 9x16
//   TikTok         → 9x16
//   LinkedIn       → 1x1
//   Pinterest      → 2x3
//   X              → 16x9
//   Threads        → 9x16
//
// Run ONLY after Matt has explicitly approved the renders.
// Usage:
//   SLUG=weekend-events-2026-05 node --env-file=... scripts/publish.mjs

import { readFile, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SLUG            = process.env.SLUG || 'weekend-events-2026-05'
const SUPABASE_URL    = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL        = process.env.NEXT_PUBLIC_SITE_URL || 'https://ryan-realty.com'

if (!SUPABASE_URL) { console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// Platform → aspect mapping.
const PLATFORM_ASPECT = [
  { platform: 'instagram_reels',   aspect: '9x16' },
  { platform: 'instagram_feed',    aspect: '4x5'  },
  { platform: 'facebook_reels',    aspect: '9x16' },
  { platform: 'facebook_feed',     aspect: '1x1'  },
  { platform: 'youtube',           aspect: '16x9' },
  { platform: 'youtube_shorts',    aspect: '9x16' },
  { platform: 'tiktok',            aspect: '9x16' },
  { platform: 'linkedin',          aspect: '1x1'  },
  { platform: 'pinterest',         aspect: '2x3'  },
  { platform: 'x',                 aspect: '16x9' },
  { platform: 'threads',           aspect: '9x16' },
]

const exists = async (p) => { try { await access(p); return true } catch { return false } }

// Load props for caption / title metadata.
const propsPath = resolve(ROOT, 'out', SLUG, 'props.json')
let props = {}
try { props = JSON.parse(await readFile(propsPath, 'utf8')) } catch { console.warn('props.json not found') }

const caption = [
  `This Weekend in Bend — ${props.dateline ?? SLUG}`,
  '',
  (props.events || []).map(e => `• ${e.title} — ${e.date_time} at ${e.venue}`).join('\n'),
  '',
  `More at visitbend.com/events`,
].join('\n')

// Deduplicate uploads: each unique aspect is uploaded once.
const uploadedUrls = {}

for (const { platform, aspect } of PLATFORM_ASPECT) {
  const file = resolve(ROOT, 'out', aspect, `weekend_events_${SLUG}.mp4`)
  if (!await exists(file)) {
    console.warn(`Missing render for ${aspect} — skipping ${platform}`)
    continue
  }

  // Upload if not already done for this aspect.
  if (!uploadedUrls[aspect]) {
    const storagePath = `weekend-events/${SLUG}/${aspect}.mp4`
    console.log(`\nUploading ${aspect} to Supabase Storage...`)
    const { stdout } = await exec('curl', [
      '-sS', '-X', 'POST',
      `${SUPABASE_URL}/storage/v1/object/videos/${storagePath}`,
      '-H', `Authorization: Bearer ${SUPABASE_KEY}`,
      '-H', 'Content-Type: video/mp4',
      '--data-binary', `@${file}`,
    ])
    let result
    try { result = JSON.parse(stdout) } catch { result = { error: stdout } }
    if (result.error) {
      console.error(`  Upload failed: ${JSON.stringify(result.error)}`)
      continue
    }
    uploadedUrls[aspect] = `${SUPABASE_URL}/storage/v1/object/public/videos/${storagePath}`
    console.log(`  Uploaded → ${uploadedUrls[aspect]}`)
  }

  const publicUrl = uploadedUrls[aspect]
  console.log(`\nPublishing ${platform} (${aspect})...`)

  // Call the platform publish API.
  const payload = JSON.stringify({
    platform,
    video_url: publicUrl,
    caption,
    aspect,
    slug: SLUG,
  })
  const { stdout: apiOut } = await exec('curl', [
    '-sS', '-X', 'POST',
    `${SITE_URL}/api/social/publish`,
    '-H', 'Content-Type: application/json',
    '-d', payload,
  ])
  let apiResult
  try { apiResult = JSON.parse(apiOut) } catch { apiResult = { raw: apiOut } }
  console.log(`  ${platform}: ${JSON.stringify(apiResult)}`)
}

console.log('\nPublish complete.')
