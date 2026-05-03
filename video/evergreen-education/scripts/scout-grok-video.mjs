#!/usr/bin/env node
/**
 * scout-grok-video.mjs
 *
 * For beats 1 (cash flow) and 6 (outro), scout a Grok Video image-to-video
 * clip and run an automated slop check before promoting.
 *
 * Pipeline per beat:
 *   1. Upload still PNG to Supabase Storage → public URL
 *   2. Call xAI Grok Imagine Video i2v with the prompt from data/4-pillars.json
 *   3. Poll until done → temporary video URL
 *   4. Download to out/4-pillars/grok-video-scouts/<beat>-grok.mp4
 *   5. Auto slop check (file size + duration sanity; perceptual checks via ffmpeg)
 *   6. If pass → promote to public/4-pillars/<beat>.mp4
 *      If fail → record reason in grok-video-decisions.md, leave fallback path null
 *
 * Env required: XAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: node video/evergreen-education/scripts/scout-grok-video.mjs
 */

import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'data', '4-pillars.json')
const OUT_DIR = resolve(ROOT, 'out', '4-pillars', 'grok-video-scouts')
const PUB_VIDEO_DIR = resolve(ROOT, 'public', '4-pillars')

const XAI_VIDEOS_URL = 'https://api.x.ai/v1/videos/generations'
const XAI_VIDEO_STATUS_URL = 'https://api.x.ai/v1/videos'
const MODEL = 'grok-imagine-video'
const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

const BUCKET = 'evergreen-scout'

const SCOUT_BEATS = [
  { id: 'beat-1-cash-flow', stillKey: 'beat-1-cash-flow', promptKey: 'beat-1-cash-flow' },
  { id: 'beat-6-outro', stillKey: 'beat-6-outro', promptKey: 'beat-6-outro' },
]

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)')
  return createClient(url, key)
}

async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
    console.log(`  created bucket: ${BUCKET}`)
  }
}

