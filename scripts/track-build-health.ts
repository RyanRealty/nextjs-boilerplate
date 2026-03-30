#!/usr/bin/env tsx
/**
 * Build Health Tracker
 *
 * Runs after a build to capture and record key metrics.
 * Metrics are stored locally in docs/plans/build-health.json
 * and can optionally be pushed to Supabase (if configured).
 *
 * Usage:
 *   npx tsx scripts/track-build-health.ts          — Record current build health
 *   npx tsx scripts/track-build-health.ts compare   — Compare current vs previous
 *   npx tsx scripts/track-build-health.ts history    — Show metric history
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(
  typeof import.meta.dirname === 'string' ? import.meta.dirname : path.dirname(new URL(import.meta.url).pathname),
  '..',
)
const HEALTH_FILE = path.join(ROOT, 'docs', 'plans', 'build-health.json')

interface BuildMetrics {
  timestamp: string
  gitCommit: string
  gitBranch: string
  buildSuccess: boolean
  buildTimeMs: number | null
  testResults: {
    total: number
    passed: number
    failed: number
    skipped: number
  } | null
  lintResults: {
    errorCount: number
    warningCount: number
  } | null
  designTokenLint: {
    violations: number
    pass: boolean
  } | null
  seoRouteLint: {
    pass: boolean
  } | null
  fileStats: {
    serverActionFiles: number
    componentFiles: number
    testFiles: number
    migrationFiles: number
    totalTsFiles: number
  }
  bundleInfo: {
    nextBuildOutputLines: number
  } | null
}

interface BuildHealthHistory {
  version: string
  entries: BuildMetrics[]
}

function loadHistory(): BuildHealthHistory {
  if (fs.existsSync(HEALTH_FILE)) {
    return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'))
  }
  return { version: '1.0', entries: [] }
}

function saveHistory(history: BuildHealthHistory): void {
  // Keep last 100 entries
  if (history.entries.length > 100) {
    history.entries = history.entries.slice(-100)
  }
  fs.writeFileSync(HEALTH_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8')
}

function runCommand(cmd: string, timeout = 30000): { stdout: string; success: boolean } {
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', timeout })
    return { stdout, success: true }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string }
    return { stdout: err.stdout ?? err.stderr ?? '', success: false }
  }
}

function getGitInfo(): { commit: string; branch: string } {
  const commit = runCommand('git rev-parse --short HEAD').stdout.trim()
  const branch = runCommand('git rev-parse --abbrev-ref HEAD').stdout.trim()
  return { commit, branch }
}

function countFiles(dir: string, pattern: RegExp): number {
  let count = 0
  function walk(d: string) {
    if (!fs.existsSync(d)) return
    const entries = fs.readdirSync(d, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (pattern.test(entry.name)) {
        count++
      }
    }
  }
  walk(dir)
  return count
}

function getFileStats(): BuildMetrics['fileStats'] {
  return {
    serverActionFiles: countFiles(path.join(ROOT, 'app', 'actions'), /\.ts$/),
    componentFiles: countFiles(path.join(ROOT, 'components'), /\.(tsx|ts)$/),
    testFiles: countFiles(path.join(ROOT, 'lib'), /\.test\.(ts|tsx)$/),
    migrationFiles: countFiles(path.join(ROOT, 'supabase', 'migrations'), /\.sql$/),
    totalTsFiles: countFiles(ROOT, /\.(ts|tsx)$/) - countFiles(path.join(ROOT, 'node_modules'), /\.ts$/),
  }
}

function runBuild(): { success: boolean; timeMs: number; outputLines: number } {
  const start = Date.now()
  const result = runCommand('npm run build', 300000)
  const timeMs = Date.now() - start
  const outputLines = result.stdout.split('\n').length
  return { success: result.success, timeMs, outputLines }
}

function runTests(): BuildMetrics['testResults'] {
  const result = runCommand('npm run test -- --reporter=json', 60000)
  try {
    // Parse vitest JSON output
    const lines = result.stdout.split('\n')
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        const json = JSON.parse(line)
        if (json.numTotalTests !== undefined) {
          return {
            total: json.numTotalTests ?? 0,
            passed: json.numPassedTests ?? 0,
            failed: json.numFailedTests ?? 0,
            skipped: (json.numTotalTests ?? 0) - (json.numPassedTests ?? 0) - (json.numFailedTests ?? 0),
          }
        }
      }
    }
  } catch {
    // Fall back to basic parsing
  }

  // Fallback: count test results from text output
  const passMatch = result.stdout.match(/(\d+)\s+pass/i)
  const failMatch = result.stdout.match(/(\d+)\s+fail/i)
  const totalMatch = result.stdout.match(/Tests\s+(\d+)/i)

  return {
    total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    passed: passMatch ? parseInt(passMatch[1], 10) : 0,
    failed: failMatch ? parseInt(failMatch[1], 10) : 0,
    skipped: 0,
  }
}

function runDesignTokenLint(): BuildMetrics['designTokenLint'] {
  const result = runCommand('npm run lint:design-tokens', 30000)
  const violationMatch = result.stdout.match(/(\d+)\s+violation/i)
  const violations = violationMatch ? parseInt(violationMatch[1], 10) : 0
  return { violations, pass: result.success }
}

function runSeoRouteLint(): BuildMetrics['seoRouteLint'] {
  const result = runCommand('npm run lint:seo-routes', 30000)
  return { pass: result.success }
}

function collectMetrics(): BuildMetrics {
  const { commit, branch } = getGitInfo()

  console.log('📊 Collecting build health metrics...\n')

  // File stats (fast)
  console.log('  Counting files...')
  const fileStats = getFileStats()
  console.log(`    ${fileStats.serverActionFiles} server actions, ${fileStats.componentFiles} components, ${fileStats.testFiles} test files`)

  // Tests
  console.log('  Running tests...')
  const testResults = runTests()
  console.log(`    ${testResults?.passed ?? 0} passed, ${testResults?.failed ?? 0} failed`)

  // Design token lint
  console.log('  Checking design tokens...')
  const designTokenLint = runDesignTokenLint()
  console.log(`    ${designTokenLint?.violations ?? 0} violations, ${designTokenLint?.pass ? 'pass' : 'fail'}`)

  // SEO route lint
  console.log('  Checking SEO routes...')
  const seoRouteLint = runSeoRouteLint()
  console.log(`    ${seoRouteLint?.pass ? 'pass' : 'fail'}`)

  // Build
  console.log('  Running build...')
  const buildResult = runBuild()
  console.log(`    ${buildResult.success ? 'success' : 'FAILED'} in ${(buildResult.timeMs / 1000).toFixed(1)}s`)

  return {
    timestamp: new Date().toISOString(),
    gitCommit: commit,
    gitBranch: branch,
    buildSuccess: buildResult.success,
    buildTimeMs: buildResult.timeMs,
    testResults,
    lintResults: null, // ESLint is slow and optional for tracking
    designTokenLint,
    seoRouteLint,
    fileStats,
    bundleInfo: {
      nextBuildOutputLines: buildResult.outputLines,
    },
  }
}

function printMetrics(metrics: BuildMetrics, prefix = ''): void {
  const icon = (pass: boolean) => pass ? '✅' : '❌'

  console.log(`${prefix}Build: ${icon(metrics.buildSuccess)} ${metrics.buildTimeMs ? `${(metrics.buildTimeMs / 1000).toFixed(1)}s` : 'N/A'}`)
  if (metrics.testResults) {
    console.log(`${prefix}Tests: ${metrics.testResults.passed}/${metrics.testResults.total} passed`)
  }
  if (metrics.designTokenLint) {
    console.log(`${prefix}Design tokens: ${icon(metrics.designTokenLint.pass)} (${metrics.designTokenLint.violations} violations)`)
  }
  if (metrics.seoRouteLint) {
    console.log(`${prefix}SEO routes: ${icon(metrics.seoRouteLint.pass)}`)
  }
  console.log(`${prefix}Files: ${metrics.fileStats.serverActionFiles} actions, ${metrics.fileStats.componentFiles} components, ${metrics.fileStats.testFiles} tests`)
}

function cmdRecord(): void {
  const metrics = collectMetrics()
  const history = loadHistory()
  history.entries.push(metrics)
  saveHistory(history)

  console.log('\n📋 Build Health Summary')
  console.log('─'.repeat(40))
  printMetrics(metrics, '  ')
  console.log(`\n✅ Recorded to ${path.relative(ROOT, HEALTH_FILE)}`)
  console.log(`  Total entries: ${history.entries.length}`)
}

function cmdCompare(): void {
  const history = loadHistory()
  if (history.entries.length < 2) {
    console.log('Need at least 2 entries to compare. Run `npx tsx scripts/track-build-health.ts` first.')
    return
  }

  const current = history.entries[history.entries.length - 1]
  const previous = history.entries[history.entries.length - 2]

  console.log('\n📊 Build Health Comparison')
  console.log('─'.repeat(50))

  console.log(`\nPrevious (${previous.gitCommit} on ${previous.gitBranch}):`)
  printMetrics(previous, '  ')

  console.log(`\nCurrent (${current.gitCommit} on ${current.gitBranch}):`)
  printMetrics(current, '  ')

  // Detect regressions
  console.log('\n🔍 Changes:')
  const changes: string[] = []

  if (previous.buildSuccess && !current.buildSuccess) {
    changes.push('⚠️  Build REGRESSION: was passing, now failing')
  }
  if (!previous.buildSuccess && current.buildSuccess) {
    changes.push('✅ Build FIXED: was failing, now passing')
  }

  if (previous.buildTimeMs && current.buildTimeMs) {
    const diff = current.buildTimeMs - previous.buildTimeMs
    const pct = ((diff / previous.buildTimeMs) * 100).toFixed(1)
    if (Math.abs(diff) > 5000) {
      changes.push(`${diff > 0 ? '⚠️' : '✅'} Build time: ${diff > 0 ? '+' : ''}${pct}% (${(diff / 1000).toFixed(1)}s)`)
    }
  }

  if (previous.testResults && current.testResults) {
    const newFails = current.testResults.failed - previous.testResults.failed
    if (newFails > 0) {
      changes.push(`⚠️  ${newFails} new test failure(s)`)
    }
    const newTests = current.testResults.total - previous.testResults.total
    if (newTests > 0) {
      changes.push(`✅ ${newTests} new test(s) added`)
    }
  }

  if (previous.designTokenLint && current.designTokenLint) {
    const diff = current.designTokenLint.violations - previous.designTokenLint.violations
    if (diff > 0) {
      changes.push(`⚠️  ${diff} new design token violation(s)`)
    } else if (diff < 0) {
      changes.push(`✅ ${-diff} design token violation(s) fixed`)
    }
  }

  const prevTestFiles = previous.fileStats.testFiles
  const currTestFiles = current.fileStats.testFiles
  if (currTestFiles > prevTestFiles) {
    changes.push(`✅ ${currTestFiles - prevTestFiles} new test file(s)`)
  }

  if (changes.length === 0) {
    changes.push('No significant changes detected')
  }

  for (const change of changes) {
    console.log(`  ${change}`)
  }
  console.log()
}

function cmdHistory(): void {
  const history = loadHistory()

  if (history.entries.length === 0) {
    console.log('No build health entries recorded yet.')
    return
  }

  console.log(`\n📈 Build Health History (${history.entries.length} entries)`)
  console.log('─'.repeat(80))
  console.log(`${'Date'.padEnd(12)} ${'Commit'.padEnd(10)} ${'Build'.padEnd(8)} ${'Time'.padEnd(8)} ${'Tests'.padEnd(10)} ${'Tokens'.padEnd(8)} ${'Actions'.padEnd(8)} ${'Tests'.padEnd(8)}`)
  console.log('─'.repeat(80))

  for (const entry of history.entries.slice(-20)) {
    const date = entry.timestamp.slice(0, 10)
    const commit = entry.gitCommit.slice(0, 7)
    const build = entry.buildSuccess ? '✅' : '❌'
    const time = entry.buildTimeMs ? `${(entry.buildTimeMs / 1000).toFixed(0)}s` : 'N/A'
    const tests = entry.testResults ? `${entry.testResults.passed}/${entry.testResults.total}` : 'N/A'
    const tokens = entry.designTokenLint ? (entry.designTokenLint.pass ? '✅' : `${entry.designTokenLint.violations}`) : 'N/A'
    const actions = String(entry.fileStats.serverActionFiles)
    const testFiles = String(entry.fileStats.testFiles)

    console.log(`${date.padEnd(12)} ${commit.padEnd(10)} ${build.padEnd(8)} ${time.padEnd(8)} ${tests.padEnd(10)} ${tokens.padEnd(8)} ${actions.padEnd(8)} ${testFiles.padEnd(8)}`)
  }
  console.log()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const command = process.argv[2] ?? 'record'

switch (command) {
  case 'record':
    cmdRecord()
    break
  case 'compare':
    cmdCompare()
    break
  case 'history':
    cmdHistory()
    break
  default:
    console.log(`
Build Health Tracker

Commands:
  record   — Collect and record current build metrics (default)
  compare  — Compare current vs previous build
  history  — Show metric history (last 20 entries)
`)
}
