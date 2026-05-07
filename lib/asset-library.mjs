#!/usr/bin/env node
/**
 * Ryan Realty asset library — local manifest + filesystem store.
 *
 * Single source of truth for every fetched stock photo, generated AI image,
 * downloaded stock video, and our own rendered MP4s. Skills and pipeline
 * scripts query this BEFORE reaching out to external APIs (cost saver,
 * cache, dedup) and register every newly-acquired asset HERE so the next
 * build can find it.
 *
 * Manifest lives at:   data/asset-library/manifest.json
 * Files live under:    public/asset-library/<type>/<source>/<file>
 *
 * CLI usage:
 *   node lib/asset-library.mjs search --geo bend --type photo --tags "smith-rock"
 *   node lib/asset-library.mjs register <file> --type photo --source shutterstock \
 *     --license-id 123 --geo "bend,central-oregon" --subject "mountain,snow" \
 *     --search-query "smith rock oregon" --creator "Jane Photographer" \
 *     --width 4000 --height 6000
 *   node lib/asset-library.mjs mark-used <asset-id> --render <path> --scene <id> \
 *     --render-type short-form
 *   node lib/asset-library.mjs stats
 *   node lib/asset-library.mjs list --recent 10 --type photo
 *
 * Programmatic usage (ESM):
 *   import { search, register, markUsed, stats } from './lib/asset-library.mjs'
 */

import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises'
import { resolve, dirname, basename, extname, relative, join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANIFEST_PATH = resolve(ROOT, 'data', 'asset-library', 'manifest.json')
const ASSETS_ROOT = resolve(ROOT, 'public', 'asset-library')

// ---------------------------------------------------------------------------
// Manifest I/O
// ---------------------------------------------------------------------------

async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { version: 1, schema_version: 1, updated_at: new Date().toISOString(), assets: [] }
  }
  const raw = await readFile(MANIFEST_PATH, 'utf8')
  return JSON.parse(raw)
}