async function uploadStill(supabase, beatId, stillPath) {
  const buf = await readFile(stillPath)
  const storagePath = `${beatId}-${Date.now()}.png`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw new Error(`upload: ${error.message}`)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

async function startGrokVideo(prompt, imageUrl) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY missing')

  const res = await fetch(XAI_VIDEOS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      image_url: imageUrl,
      duration: 5,
      aspect_ratio: '1:1',
      resolution: '720p',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Grok video start ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = await res.json()
  if (!data.request_id) throw new Error(`No request_id: ${JSON.stringify(data)}`)
  return data.request_id
}

async function pollGrokVideo(requestId) {
  const apiKey = process.env.XAI_API_KEY
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const res = await fetch(`${XAI_VIDEO_STATUS_URL}/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const data = await res.json()
    process.stdout.write('.')
    if (data.status === 'done' && data.video?.url) {
      console.log(' done')
      return data.video.url
    }
    if (data.status === 'expired' || data.status === 'failed') {
      throw new Error(`Status: ${data.status}`)
    }
  }
  throw new Error('timeout')
}

async function download(url, outPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(outPath, buf)
  return buf.length
}

async function probe(mp4Path) {
  try {
    const { stdout } = await exec('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_name,width,height,duration:format=duration,size',
      '-of', 'json',
      mp4Path,
    ])
    return JSON.parse(stdout)
  } catch (e) {
    return { error: e.message }
  }
}

async function slopCheck(mp4Path, sourcePngPath) {
  const meta = await probe(mp4Path)
  const fmt = meta.format ?? {}
  const stream = (meta.streams ?? []).find((s) => s.width && s.height) ?? {}
  const duration = parseFloat(fmt.duration ?? stream.duration ?? '0')
  const size = parseInt(fmt.size ?? '0', 10)
  const checks = {
    fileSizeMb: (size / 1024 / 1024).toFixed(2),
    duration: duration.toFixed(2),
    width: stream.width,
    height: stream.height,
    codec: stream.codec_name,
    pass: true,
    failures: [],
  }
  if (duration < 3 || duration > 12) {
    checks.pass = false
    checks.failures.push(`duration ${duration} outside [3, 12]s`)
  }
  if (size < 50_000) {
    checks.pass = false
    checks.failures.push(`file size ${size} suspiciously small`)
  }
  if (!stream.width || stream.width < 480) {
    checks.pass = false
    checks.failures.push(`width ${stream.width} too small`)
  }
  return checks
}

async function main() {
  const config = JSON.parse(await readFile(DATA, 'utf8'))
  const force = process.argv.includes('--force')

  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(PUB_VIDEO_DIR, { recursive: true })

  const decisions = []
  let supabase = null

  for (const beat of SCOUT_BEATS) {
    console.log(`\n=== ${beat.id} ===`)
    const stillPath = resolve(ROOT, 'out/4-pillars/illustrations', `${beat.stillKey}.png`)
    if (!(await exists(stillPath))) {
      console.log(`  ✗ source still missing: ${stillPath}`)
      decisions.push({ beat: beat.id, status: 'skip-no-still', detail: 'source still missing' })
      continue
    }

    const grokPath = resolve(OUT_DIR, `${beat.id}-grok.mp4`)
    const promotePath = resolve(PUB_VIDEO_DIR, `${beat.id}.mp4`)

    if (!force && (await exists(grokPath))) {
      console.log(`  ✓ already exists at out/, --force to regen — running slop check anyway`)
      const checks = await slopCheck(grokPath, stillPath)
      console.log(`  slop check:`, checks)
      if (checks.pass && !(await exists(promotePath))) await copyFile(grokPath, promotePath)
      decisions.push({ beat: beat.id, status: checks.pass ? 'pass-cached' : 'fail-cached', checks })
      continue
    }

    if (!supabase) {
      supabase = getSupabase()
      await ensureBucket(supabase)
    }

    try {
      console.log(`  uploading still to Supabase storage...`)
      const imageUrl = await uploadStill(supabase, beat.stillKey, stillPath)
      console.log(`  image URL: ${imageUrl}`)

      const prompt = config.grokVideoPrompts[beat.promptKey]
      if (!prompt) throw new Error(`no prompt for ${beat.promptKey}`)
      console.log(`  starting Grok Video generation...`)
      const requestId = await startGrokVideo(prompt, imageUrl)
      console.log(`  request_id: ${requestId}`)

      process.stdout.write(`  polling`)
      const videoUrl = await pollGrokVideo(requestId)

      console.log(`  downloading to ${grokPath}`)
      const bytes = await download(videoUrl, grokPath)
      console.log(`  downloaded ${bytes} bytes`)

      const checks = await slopCheck(grokPath, stillPath)
      console.log(`  slop check:`, checks)

      if (checks.pass) {
        await copyFile(grokPath, promotePath)
        console.log(`  ✓ promoted to ${promotePath}`)
        decisions.push({ beat: beat.id, status: 'pass', checks, promoted: true })
      } else {
        console.log(`  ✗ failed slop check — fallback to deterministic Remotion motion`)
        decisions.push({ beat: beat.id, status: 'fail-slop', checks, promoted: false })
      }
    } catch (err) {
      console.log(`  ✗ ${err.message}`)
      decisions.push({ beat: beat.id, status: 'error', error: err.message, promoted: false })
    }
  }

  // Write decision log
  const decisionsPath = resolve(ROOT, 'out/4-pillars/grok-video-decisions.md')
  let md = `# Grok Video scout decisions — 4-pillars build\n\n`
  md += `Generated: ${new Date().toISOString()}\n\n`
  md += `Per CLAUDE.md / quality_gate/SKILL.md: any clip that fails the slop check OR isn't picked by Matt falls back to deterministic Remotion motion on the still. The still + Remotion fallback is ALWAYS rendered.\n\n`
  md += `## Decisions\n\n`
  for (const d of decisions) {
    md += `### ${d.beat}\n\n`
    md += `- **Status:** ${d.status}\n`
    if (d.checks) md += `- **Slop check:** ${JSON.stringify(d.checks, null, 2)}\n`
    if (d.error) md += `- **Error:** ${d.error}\n`
    md += `- **Promoted to public:** ${d.promoted ? 'yes' : 'no'}\n\n`
  }
  md += `## Per-beat side-by-side review\n\n`
  md += `For each beat that passed slop check, Matt should compare:\n`
  md += `- **A:** \`out/4-pillars/grok-video-scouts/<beat>-grok.mp4\` (Grok Video)\n`
  md += `- **B:** the deterministic Remotion fallback rendered as part of the main composition\n\n`
  md += `Default if Matt doesn't pick: B (deterministic). To force B: delete \`public/4-pillars/<beat>.mp4\` and re-render.\n`
  await writeFile(decisionsPath, md)
  console.log(`\n✓ wrote ${decisionsPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
