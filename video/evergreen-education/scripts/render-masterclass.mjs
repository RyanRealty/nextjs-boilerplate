#!/usr/bin/env node
/**
 * render-masterclass.mjs
 *
 * Composes MasterclassInput props + invokes Remotion render for the v2
 * EvergreenMasterclass composition.
 *
 * Run: node video/evergreen-education/scripts/render-masterclass.mjs
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = resolve(ROOT, 'data')
const OUT_DIR = resolve(ROOT, 'out', 'masterclass')
const PUB_DIR = resolve(ROOT, 'public', 'masterclass')
const PUB_4P = resolve(ROOT, 'public', '4-pillars')

async function exists(p) { try { await stat(p); return true } catch { return false } }

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(PUB_DIR, { recursive: true })

  const config = JSON.parse(await readFile(resolve(DATA_DIR, 'masterclass.json'), 'utf8'))
  const seriesData = JSON.parse(await readFile(resolve(PUB_4P, 'equity-series.json'), 'utf8'))
  const captionWords = (await exists(resolve(OUT_DIR, 'captionWords.json')))
    ? JSON.parse(await readFile(resolve(OUT_DIR, 'captionWords.json'), 'utf8'))
    : []
  const captionSentences = (await exists(resolve(OUT_DIR, 'captionSentences.json')))
    ? JSON.parse(await readFile(resolve(OUT_DIR, 'captionSentences.json'), 'utf8'))
    : []
  const alignment = (await exists(resolve(OUT_DIR, 'alignment.json')))
    ? JSON.parse(await readFile(resolve(OUT_DIR, 'alignment.json'), 'utf8'))
    : null

  // Auto-fit chapter durations to actual VO segment durations (with min 5s, max 18s per chapter)
  let chapterDurations = config.chapterDurations
  if (alignment && alignment.segments && alignment.segments.length === 8) {
    const PAD = 0.4
    const MIN_TOTAL = 90
    const MAX_TOTAL = 115
    chapterDurations = alignment.segments.map((s) => Math.max(5, Math.min(18, s.duration + PAD)))
    let total = chapterDurations.reduce((a, b) => a + b, 0)
    if (total > MAX_TOTAL) {
      const k = MAX_TOTAL / total
      chapterDurations = chapterDurations.map((d) => d * k)
      total = chapterDurations.reduce((a, b) => a + b, 0)
    } else if (total < MIN_TOTAL) {
      chapterDurations[chapterDurations.length - 1] += MIN_TOTAL - total
      total = chapterDurations.reduce((a, b) => a + b, 0)
    }
    console.log(`Auto-fit chapter durations: total ${total.toFixed(2)}s`)
    console.log(`  ${chapterDurations.map((d) => d.toFixed(2)).join(' / ')}`)
  }

  // Photos — re-use the v1 4-pillars photos when present (intro / cash-flow / loan-paydown / outro slots match)
  const photoIfExists = async (slug) => {
    const p = resolve(PUB_4P, 'photos', `${slug}.jpg`)
    return (await exists(p)) ? `4-pillars/photos/${slug}.jpg` : null
  }
  const photos = {
    intro: await photoIfExists('intro-hero'),
    cashFlow: await photoIfExists('cash-flow'),
    appreciation: null, // pure data viz beat — photo would distract
    loanPaydown: await photoIfExists('loan-paydown'),
    taxBenefits: null, // pure data viz beat
    outro: await photoIfExists('outro-hero'),
  }

  const voPath = (await exists(resolve(PUB_DIR, 'voiceover.mp3'))) ? 'masterclass/voiceover.mp3' : ''
  const musicPath = (await exists(resolve(PUB_4P, 'music.mp3'))) ? '4-pillars/music.mp3' : undefined

  const props = {
    chapterDurations,
    voPath,
    musicPath,
    captionWords,
    captionSentences,
    inputs: {
      purchasePrice: config.inputs.purchasePrice,
      downPayment: config.inputs.downPayment,
      loanAmount: config.inputs.loanAmount,
      interestRate: config.inputs.interestRate,
      termYears: config.inputs.termYears,
      monthlyRent: config.inputs.monthlyRent,
      monthlyCashFlow: config.inputs.monthlyCashFlow,
      appreciationRate: config.inputs.appreciationRate,
      depreciationYearly: config.inputs.depreciationYearly,
      depreciationYears: config.inputs.depreciationYears,
      taxBracket: config.inputs.taxBracket,
    },
    equitySeries: seriesData.series,
    photos,
  }

  const propsPath = resolve(OUT_DIR, 'masterclass-render-props.json')
  await writeFile(propsPath, JSON.stringify(props, null, 2))
  console.log(`✓ wrote ${propsPath}`)
  console.log(`  VO present: ${voPath ? 'yes' : 'NO (silent render)'}`)
  console.log(`  Music present: ${musicPath ? 'yes' : 'no'}`)
  console.log(`  Caption sentences: ${captionSentences.length}`)
  console.log(`  Photos: intro=${!!photos.intro} cf=${!!photos.cashFlow} lp=${!!photos.loanPaydown} outro=${!!photos.outro}`)

  const outMp4 = resolve(OUT_DIR, 'masterclass.mp4')
  console.log(`\nKicking off Remotion render...`)
  await exec('npx', [
    'remotion', 'render', 'src/index.ts', 'EvergreenMasterclass', outMp4,
    '--codec', 'h264', '--concurrency', '1', '--crf', '22',
    '--image-format=jpeg', '--jpeg-quality=92',
    `--props=${propsPath}`,
  ], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NODE_NO_WARNINGS: '1' } })
    .then(({ stdout }) => console.log(stdout))
    .catch((err) => { console.error(err.stdout ?? ''); console.error(err.stderr ?? err.message); process.exit(1) })

  console.log(`\n✓ render complete: ${outMp4}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
