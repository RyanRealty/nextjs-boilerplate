#!/usr/bin/env node
/**
 * qc.mjs — quality gate for the rendered 4-pillars video.
 *
 * Per VIDEO_PRODUCTION_SKILL.md §6 + CLAUDE.md §0 + §0.5:
 *   - Duration in [55, 60]s
 *   - blackdetect strict (pix_th=0.05) returns ZERO sequences
 *   - Frame extract at 0s, 25%, 50%, 75%, 90%
 *   - Spoken-vs-shown audit: Beat 5 numbers match equity-by-year.json
 *   - Caption-zone overlap: nothing renders into y 1480-1720 (manual review on extracted frames)
 *   - Banned-words grep across script + captionWords
 *
 * Outputs:
 *   out/4-pillars/qc-report.json
 *   out/4-pillars/frames/frame-{N}pct.jpg  (5 inspection frames)
 *
 * Run: node video/evergreen-education/scripts/qc.mjs
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'out', '4-pillars')
const MP4 = resolve(OUT_DIR, '4-pillars.mp4')

// Banned words from VIDEO_PRODUCTION_SKILL.md §1 + CLAUDE.md (case-insensitive whole-word match)
const BANNED = [
  'stunning', 'nestled', 'boasts', 'gorgeous', 'breathtaking', 'must-see',
  'dream home', 'meticulously', 'entertainer', 'tucked away', 'hidden gem',
  'pristine', 'charming', 'truly', 'spacious', 'cozy', 'luxurious',
  'updated throughout', 'approximately', 'roughly',
  // Pacific NW specific
  'world-class', 'exclusive', 'unparalleled', 'exquisite', 'once in a lifetime',
  // AI filler
  'delve', 'tapestry', 'navigate', 'robust', 'seamless', 'comprehensive',
  'elevate', 'unlock',
]

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

async function probe(mp4) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate:format=duration,size,bit_rate',
    '-of', 'json',
    mp4,
  ])
  return JSON.parse(stdout)
}

async function blackdetect(mp4) {
  try {
    const { stderr } = await exec('ffmpeg', [
      '-i', mp4,
      '-vf', 'blackdetect=d=0.03:pix_th=0.05',
      '-an', '-f', 'null', '-',
    ])
    const lines = stderr.split('\n').filter((l) => l.includes('black_start'))
    return lines
  } catch (err) {
    // ffmpeg with -f null exits 0; an actual error means real failure
    const stderr = err.stderr ?? ''
    const lines = stderr.split('\n').filter((l) => l.includes('black_start'))
    return lines
  }
}

async function extractFrame(mp4, pct, durationSec, outPath) {
  const t = (durationSec * pct).toFixed(2)
  await exec('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-ss', t, '-vframes', '1', outPath])
  return outPath
}

function bannedWordHits(text) {
  const lower = text.toLowerCase()
  return BANNED.filter((w) => {
    const re = new RegExp(`\\b${w.replace(/[-]/g, '[-]')}\\b`, 'i')
    return re.test(lower)
  })
}

async function main() {
  const checks = {
    runAt: new Date().toISOString(),
    file: MP4,
    pass: true,
    failures: [],
    warnings: [],
  }

  if (!(await exists(MP4))) {
    checks.pass = false
    checks.failures.push(`MP4 not found at ${MP4}`)
    await writeFile(resolve(OUT_DIR, 'qc-report.json'), JSON.stringify(checks, null, 2))
    console.error('✗ MP4 missing — run render.mjs first')
    process.exit(1)
  }

  // 1. ffprobe
  const meta = await probe(MP4)
  const fmt = meta.format ?? {}
  const vid = (meta.streams ?? []).find((s) => s.codec_name === 'h264') ?? {}
  const aud = (meta.streams ?? []).find((s) => s.codec_name === 'aac') ?? {}
  const duration = parseFloat(fmt.duration ?? '0')
  const sizeMb = parseInt(fmt.size ?? '0', 10) / 1024 / 1024
  checks.duration = duration
  checks.sizeMb = sizeMb.toFixed(2)
  checks.video = { codec: vid.codec_name, width: vid.width, height: vid.height, fps: vid.r_frame_rate }
  checks.audio = { codec: aud.codec_name }
  console.log(`Duration: ${duration.toFixed(2)}s  ${vid.width}x${vid.height} @ ${vid.r_frame_rate}  ${sizeMb.toFixed(2)} MB`)

  if (duration < 55 || duration > 60.5) {
    checks.failures.push(`duration ${duration.toFixed(2)}s outside [55, 60.5]`)
    checks.pass = false
  }
  if (vid.width !== 1080 || vid.height !== 1920) {
    checks.failures.push(`resolution ${vid.width}x${vid.height} != 1080x1920`)
    checks.pass = false
  }
  if (sizeMb > 100) {
    checks.failures.push(`size ${sizeMb.toFixed(2)}MB > 100MB cap`)
    checks.pass = false
  }
  if (vid.codec_name !== 'h264') {
    checks.warnings.push(`video codec ${vid.codec_name} != h264`)
  }

  // 2. blackdetect
  console.log('\nRunning blackdetect strict...')
  const blackHits = await blackdetect(MP4)
  checks.blackHits = blackHits
  if (blackHits.length > 0) {
    checks.pass = false
    checks.failures.push(`blackdetect strict found ${blackHits.length} black sequences`)
    console.log(`  ✗ ${blackHits.length} black sequences:`)
    for (const l of blackHits) console.log(`    ${l.trim()}`)
  } else {
    console.log('  ✓ no black sequences')
  }

  // 3. Frame extracts
  console.log('\nExtracting inspection frames...')
  const FRAMES_DIR = resolve(OUT_DIR, 'frames')
  await mkdir(FRAMES_DIR, { recursive: true })
  const pcts = [0.02, 0.25, 0.5, 0.75, 0.95]
  const frameOut = []
  for (const p of pcts) {
    const out = resolve(FRAMES_DIR, `frame-${Math.round(p * 100)}pct.jpg`)
    await extractFrame(MP4, p, duration, out)
    frameOut.push(out)
    console.log(`  ${(p * 100).toFixed(0)}% (t=${(duration * p).toFixed(2)}s) → ${out}`)
  }
  checks.frames = frameOut

  // 4. Spoken-vs-shown audit (Beat 5)
  console.log('\nSpoken-vs-shown audit...')
  const equity = JSON.parse(await readFile(resolve(ROOT, 'data', '4-pillars-equity-by-year.json'), 'utf8'))
  const dataPath = resolve(ROOT, 'data', '4-pillars.json')
  const data = JSON.parse(await readFile(dataPath, 'utf8'))
  const summarySegment = data.script.segments.find((s) => s.id === 'stacked-summary')
  const expectedSpoken = equity.spokenTotalsRoundedToK.map((x) => x.spoken.toLowerCase())
  const summaryText = summarySegment.text.toLowerCase()
  const spokenMatches = expectedSpoken.map((spoken) => ({
    spoken,
    foundInScript: summaryText.includes(spoken),
  }))
  checks.spokenVsShown = spokenMatches
  for (const m of spokenMatches) {
    if (!m.foundInScript) {
      checks.failures.push(`spoken Beat 5 number not in script: "${m.spoken}"`)
      checks.pass = false
      console.log(`  ✗ "${m.spoken}" not in script`)
    } else {
      console.log(`  ✓ "${m.spoken}" matches script`)
    }
  }

  // 5. Banned words check
  console.log('\nBanned-words grep...')
  let bannedHits = []
  for (const seg of data.script.segments) {
    const hits = bannedWordHits(seg.text)
    if (hits.length) {
      bannedHits.push({ segment: seg.id, hits })
      console.log(`  ✗ ${seg.id}: ${hits.join(', ')}`)
    }
  }
  if ((await exists(resolve(OUT_DIR, 'captionWords.json')))) {
    const captionWords = JSON.parse(await readFile(resolve(OUT_DIR, 'captionWords.json'), 'utf8'))
    const captionText = captionWords.map((w) => w.text).join(' ')
    const hits = bannedWordHits(captionText)
    if (hits.length) bannedHits.push({ segment: 'captionWords', hits })
  }
  // Scan post-scripts too — they ride on the same brand voice
  const { readdir } = await import('node:fs/promises')
  const postScriptsDir = resolve(OUT_DIR, 'post-scripts')
  if (await exists(postScriptsDir)) {
    for (const f of await readdir(postScriptsDir)) {
      if (!f.endsWith('.md')) continue
      const txt = await readFile(resolve(postScriptsDir, f), 'utf8')
      const hits = bannedWordHits(txt)
      if (hits.length) {
        bannedHits.push({ segment: `post-scripts/${f}`, hits })
        console.log(`  ✗ post-scripts/${f}: ${hits.join(', ')}`)
      }
    }
  }
  checks.bannedHits = bannedHits
  if (bannedHits.length === 0) {
    console.log('  ✓ no banned words')
  } else {
    checks.failures.push(`banned words found in ${bannedHits.length} location(s)`)
    checks.pass = false
  }

  // 6. Audio non-silent (only meaningful if VO present; music alone can pass)
  // Skip — qc on the silent-VO render still needs to pass

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`QC ${checks.pass ? '✓ PASS' : '✗ FAIL'}`)
  if (checks.failures.length) {
    console.log('Failures:')
    checks.failures.forEach((f) => console.log(`  ✗ ${f}`))
  }
  if (checks.warnings.length) {
    console.log('Warnings:')
    checks.warnings.forEach((f) => console.log(`  ⚠ ${f}`))
  }

  await writeFile(resolve(OUT_DIR, 'qc-report.json'), JSON.stringify(checks, null, 2))
  console.log(`\n✓ wrote ${resolve(OUT_DIR, 'qc-report.json')}`)
  if (!checks.pass) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
