#!/usr/bin/env node
/**
 * render-youtube-long.mjs — End-to-end runner for the YouTube long-form
 * market report (1920x1080, 8-12 min).
 *
 * Pipeline:
 *   1. build-youtube-long.mjs  — props.json + script.json + citations.json
 *   2. synth-vo-long.mjs       — ElevenLabs VO + alignment → chapter durations
 *   3. fetch-media.mjs         — 15 photos + 8 videos for the city
 *   4. npx remotion render     — 1920x1080 h264, CRF 22, concurrency=1
 *   5. QA gate                 — duration, blackdetect, file size
 *   6. register-render.mjs     — registers in asset library (approval=intake)
 *
 * Usage:
 *   node --env-file=/Users/matthewryan/RyanRealty/.env.local \
 *     scripts/render-youtube-long.mjs --city bend [--period 2026-04] [--skip-fetch] [--skip-vo]
 *
 * Flags:
 *   --skip-fetch   Skip fetch-media (reuse existing public/<slug>/ images)
 *   --skip-vo      Skip synth-vo-long (reuse existing voiceover.mp3)
 *   --skip-build   Skip build-youtube-long (reuse existing props.json)
 *   --dry-run      Build props + script only, don't render or upload
 *
 * Output: out/yt-long/<slug>/<slug>_yt_long_<period>.mp4
 *
 * Does NOT commit or upload. Per draft-first rule: path is surfaced to Matt
 * for review; he approves before register-render writes to tracked locations
 * and before upload-youtube.mjs uploads.
 */

import { execFile, exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const execShell = promisify(execCb)

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const YT_LONG_DIR = resolve(ROOT, 'video/market-report-yt-long')
const OUT = resolve(ROOT, 'out/yt-long')
const ENV_FILE = '/Users/matthewryan/RyanRealty/.env.local'

// ─── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) out[a.slice(2, eq)] = a.slice(eq + 1)
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i]
      else out[a.slice(2)] = true
    } else { out._.push(a) }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const slug = args.city
if (!slug) {
  console.error('Usage: render-youtube-long.mjs --city <slug> [--period YYYY-MM]')
  process.exit(1)
}

const period = args.period || (() => {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
})()

const skipFetch = !!args['skip-fetch']
const skipVo    = !!args['skip-vo']
const skipBuild = !!args['skip-build']
const dryRun    = !!args['dry-run']

const cityOut = resolve(OUT, slug)
const outputMp4 = resolve(cityOut, `${slug}_yt_long_${period.replace('-', '_')}.mp4`)

// ─── Step helpers ──────────────────────────────────────────────────────────────

function step(n, label) {
  console.log(`\n[${n}] ${label}`)
  console.log('─'.repeat(60))
}

