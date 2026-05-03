#!/usr/bin/env node
/**
 * generate-illustrations.mjs
 *
 * Calls xAI Grok Imagine for the 6 evergreen-explainer beats that need a still.
 * (Beat 5 is pure data-viz; no illustration.)
 *
 * Reads prompts from data/4-pillars.json. Writes PNG per beat to:
 *   out/4-pillars/illustrations/<key>.png
 * After Matt's approval, copy to public/4-pillars/illustrations/.
 *
 * Env: XAI_API_KEY (required)
 *
 * Run: node video/evergreen-education/scripts/generate-illustrations.mjs
 */

import { mkdir, writeFile, copyFile, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'data', '4-pillars.json')
const OUT = resolve(ROOT, 'out', '4-pillars', 'illustrations')
const PUB = resolve(ROOT, 'public', '4-pillars', 'illustrations')

const XAI_IMAGES_URL = 'https://api.x.ai/v1/images/generations'
const MODEL = 'grok-imagine-image'

const KEYS = [
  'beat-0-hero',
  'beat-1-cash-flow',
  'beat-2-appreciation',
  'beat-3-loan-paydown',
  'beat-4-tax-benefits',
  'beat-6-outro',
]

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function generateOne(prompt) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY missing')

  const res = await fetch(XAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      response_format: 'b64_json',
      // Grok's API accepts aspect_ratio for image-pro; falls back to default if model rejects.
      aspect_ratio: '1:1',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Grok ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = await res.json()
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error(`Grok returned no b64_json: ${JSON.stringify(data).slice(0, 400)}`)
  return Buffer.from(b64, 'base64')
}

async function main() {
  const config = JSON.parse(await (await import('node:fs/promises')).readFile(DATA, 'utf8'))
  const prompts = config.illustrationPrompts

  const force = process.argv.includes('--force')
  const promote = !process.argv.includes('--no-promote') // default copy out → public so render works without manual approval step in dev

  await mkdir(OUT, { recursive: true })
  await mkdir(PUB, { recursive: true })

  for (const key of KEYS) {
    const outPath = resolve(OUT, `${key}.png`)
    const pubPath = resolve(PUB, `${key}.png`)
    if (!force && (await exists(outPath))) {
      console.log(`✓ ${key} already exists at out/ — skip (use --force to regen)`)
      if (promote && !(await exists(pubPath))) await copyFile(outPath, pubPath)
      continue
    }
    const prompt = prompts[key]
    if (!prompt) {
      console.warn(`✗ no prompt for ${key} in data/4-pillars.json — skip`)
      continue
    }
    process.stdout.write(`  ${key}: generating... `)
    try {
      const buf = await generateOne(prompt)
      await writeFile(outPath, buf)
      console.log(`OK (${buf.length} bytes) → ${outPath}`)
      if (promote) {
        await copyFile(outPath, pubPath)
        console.log(`     promoted → ${pubPath}`)
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`)
    }
  }
  console.log('\nDone. Inspect: out/4-pillars/illustrations/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
