#!/usr/bin/env node
/**
 * Set GitHub Actions repository secrets from .env.local values (stdin to gh, no echo).
 * Requires: gh CLI authenticated (gh auth login) with repo scope.
 *
 * Usage: node scripts/sync-github-secrets-from-local.mjs KEY1 KEY2 ...
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  const raw = readFileSync(envPath, 'utf8')
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
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    env[key] = val
  }
  return env
}

const keys = process.argv.slice(2).filter(Boolean)
if (keys.length === 0) {
  console.error('Usage: node scripts/sync-github-secrets-from-local.mjs KEY1 KEY2 ...')
  process.exit(1)
}

const envPath = resolve(process.cwd(), '.env.local')
if (!existsSync(envPath)) {
  console.error('Missing .env.local')
  process.exit(1)
}

const ghVersion = spawnSync('gh', ['--version'], { encoding: 'utf8' })
if (ghVersion.status !== 0) {
  console.error('GitHub CLI (gh) is not installed or not on your PATH.')
  console.error('  macOS (Homebrew): brew install gh')
  console.error('  Then authenticate: gh auth login')
  console.error('Or add secrets manually: repo Settings → Secrets and variables → Actions → New repository secret')
  process.exit(1)
}

const ghAuth = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' })
if (ghAuth.status !== 0) {
  console.error('gh is installed but you are not logged in. Run: gh auth login')
  console.error(ghAuth.stderr || ghAuth.stdout || '')
  process.exit(1)
}

const env = loadEnvLocal()
for (const key of keys) {
  const val = env[key]
  if (val == null || String(val).trim() === '') {
    console.error(`Missing or empty ${key} in .env.local — skip or fill in first`)
    process.exit(1)
  }
  const r = spawnSync('gh', ['secret', 'set', key], {
    input: val,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (r.status !== 0) {
    console.error(`gh secret set ${key} failed. Ensure this repo is the current gh repo (gh repo set-default) and you have admin access.`)
    process.exit(r.status ?? 1)
  }
  console.log(`GitHub Actions secret set: ${key}`)
}