async function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`)
  try {
    const { stdout, stderr } = await execShell(cmd, { cwd, maxBuffer: 256 * 1024 * 1024 })
    if (stdout.trim()) console.log(stdout)
    if (stderr.trim()) console.error(stderr)
  } catch (e) {
    console.error(`  FAILED: ${e.message}`)
    throw e
  }
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

console.log(`\n=== YouTube Long-Form Render: ${slug} ${period} ===`)
const t0 = Date.now()

// Step 1 — Build props
if (!skipBuild) {
  step(1, 'Build props.json + script.json + citations.json')
  await run(`node --env-file=${ENV_FILE} scripts/build-youtube-long.mjs --city ${slug} --period ${period}`)
} else {
  console.log('[1] Skipping build (--skip-build)')
}

// Step 2 — Synth VO
if (!skipVo) {
  step(2, 'Synth voiceover (ElevenLabs Victoria — may take 2-3 min)')
  await run(`node --env-file=${ENV_FILE} scripts/synth-vo-long.mjs --city ${slug} --period ${period}`)
} else {
  console.log('[2] Skipping VO synth (--skip-vo)')
}

// Step 3 — Fetch media (more assets needed for 11 min)
if (!skipFetch) {
  step(3, 'Fetch media (15 photos + 8 videos)')
  const fetchScript = resolve(ROOT, 'video/market-report/scripts/fetch-media.mjs')
  if (existsSync(fetchScript)) {
    await run(`node --env-file=${ENV_FILE} ${fetchScript} --city ${slug} --type both --photos 15 --videos 8`, ROOT)
  } else {
    console.warn(`  fetch-media.mjs not found at ${fetchScript} — skipping`)
  }
} else {
  console.log('[3] Skipping media fetch (--skip-fetch)')
}

if (dryRun) {
  console.log('\n[dry-run] Stopping before render. Props + script ready at:')
  console.log(`  ${cityOut}/props.json`)
  console.log(`  ${cityOut}/script.json`)
  console.log(`  ${cityOut}/citations.json`)
  process.exit(0)
}

// Step 4 — Remotion render (1920x1080, h264, CRF 22, concurrency=1)
step(4, 'Remotion render (1920x1080, may take 30-60 min)')

// Load props for the render command
const propsPath = resolve(cityOut, 'props.json')
if (!existsSync(propsPath)) {
  console.error(`props.json not found: ${propsPath}`)
  process.exit(1)
}

// Remotion accepts inputProps as JSON-string via --props
// We pass the file path directly (Remotion supports JSON file path on CLI)
const renderCmd = [
  'npx remotion render',
  'src/index.ts',
  'YouTubeMarketReport',
  outputMp4,
  '--codec h264',
  '--concurrency 1',
  '--crf 22',
  '--image-format=jpeg',
  '--jpeg-quality=92',
  `--props=${propsPath}`,
].join(' ')

await run(renderCmd, YT_LONG_DIR)

// Step 5 — QA gate
step(5, 'QA gate (duration, blackdetect, file size)')

let qaPassed = true

// Duration check
try {
  const { stdout: durOut } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', outputMp4])
  const durSec = parseFloat(durOut.trim())
  const durMin = durSec / 60
  if (durMin < 8 || durMin > 12) {
    console.error(`  FAIL duration: ${durMin.toFixed(2)} min (required 8-12 min)`)
    qaPassed = false
  } else {
    console.log(`  PASS duration: ${durMin.toFixed(2)} min`)
  }
} catch (e) {
  console.error(`  ffprobe duration check failed: ${e.message}`); qaPassed = false
}

// Blackdetect (strict: no pure-black sequences)
try {
  const { stdout: bdOut, stderr: bdErr } = await execShell(
    `ffmpeg -i "${outputMp4}" -vf blackdetect=d=0.1:pix_th=0.05 -an -f null - 2>&1 | grep black_start || true`
  )
  const hits = (bdOut + bdErr).match(/black_start/g)
  if (hits && hits.length > 0) {
    console.error(`  FAIL blackdetect: ${hits.length} black sequence(s) found`)
    qaPassed = false
  } else {
    console.log('  PASS blackdetect: no black sequences')
  }
} catch (e) {
  console.warn(`  blackdetect check failed (non-fatal): ${e.message}`)
}

// File size check (<500 MB for YouTube long-form)
try {
  const s = await stat(outputMp4)
  const mb = s.size / (1024 * 1024)
  if (mb > 500) {
    console.error(`  FAIL file size: ${mb.toFixed(1)} MB > 500 MB limit`)
    qaPassed = false
  } else {
    console.log(`  PASS file size: ${mb.toFixed(1)} MB`)
  }
} catch (e) {
  console.error(`  file size check failed: ${e.message}`); qaPassed = false
}

if (!qaPassed) {
  console.error('\nQA FAILED — do not ship. Fix issues above before running again.')
  process.exit(1)
}

// Step 6 — Register in asset library (approval=intake)
step(6, 'Register render in asset library')
const registerScript = resolve(ROOT, 'video/market-report/scripts/register-render.mjs')
if (existsSync(registerScript)) {
  await run(`node --env-file=${ENV_FILE} ${registerScript} "${outputMp4}" --city ${slug} --period ${period} --render-type youtube-long-form --scope city`, ROOT)
} else {
  console.warn('  register-render.mjs not found — skipping asset library registration')
}

// ─── Summary ───────────────────────────────────────────────────────────────────

const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1)
console.log('\n' + '═'.repeat(60))
console.log('RENDER COMPLETE')
console.log('─'.repeat(60))
console.log(`City:     ${slug}`)
console.log(`Period:   ${period}`)
console.log(`Output:   ${outputMp4}`)
console.log(`Elapsed:  ${elapsed} min`)
console.log('')
console.log('DRAFT READY — per draft-first rule, DO NOT commit or upload.')
console.log('Review the video, then run scripts/upload-youtube.mjs to upload.')
console.log('─'.repeat(60))
