#!/usr/bin/env node
/**
 * Run terminal history finalization with N concurrent workers.
 *
 * Usage:
 *   node scripts/run-terminal-history-workers.mjs [baseUrl] [workerCount] [limit]
 *
 * Defaults:
 *   baseUrl=http://localhost:3000
 *   workerCount=1
 *   limit=20
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return {}
  const raw = readFileSync(p, 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnvLocal()
const baseUrl = (process.argv[2] || process.env.SYNC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const workerCount = Math.max(1, Math.min(16, Number(process.argv[3] || process.env.SYNC_WORKER_COUNT || 1)))
const limit = Math.max(1, Math.min(200, Number(process.argv[4] || process.env.SYNC_HISTORY_LIMIT || 20)))
const requestTimeoutMs = Math.max(30000, Number(process.env.SYNC_HISTORY_REQUEST_TIMEOUT_MS || 600000))
const cronSecret = process.env.CRON_SECRET || env.CRON_SECRET || ''

const headers = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}

function ts() {
  return new Date().toLocaleTimeString()
}

async function runWorker(workerIndex) {
  let chunk = 0
  let rows = 0
  let processed = 0
  let idleStreak = 0
  const maxIdleStreak = 30
  const endpoint = `${baseUrl}/api/cron/sync-history-terminal?worker_count=${workerCount}&worker_index=${workerIndex}&limit=${limit}`

  for (;;) {
    chunk++
    try {
      const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(requestTimeoutMs) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.log(`[${ts()}] w${workerIndex + 1} HTTP ${res.status}: ${data.error || data.message || 'error'}`)
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }

      const chunkRows = Number(data.historyRowsUpserted || 0)
      const chunkProcessed = Number(data.listingsProcessed || 0)
      rows += chunkRows
      processed += chunkProcessed
      if (chunkProcessed === 0) idleStreak++
      else idleStreak = 0

      console.log(
        `[${ts()}] w${workerIndex + 1} chunk=${chunk} processed=${processed} historyRows=${rows} chunkRows=${chunkRows} nextOffset=${data.nextOffset ?? 'done'}`
      )

      if (data.nextOffset == null) {
        return { workerIndex, chunks: chunk, processed, rows, done: true }
      }
      if (idleStreak >= maxIdleStreak) {
        return { workerIndex, chunks: chunk, processed, rows, done: false, idleStop: true }
      }

      await new Promise((r) => setTimeout(r, 250))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[${ts()}] w${workerIndex + 1} error: ${msg}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

async function main() {
  console.log(`Starting terminal history workers: ${workerCount}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Batch limit: ${limit}`)
  console.log(`Request timeout: ${requestTimeoutMs}ms`)
  if (cronSecret) console.log('Auth: CRON_SECRET')
  else console.log('Auth: none')
  console.log('')

  const start = Date.now()
  const workerPromises = Array.from({ length: workerCount }, (_, i) => runWorker(i))
  const results = await Promise.all(workerPromises)
  const elapsedSec = Math.round((Date.now() - start) / 1000)
  const totalRows = results.reduce((sum, r) => sum + (r.rows || 0), 0)
  const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0)

  console.log('\nTerminal history worker run finished')
  console.log(`Elapsed: ${elapsedSec}s`)
  console.log(`Listings processed: ${totalProcessed}`)
  console.log(`History rows inserted: ${totalRows}`)
  for (const r of results) {
    console.log(`w${r.workerIndex + 1}: chunks=${r.chunks} processed=${r.processed} rows=${r.rows}${r.done ? ' done' : ''}${r.idleStop ? ' idle-stop' : ''}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
