#!/usr/bin/env tsx
/**
 * Test Coverage Expansion Script
 *
 * Scans server actions and lib files, identifies exported functions
 * without tests, and generates stub test files.
 *
 * Usage:
 *   npx tsx scripts/generate-test-stubs.ts              — Show coverage report
 *   npx tsx scripts/generate-test-stubs.ts generate      — Generate stub test files
 *   npx tsx scripts/generate-test-stubs.ts generate --dry — Preview what would be generated
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(
  typeof import.meta.dirname === 'string' ? import.meta.dirname : path.dirname(new URL(import.meta.url).pathname),
  '..',
)

interface ExportedFunction {
  name: string
  file: string
  relPath: string
  isAsync: boolean
  hasTest: boolean
}

interface CoverageReport {
  totalFunctions: number
  testedFunctions: number
  untestedFunctions: number
  coveragePct: number
  byFile: Array<{
    file: string
    total: number
    tested: number
    untested: string[]
  }>
}

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (pattern.test(entry.name)) {
        results.push(full)
      }
    }
  }
  walk(dir)
  return results
}

function extractExports(filePath: string): Array<{ name: string; isAsync: boolean }> {
  const content = fs.readFileSync(filePath, 'utf8')
  const exports: Array<{ name: string; isAsync: boolean }> = []

  // Match: export async function name(
  const asyncFnRegex = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match
  while ((match = asyncFnRegex.exec(content)) !== null) {
    exports.push({ name: match[1], isAsync: true })
  }

  // Match: export function name(
  const fnRegex = /export\s+function\s+(\w+)\s*\(/g
  while ((match = fnRegex.exec(content)) !== null) {
    if (!exports.find(e => e.name === match![1])) {
      exports.push({ name: match[1], isAsync: false })
    }
  }

  // Match: export const name = async (
  const constAsyncRegex = /export\s+const\s+(\w+)\s*=\s*async\s*[\(]/g
  while ((match = constAsyncRegex.exec(content)) !== null) {
    if (!exports.find(e => e.name === match![1])) {
      exports.push({ name: match[1], isAsync: true })
    }
  }

  // Match: export const name = (
  const constFnRegex = /export\s+const\s+(\w+)\s*=\s*[\(]/g
  while ((match = constFnRegex.exec(content)) !== null) {
    if (!exports.find(e => e.name === match![1])) {
      exports.push({ name: match[1], isAsync: false })
    }
  }

  // Filter out type exports and obvious non-function exports
  return exports.filter(e => {
    // Skip common type/constant naming patterns
    if (/^[A-Z_]+$/.test(e.name)) return false // CONSTANTS
    if (e.name.startsWith('use') && !e.name.startsWith('useT')) return true // hooks
    return true
  })
}

function findExistingTests(): Set<string> {
  const testFiles = findFiles(path.join(ROOT, 'lib'), /\.test\.(ts|tsx)$/)
  const testedFunctions = new Set<string>()

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf8')

    // Extract test descriptions and imports
    const importRegex = /import\s*{([^}]+)}\s*from/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1].split(',').map(s => s.trim())
      for (const imp of imports) {
        testedFunctions.add(imp)
      }
    }

    // Also check for function names in test descriptions
    const describeRegex = /(?:describe|it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
    while ((match = describeRegex.exec(content)) !== null) {
      // Extract potential function names from descriptions
      const words = match[1].split(/\s+/)
      for (const word of words) {
        if (/^[a-z][a-zA-Z]+$/.test(word)) {
          testedFunctions.add(word)
        }
      }
    }
  }

  return testedFunctions
}

function buildCoverageReport(): { report: CoverageReport; functions: ExportedFunction[] } {
  const testedFunctions = findExistingTests()
  const allFunctions: ExportedFunction[] = []

  // Scan server actions
  const actionFiles = findFiles(path.join(ROOT, 'app', 'actions'), /\.ts$/)
  for (const file of actionFiles) {
    const relPath = path.relative(ROOT, file)
    const exports = extractExports(file)
    for (const exp of exports) {
      allFunctions.push({
        name: exp.name,
        file,
        relPath,
        isAsync: exp.isAsync,
        hasTest: testedFunctions.has(exp.name),
      })
    }
  }

  // Scan lib files
  const libFiles = findFiles(path.join(ROOT, 'lib'), /\.ts$/).filter(f => !f.includes('.test.'))
  for (const file of libFiles) {
    const relPath = path.relative(ROOT, file)
    const exports = extractExports(file)
    for (const exp of exports) {
      allFunctions.push({
        name: exp.name,
        file,
        relPath,
        isAsync: exp.isAsync,
        hasTest: testedFunctions.has(exp.name),
      })
    }
  }

  // Build per-file report
  const byFile = new Map<string, { total: number; tested: number; untested: string[] }>()
  for (const fn of allFunctions) {
    if (!byFile.has(fn.relPath)) {
      byFile.set(fn.relPath, { total: 0, tested: 0, untested: [] })
    }
    const entry = byFile.get(fn.relPath)!
    entry.total++
    if (fn.hasTest) {
      entry.tested++
    } else {
      entry.untested.push(fn.name)
    }
  }

  const totalFunctions = allFunctions.length
  const testedCount = allFunctions.filter(f => f.hasTest).length

  const report: CoverageReport = {
    totalFunctions,
    testedFunctions: testedCount,
    untestedFunctions: totalFunctions - testedCount,
    coveragePct: totalFunctions > 0 ? Math.round((testedCount / totalFunctions) * 100) : 0,
    byFile: Array.from(byFile.entries())
      .map(([file, data]) => ({ file, ...data }))
      .sort((a, b) => b.untested.length - a.untested.length),
  }

  return { report, functions: allFunctions }
}

function generateTestStub(file: string, functions: ExportedFunction[]): string {
  const relImport = path.relative(path.join(ROOT, 'lib'), file).replace(/\.ts$/, '')
  const importPath = file.startsWith(path.join(ROOT, 'app'))
    ? `@/${path.relative(ROOT, file).replace(/\.ts$/, '')}`
    : `@/lib/${relImport}`

  const fnNames = functions.map(f => f.name)

  let stub = `import { describe, it, expect, vi } from 'vitest'\n`
  stub += `// import { ${fnNames.join(', ')} } from '${importPath}'\n\n`
  stub += `// Mock Supabase client\n`
  stub += `vi.mock('@/lib/supabase/server', () => ({\n`
  stub += `  createClient: vi.fn(() => ({\n`
  stub += `    from: vi.fn(() => ({\n`
  stub += `      select: vi.fn().mockReturnThis(),\n`
  stub += `      insert: vi.fn().mockReturnThis(),\n`
  stub += `      update: vi.fn().mockReturnThis(),\n`
  stub += `      delete: vi.fn().mockReturnThis(),\n`
  stub += `      eq: vi.fn().mockReturnThis(),\n`
  stub += `      order: vi.fn().mockReturnThis(),\n`
  stub += `      limit: vi.fn().mockReturnThis(),\n`
  stub += `      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),\n`
  stub += `    })),\n`
  stub += `  })),\n`
  stub += `}))\n\n`

  for (const fn of functions) {
    stub += `describe('${fn.name}', () => {\n`
    stub += `  it.todo('should return expected data shape')\n`
    if (fn.isAsync) {
      stub += `  it.todo('should handle errors gracefully')\n`
      stub += `  it.todo('should return { data, error } format')\n`
    }
    stub += `})\n\n`
  }

  return stub
}

function cmdReport(): void {
  const { report } = buildCoverageReport()

  console.log(`\n📊 Test Coverage Report`)
  console.log('─'.repeat(60))
  console.log(`Total exported functions: ${report.totalFunctions}`)
  console.log(`Tested: ${report.testedFunctions} (${report.coveragePct}%)`)
  console.log(`Untested: ${report.untestedFunctions}`)

  const bar = '█'.repeat(Math.round(report.coveragePct / 5)) + '░'.repeat(20 - Math.round(report.coveragePct / 5))
  console.log(`Coverage: ${bar} ${report.coveragePct}%`)
  console.log()

  // Show files with most untested functions
  console.log('Files with untested functions (top 20):')
  console.log()
  for (const file of report.byFile.slice(0, 20)) {
    if (file.untested.length === 0) continue
    const pct = file.total > 0 ? Math.round((file.tested / file.total) * 100) : 0
    console.log(`  ${file.file} (${file.tested}/${file.total} = ${pct}%)`)
    for (const fn of file.untested.slice(0, 5)) {
      console.log(`    ○ ${fn}`)
    }
    if (file.untested.length > 5) {
      console.log(`    ... and ${file.untested.length - 5} more`)
    }
  }
  console.log()
}

function cmdGenerate(dryRun: boolean): void {
  const { functions } = buildCoverageReport()

  // Group untested functions by file
  const byFile = new Map<string, ExportedFunction[]>()
  for (const fn of functions.filter(f => !f.hasTest)) {
    if (!byFile.has(fn.file)) byFile.set(fn.file, [])
    byFile.get(fn.file)!.push(fn)
  }

  let generated = 0
  for (const [file, fns] of byFile) {
    // Determine test file path
    const relPath = path.relative(ROOT, file)
    let testPath: string

    if (relPath.startsWith('app/actions/')) {
      // Server actions → lib/actions-tests/
      const basename = path.basename(file, '.ts')
      testPath = path.join(ROOT, 'lib', `${basename}.test.ts`)
    } else if (relPath.startsWith('lib/')) {
      const basename = path.basename(file, '.ts')
      testPath = path.join(ROOT, 'lib', `${basename}.test.ts`)
    } else {
      continue
    }

    // Skip if test file already exists
    if (fs.existsSync(testPath)) {
      if (!dryRun) {
        console.log(`  ⏭️  ${path.relative(ROOT, testPath)} already exists, skipping`)
      }
      continue
    }

    const stub = generateTestStub(file, fns)

    if (dryRun) {
      console.log(`\n📝 Would create: ${path.relative(ROOT, testPath)}`)
      console.log(`   Functions: ${fns.map(f => f.name).join(', ')}`)
    } else {
      fs.writeFileSync(testPath, stub, 'utf8')
      console.log(`  ✅ Created: ${path.relative(ROOT, testPath)} (${fns.length} test stubs)`)
      generated++
    }
  }

  if (dryRun) {
    console.log(`\n${byFile.size} test files would be generated.`)
    console.log('Run without --dry to create them.')
  } else {
    console.log(`\n✅ Generated ${generated} test stub files.`)
    console.log('Test stubs use it.todo() — fill in the test implementations.')
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const command = process.argv[2] ?? 'report'
const dryRun = process.argv.includes('--dry')

switch (command) {
  case 'report':
    cmdReport()
    break
  case 'generate':
    cmdGenerate(dryRun)
    break
  default:
    console.log(`
Test Coverage Expansion Script

Commands:
  report              — Show test coverage report (default)
  generate            — Generate stub test files for untested functions
  generate --dry      — Preview what would be generated
`)
}