async function writeManifest(manifest) {
  manifest.updated_at = new Date().toISOString()
  await mkdir(dirname(MANIFEST_PATH), { recursive: true })
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search the manifest by geo + subject tags + type. Most-recent-first by
 * registered_at. Returns up to `limit` assets.
 *
 * @param {object} opts
 * @param {string[]} [opts.geo]      - geo_tags any-match (e.g. ['bend'])
 * @param {string[]} [opts.subject]  - subject_tags any-match
 * @param {string}   [opts.type]     - photo / video / audio / render
 * @param {string}   [opts.source]   - filter by source
 * @param {string}   [opts.approval] - default 'approved' (skip intake/rejected)
 * @param {number}   [opts.limit]    - default 20
 * @param {boolean}  [opts.unusedOnly] - if true, exclude assets already used in render in last 30 days
 */
export async function search(opts = {}) {
  const { geo = [], subject = [], type, source, approval, limit = 20, unusedOnly = false } = opts
  const manifest = await readManifest()
  let results = manifest.assets

  if (type) results = results.filter(a => a.type === type)
  if (source) results = results.filter(a => a.source === source)
  if (approval) results = results.filter(a => (a.approval || 'approved') === approval)

  const geoLower = geo.map(g => g.toLowerCase())
  const subjLower = subject.map(s => s.toLowerCase())

  if (geoLower.length) {
    results = results.filter(a =>
      (a.geo_tags || []).some(t => geoLower.includes(t.toLowerCase()))
    )
  }
  if (subjLower.length) {
    results = results.filter(a =>
      (a.subject_tags || []).some(t => subjLower.includes(t.toLowerCase()))
    )
  }

  if (unusedOnly) {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    results = results.filter(a => {
      if (!a.last_used_at) return true
      return new Date(a.last_used_at).getTime() < cutoff
    })
  }

  // Sort: recently registered first, but unused-recently bumped down
  results.sort((a, b) => {
    const aRegistered = new Date(a.registered_at).getTime()
    const bRegistered = new Date(b.registered_at).getTime()
    return bRegistered - aRegistered
  })

  return results.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/**
 * Register a new asset. Copies the file into public/asset-library/ if
 * it's outside that tree. Returns the new asset record.
 */
export async function register(filePath, meta) {
  if (!existsSync(filePath)) {
    throw new Error(`register: file does not exist: ${filePath}`)
  }
  if (!meta.type) throw new Error('register: type is required')
  if (!meta.source) throw new Error('register: source is required')

  const manifest = await readManifest()

  // De-dup by (source, source_id) if both provided — return existing record
  if (meta.source_id) {
    const existing = manifest.assets.find(a =>
      a.source === meta.source && a.source_id === meta.source_id
    )
    if (existing) return existing
  }

  // Compute target path inside public/asset-library/<type>s/<source>/
  const ext = extname(filePath) || '.jpg'
  const id = randomUUID()
  const typeFolder = meta.type === 'photo' ? 'photos'
    : meta.type === 'video' ? 'videos'
    : meta.type === 'audio' ? 'audio'
    : meta.type === 'render' ? 'videos/renders'
    : 'misc'
  const sourceFolder = meta.type === 'render' ? '' : `/${meta.source.replace('generated-', 'generated/')}`
  const targetDir = resolve(ASSETS_ROOT, typeFolder + sourceFolder)
  await mkdir(targetDir, { recursive: true })
  const targetName = `${id}${ext}`
  const targetPath = resolve(targetDir, targetName)

  // Copy if not already inside ASSETS_ROOT
  const isInside = filePath.startsWith(ASSETS_ROOT)
  if (!isInside) {
    await copyFile(filePath, targetPath)
  }
  const finalPath = isInside ? filePath : targetPath
  const relPath = relative(ROOT, finalPath)

  // Get file stats for size
  const fileStat = await stat(finalPath)

  const asset = {
    id,
    type: meta.type,
    source: meta.source,
    source_id: meta.source_id || null,
    license: meta.license || meta.source,
    license_metadata: meta.license_metadata || {},
    creator: meta.creator || null,
    creator_url: meta.creator_url || null,
    file_path: relPath,
    file_url: meta.file_url || null,
    file_size_bytes: fileStat.size,
    geo_tags: parseList(meta.geo) || [],
    subject_tags: parseList(meta.subject) || [],
    search_query: meta.search_query || null,
    width: meta.width || null,
    height: meta.height || null,
    duration_sec: meta.duration_sec || null,
    registered_at: new Date().toISOString(),
    last_used_at: null,
    used_in: [],
    approval: meta.approval || 'approved',
    notes: meta.notes || null,
  }

  manifest.assets.push(asset)
  await writeManifest(manifest)
  return asset
}

function parseList(v) {
  if (!v) return null
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  return String(v).split(',').map(x => x.trim()).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Mark used
// ---------------------------------------------------------------------------

/**
 * Record that an asset was used in a render. Updates last_used_at and
 * appends to used_in[].
 */
export async function markUsed(assetId, usage) {
  const manifest = await readManifest()
  const asset = manifest.assets.find(a => a.id === assetId)
  if (!asset) throw new Error(`markUsed: asset ${assetId} not found`)
  if (!asset.used_in) asset.used_in = []
  asset.used_in.push({
    render_path: usage.render_path,
    scene_id: usage.scene_id || null,
    render_type: usage.render_type || 'other',
    used_at: new Date().toISOString(),
  })
  asset.last_used_at = new Date().toISOString()
  await writeManifest(manifest)
  return asset
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function stats() {
  const manifest = await readManifest()
  const byType = {}
  const bySource = {}
  const byLicense = {}
  let totalUsages = 0
  let totalCost = 0

  for (const a of manifest.assets) {
    byType[a.type] = (byType[a.type] || 0) + 1
    bySource[a.source] = (bySource[a.source] || 0) + 1
    byLicense[a.license || 'unknown'] = (byLicense[a.license || 'unknown'] || 0) + 1
    totalUsages += (a.used_in || []).length
    if (a.license_metadata?.license_cost_usd) {
      totalCost += Number(a.license_metadata.license_cost_usd) || 0
    }
  }

  return {
    total_assets: manifest.assets.length,
    by_type: byType,
    by_source: bySource,
    by_license: byLicense,
    total_usages: totalUsages,
    total_license_cost_usd: Number(totalCost.toFixed(2)),
    last_updated: manifest.updated_at,
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  // Very small arg parser: positional + --flags + --flag=value
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) {
        out[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        const next = argv[i + 1]
        if (next && !next.startsWith('--')) {
          out[a.slice(2)] = next
          i++
        } else {
          out[a.slice(2)] = true
        }
      }
    } else {
      out._.push(a)
    }
  }
  return out
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    console.error('Usage: asset-library.mjs <search|register|mark-used|stats|list> [args]')
    console.error('See file header for full CLI examples.')
    process.exit(1)
  }
  const cmd = argv[0]
  const args = parseArgs(argv.slice(1))

  if (cmd === 'search') {
    const results = await search({
      geo: parseList(args.geo) || [],
      subject: parseList(args.tags || args.subject) || [],
      type: args.type,
      source: args.source,
      approval: args.approval,
      limit: args.limit ? parseInt(args.limit, 10) : 20,
      unusedOnly: !!args['unused-only'],
    })
    console.log(JSON.stringify(results, null, 2))
  }
  else if (cmd === 'register') {
    const file = args._[0]
    if (!file) { console.error('register: file path required'); process.exit(1) }
    const asset = await register(file, {
      type: args.type,
      source: args.source,
      source_id: args['source-id'],
      license: args.license,
      license_metadata: args['license-id']
        ? { license_id: args['license-id'], license_cost_usd: args['license-cost'] }
        : undefined,
      creator: args.creator,
      creator_url: args['creator-url'],
      file_url: args['file-url'],
      geo: args.geo,
      subject: args.subject,
      search_query: args['search-query'],
      width: args.width ? parseInt(args.width, 10) : undefined,
      height: args.height ? parseInt(args.height, 10) : undefined,
      duration_sec: args.duration ? parseFloat(args.duration) : undefined,
      approval: args.approval,
      notes: args.notes,
    })
    console.log(JSON.stringify(asset, null, 2))
  }
  else if (cmd === 'mark-used') {
    const id = args._[0]
    if (!id) { console.error('mark-used: asset id required'); process.exit(1) }
    const asset = await markUsed(id, {
      render_path: args.render,
      scene_id: args.scene,
      render_type: args['render-type'],
    })
    console.log(JSON.stringify(asset, null, 2))
  }
  else if (cmd === 'stats') {
    console.log(JSON.stringify(await stats(), null, 2))
  }
  else if (cmd === 'list') {
    const results = await search({
      type: args.type,
      source: args.source,
      limit: args.recent ? parseInt(args.recent, 10) : 20,
    })
    for (const a of results) {
      console.log(`${a.id}  ${a.type.padEnd(6)} ${(a.source || '').padEnd(20)} ${(a.geo_tags || []).join(',').padEnd(30)} ${a.file_path}`)
    }
  }
  else {
    console.error(`Unknown command: ${cmd}`)
    process.exit(1)
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch(err => { console.error(err); process.exit(1) })
