#!/usr/bin/env node
/**
 * Push env vars from .env.local to Vercel (Production).
 * Uses npx vercel so you don't need the CLI installed globally.
 * Run "npx vercel link" once and "npx vercel login" if needed.
 *
 * Usage: node scripts/sync-vercel-env.mjs [environment] [--only=KEY1,KEY2]
 *   environment: production (default) or preview
 *   --only= comma-separated keys to sync (otherwise all non-empty keys from .env.local)
 *
 * On Windows PowerShell, if terminal re-executes output as commands, run from
 * Command Prompt instead: cmd /c "npm run vercel:env"
 */

import { createWriteStream, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'

const LOG_PATH = resolve(process.cwd(), '.vercel-env-sync.log')
const logStream = createWriteStream(LOG_PATH, { flags: 'w' })
function log(msg) {
  const line = `[vercel:env] ${msg}\n`
  logStream.write(line)
}
function logErr(msg) {
  const line = `[vercel:env] ${msg}\n`
  logStream.write(line)
}
function out(msg) {
  process.stdout.write(msg + '\n')
}

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  try {
    const raw = readFileSync(path, 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (val.startsWith('"') && val.endsWith('"'))
        val = val.slice(1, -1).replace(/\\n/g, '\n')
      else if (val.startsWith("'") && val.endsWith("'"))
        val = val.slice(1, -1)
      env[key] = val
    }
    return env
  } catch (e) {
    out('vercel:env ERROR: Could not read .env.local - ' + e.message)
    process.exit(1)
  }
}

// Suppress DEP0190 from Vercel CLI (it spawns children with shell: true)
const baseNodeOpts = (process.env.NODE_OPTIONS || '').trim()
const spawnEnv = { ...process.env, NODE_OPTIONS: baseNodeOpts ? `${baseNodeOpts} --no-deprecation` : '--no-deprecation' }

// Pipe child stdout/stderr to log file so PowerShell does not re-execute them
function runVercel(cmdArgs) {
  return new Promise((resolvePromise, reject) => {
    const opts = { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: spawnEnv }
    // Array argv avoids shell metacharacters in secret --value on Windows cmd.
    const proc = spawn('npx', ['vercel', ...cmdArgs], { ...opts, shell: false })
    proc.stdout?.on('data', (c) => logStream.write(c))
    proc.stderr?.on('data', (c) => logStream.write(c))
    proc.on('error', reject)
    proc.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`exit ${code}`))))
  })
}

// Remove var from this environment only (rm without target deletes from multiple envs and wipes prod during preview sync).
function runVercelEnvRm(key, environment) {
  return runVercel(['env', 'rm', key, environment, '--yes']).catch(() => {})
}

function runVercelEnvAdd(key, value, environment) {
  // --value + --yes avoids preview "git_branch_required" when stdin add is ambiguous.
  const args = [
    'env',
    'add',
    key,
    environment,
    '--value',
    value,
    '--yes',
    '--sensitive',
    '--non-interactive',
  ]
  return runVercel(args)
}

/**
 * Preview: Vercel CLI often requires a git branch; REST API can set sensitive vars for all Preview deployments.
 * Token: https://vercel.com/account/tokens — set VERCEL_TOKEN in the shell or .env.local
 */
async function upsertVercelEnvViaApi(teamId, projectId, token, key, value, target) {
  const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`)
  url.searchParams.set('teamId', teamId)
  url.searchParams.set('upsert', 'true')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
      type: 'sensitive',
      target: [target],
    }),
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, message: text.slice(0, 800) }
  return { ok: true }
}

const argv = process.argv.slice(2)
let environment = 'production'
/** @type {Set<string> | null} */
let onlyKeys = null
for (const a of argv) {
  if (a === 'preview') environment = 'preview'
  else if (a === 'production') environment = 'production'
  else if (a.startsWith('--only=')) {
    onlyKeys = new Set(
      a
        .slice('--only='.length)
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    )
  }
}

const env = loadEnvLocal()
/** Never upload to Vercel project env (local/CI only). */
const NEVER_PUSH_TO_VERCEL = new Set(['VERCEL_TOKEN'])
let keys = Object.keys(env).filter((k) => env[k] !== '' && !NEVER_PUSH_TO_VERCEL.has(k))
if (onlyKeys && onlyKeys.size > 0) {
  keys = keys.filter((k) => onlyKeys.has(k))
  if (keys.length === 0) {
    out('vercel:env ERROR: --only keys not found or empty in .env.local')
    process.exit(1)
  }
}

const vercelProjectJson = resolve(process.cwd(), '.vercel', 'project.json')
if (!existsSync(vercelProjectJson)) {
  out('vercel:env ERROR: Not linked. Run: npx vercel link')
  process.exit(1)
}

const vc = JSON.parse(readFileSync(vercelProjectJson, 'utf8'))
const teamId = vc.orgId
const projectId = vc.projectId
const vercelToken = (process.env.VERCEL_TOKEN || env.VERCEL_TOKEN || '').trim()
const usePreviewApi = environment === 'preview' && vercelToken.length > 0

if (environment === 'preview' && !vercelToken) {
  out(
    'vercel:env NOTE: Preview sync needs VERCEL_TOKEN (https://vercel.com/account/tokens) in your shell or .env.local. Production-only sync still works via CLI.'
  )
}

log(`Syncing ${keys.length} variables to Vercel (${environment})...`)
let done = 0
for (const key of keys) {
  try {
    if (usePreviewApi) {
      const r = await upsertVercelEnvViaApi(teamId, projectId, vercelToken, key, env[key], 'preview')
      if (!r.ok) throw new Error(r.message || 'API error')
      done++
      log(`${key} (preview, API)`)
      continue
    }
    await runVercelEnvRm(key, environment)
    await runVercelEnvAdd(key, env[key], environment)
    done++
    log(key)
  } catch (e) {
    logErr(`${key} failed: ${e.message}`)
  }
}
logStream.end()
out(`Done: ${done}/${keys.length} env vars synced to Vercel. See .vercel-env-sync.log for details.`)
