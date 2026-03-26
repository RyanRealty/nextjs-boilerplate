#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function runSupabaseDryRun() {
  if (process.platform === 'win32') {
    return spawnSync('npx supabase db push --dry-run --include-all --yes', {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true,
    })
  }
  return spawnSync('npx', ['supabase', 'db', 'push', '--dry-run', '--include-all', '--yes'], {
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

function parsePendingMigrations(output) {
  const lines = output.split(/\r?\n/)
  const pending = []
  for (const line of lines) {
    const match = line.match(/^\s*•\s+(.+\.sql)\s*$/)
    if (match?.[1]) pending.push(match[1].trim())
  }
  return pending
}

if (process.env.SKIP_DB_GUARD === '1') {
  console.log('Skipping Supabase migration drift guard (SKIP_DB_GUARD=1).')
  process.exit(0)
}

const result = runSupabaseDryRun()
const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
const pending = parsePendingMigrations(combinedOutput)

if (result.status !== 0) {
  console.error('Supabase migration drift guard failed to run.')
  if (combinedOutput) console.error(combinedOutput)
  console.error('Resolve Supabase CLI/auth issues or set SKIP_DB_GUARD=1 for this push.')
  process.exit(result.status ?? 1)
}

if (pending.length > 0) {
  console.error('Remote DB is behind local migrations:')
  for (const name of pending) console.error(` - ${name}`)
  console.error('Run: npx supabase db push --include-all')
  process.exit(1)
}

console.log('Supabase migration drift guard passed.')
