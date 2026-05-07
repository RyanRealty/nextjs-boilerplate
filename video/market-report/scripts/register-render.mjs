#!/usr/bin/env node
/**
 * Register a rendered MP4 into the asset library.
 *
 * Run after `npx remotion render` to add the produced video to the asset
 * library so future builds can:
 *   - reuse it (e.g. embed last month's report in this month's roundup)
 *   - track which photos / VO / clips went into it (via used_in chains)
 *   - generate the FB lead-gen ad creative from it
 *   - publish it to YouTube / IG / TikTok via publisher
 *
 * CLI:
 *   node scripts/register-render.mjs <mp4-path> --city bend --period 2026-04 \
 *     [--render-type short-form|youtube-long-form] [--scope city|neighborhood|region]
 *
 * Auto-detects width / height / duration via ffprobe.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)

async function probe(mp4Path) {
  try {
    const { stdout } = await exec('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=width,height,codec_name',
      '-of', 'default=nw=1',
      mp4Path,
    ])
    const out = {}
    for (const line of stdout.split('\n')) {
      const [k, v] = line.split('=')
      if (k === 'duration') out.duration_sec = parseFloat(v)
      if (k === 'width') out.width = parseInt(v, 10)
      if (k === 'height') out.height = parseInt(v, 10)
      if (k === 'codec_name' && !out.codec) out.codec = v
    }
    return out
  } catch (e) {
    console.warn(`ffprobe failed for ${mp4Path}: ${e.message}`)
    return {}
  }
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) out[a.slice(2, eq)] = a.slice(eq + 1)
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { out[a.slice(2)] = argv[++i] }
      else { out[a.slice(2)] = true }
    } else {
      out._.push(a)
    }
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mp4 = args._[0]
  if (!mp4) {
    console.error('Usage: register-render.mjs <mp4-path> --city <slug> --period <YYYY-MM>')
    console.error('Optional: --render-type short-form|youtube-long-form (default: short-form)')
    console.error('          --scope city|neighborhood|subdivision|region (default: city)')
    process.exit(1)
  }
  if (!existsSync(mp4)) {
    console.error(`File not found: ${mp4}`)
    process.exit(1)
  }
  if (!args.city) { console.error('--city required'); process.exit(1) }

  const probed = await probe(mp4)
  const renderType = args['render-type'] || 'short-form'
  const scope = args.scope || 'city'
  const period = args.period || new Date().toISOString().slice(0, 7)

  const { register } = await import('../../../lib/asset-library.mjs')
  const asset = await register(mp4, {
    type: 'render',
    source: 'render-output',
    source_id: `render:${args.city}:${period}:${renderType}`,
    license: 'owned',
    license_metadata: {
      render_type: renderType,
      scope,
      period,
      codec: probed.codec || 'h264',
    },
    creator: 'Ryan Realty content engine',
    geo: [args.city, 'central-oregon'],
    subject: ['market-report', renderType, scope, args.city],
    search_query: `${args.city} ${period} ${renderType}`,
    width: probed.width,
    height: probed.height,
    duration_sec: probed.duration_sec,
    approval: 'intake', // renders enter as intake — Matt approves before they ship
    notes: `${args.city} ${period} ${renderType} market report render. Width ${probed.width}, height ${probed.height}, duration ${probed.duration_sec?.toFixed(1)}s.`,
  })
  console.log(JSON.stringify(asset, null, 2))
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch(err => { console.error(err); process.exit(1) })
