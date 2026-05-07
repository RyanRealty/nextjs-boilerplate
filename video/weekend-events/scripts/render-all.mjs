#!/usr/bin/env node
// Render all 5 aspect-ratio compositions sequentially.
// Sequential to avoid Chrome OOM (concurrency=1 required).
//
// Usage:
//   node scripts/render-all.mjs
//   SLUG=weekend-events-2026-05 node scripts/render-all.mjs
//   node scripts/render-all.mjs --aspects=9x16,16x9   (subset)
//   node scripts/render-all.mjs --force               (re-render even if mp4 exists)
//
// Output: out/<aspect>/weekend_events_<slug>.mp4

import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, access } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SLUG  = process.env.SLUG || 'weekend-events-2026-05'
const force = process.argv.includes('--force')

const aspectArg = process.argv.find(a => a.startsWith('--aspects='))
const ALL_ASPECTS = ['16x9', '9x16', '1x1', '2x3', '4x5']
const ASPECTS = aspectArg
  ? aspectArg.replace('--aspects=', '').split(',').map(s => s.trim())
  : ALL_ASPECTS

// Map aspect → Remotion composition ID.
const COMP_ID = {
  '16x9': 'WeekendEvents_16x9',
  '9x16': 'WeekendEvents_9x16',
  '1x1':  'WeekendEvents_1x1',
  '2x3':  'WeekendEvents_2x3',
  '4x5':  'WeekendEvents_4x5',
}

const exists = async (p) => {
  try { await access(p); return true } catch { return false }
}

const propsPath = resolve(ROOT, 'out', SLUG, 'props.json')
if (!await exists(propsPath)) {
  console.error(`Missing ${propsPath} — run synth-vo.mjs first.`)
  process.exit(1)
}

for (const aspect of ASPECTS) {
  const outDir  = resolve(ROOT, 'out', aspect)
  await mkdir(outDir, { recursive: true })
  const outFile = resolve(outDir, `weekend_events_${SLUG}.mp4`)

  if (!force && await exists(outFile)) {
    console.log(`Skipping ${aspect} (${outFile} exists — pass --force to re-render)`)
    continue
  }

  console.log(`\n=== Rendering ${aspect} (${COMP_ID[aspect]}) ===`)
  const t0 = Date.now()

  const code = await new Promise((res, rej) => {
    const p = spawn('npx', [
      'remotion', 'render', 'src/index.ts',
      COMP_ID[aspect],
      outFile,
      `--props=${propsPath}`,
      '--codec=h264',
      '--concurrency=1',
      '--crf=22',
      '--image-format=jpeg',
      '--jpeg-quality=92',
      '--log=warn',
    ], { cwd: ROOT, stdio: 'inherit' })
    p.on('exit', res)
    p.on('error', rej)
  })

  if (code !== 0) {
    console.error(`Render failed for ${aspect} (exit ${code})`)
    process.exit(1)
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`${aspect} rendered in ${dt}s → ${outFile}`)
}

console.log('\nAll renders complete.')
console.log('Next: node scripts/qa-and-scorecard.mjs')
