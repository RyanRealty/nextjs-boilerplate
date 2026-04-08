#!/usr/bin/env node
/**
 * Compact strict-verify status + delta since last run (writes .cursor/local/sync-strict-verify-last.json).
 * Requires same env as sync-status-report (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 *
 * Usage: source .env.local && node scripts/sync-strict-verify-last-ask.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const snapshotPath = path.join(repoRoot, '.cursor', 'local', 'sync-strict-verify-last.json')

function runReport() {
  const r = spawnSync('node', ['scripts/sync-status-report.mjs', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 25 * 1024 * 1024,
  })
  if (r.error) throw r.error
  if (r.status !== 0) {
    process.stderr.write(r.stderr || '')
    process.stdout.write(r.stdout || '')
    process.exit(r.status ?? 1)
  }
  return JSON.parse(r.stdout)
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US') : String(n)
}

function hoursRough(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return null
  const h = minutes / 60
  if (h < 72) return `${Math.round(h)}h`
  const d = h / 24
  return `${d.toFixed(1)}d`
}

function main() {
  const report = runReport()
  const sv = report.strictVerification
  const counts = sv?.counts ?? {}
  const terminalBacklog = counts.terminalStrictVerifyBacklog ?? null
  const health = sv?.runTelemetry?.health
  const etaMin = sv?.runTelemetry?.etaMinutesRough

  const years = (report.listingYearsBreakdown ?? [])
    .filter((y) => (y.finalizedUnverified ?? 0) > 0)
    .sort((a, b) => b.year - a.year)

  let prior = null
  try {
    if (fs.existsSync(snapshotPath)) {
      prior = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
    }
  } catch {
    prior = null
  }

  const nowIso = report.generatedAt ?? new Date().toISOString()
  const working =
    health?.status === 'healthy' &&
    typeof health.minutesSinceLastRun === 'number' &&
    health.minutesSinceLastRun < 15

  console.log('')
  console.log('Strict verify cron —', working ? 'working (recent successful runs)' : 'check telemetry below')
  if (health?.summary) console.log('  ', health.summary)
  if (typeof health?.minutesSinceLastRun === 'number') {
    console.log(`   Last batch finished ~${health.minutesSinceLastRun.toFixed(1)} min ago`)
  }
  if (typeof health?.successRateLast10 === 'number') {
    console.log(`   Last 10 runs OK: ${health.successRateLast10}%`)
  }

  console.log('')
  console.log(`Terminal backlog (strict verify queue): ${fmt(terminalBacklog)}`)
  if (etaMin != null) console.log(`Rough ETA to clear that queue: ~${fmt(Math.round(etaMin))} min (~${hoursRough(etaMin) ?? '?'})`)

  if (prior && typeof prior.terminalStrictBacklog === 'number' && terminalBacklog != null) {
    const delta = prior.terminalStrictBacklog - terminalBacklog
    const prevTime = prior.capturedAt ? new Date(prior.capturedAt).getTime() : NaN
    const elapsedMin = Number.isFinite(prevTime) ? (Date.now() - prevTime) / 60000 : null
    console.log('')
    console.log('Since last time you asked:')
    console.log(`   Was: ${fmt(prior.terminalStrictBacklog)} → now: ${fmt(terminalBacklog)} (${delta >= 0 ? 'cleared' : 'up'} ${fmt(Math.abs(delta))})`)
    if (elapsedMin != null && elapsedMin > 0 && delta > 0) {
      const perHour = (delta / elapsedMin) * 60
      console.log(`   Elapsed: ~${elapsedMin.toFixed(0)} min (~${perHour.toFixed(0)} listings/h from backlog trend)`)
      if (terminalBacklog > 0 && perHour > 0) {
        const remH = terminalBacklog / perHour
        console.log(`   ETA from this pace: ~${hoursRough(remH * 60) ?? `${Math.round(remH)}h`}`)
      }
    }
  } else {
    console.log('')
    console.log('(No prior snapshot yet — saved after this run for next delta.)')
  }

  console.log('')
  console.log('Year × still finalized but not strict-verified (ListDate/OnMarketDate cohort):')
  if (years.length === 0) {
    console.log('   (none)')
  } else {
    for (const y of years) {
      console.log(`   ${y.year}: ${fmt(y.finalizedUnverified)}`)
    }
  }
  console.log('')

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true })
  const snapshot = {
    capturedAt: nowIso,
    terminalStrictBacklog: terminalBacklog,
    allListingsFinalizedNotStrictVerified: counts.allListingsFinalizedNotStrictVerified ?? null,
    allListingsHistoryVerifiedFull: counts.allListingsHistoryVerifiedFull ?? null,
    yearFinalizedUnverified: Object.fromEntries(
      years.map((y) => [String(y.year), y.finalizedUnverified])
    ),
  }
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
}

main()
