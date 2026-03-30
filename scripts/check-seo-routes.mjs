import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components', 'lib']
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

const RULES = [
  {
    id: 'legacy-listings-path',
    pattern: /(['"`])\/listings(\b|[/?`'"])/g,
    message: 'Use canonical listings browse path `/homes-for-sale` (via `listingsBrowsePath()`).',
    allowPaths: [
      /^app[\\/]+listings[\\/]/,
      /^app[\\/]admin[\\/].*[\\/]listings[\\/]/,
    ],
  },
  {
    id: 'legacy-agents-path',
    pattern: /(['"`])\/agents(\b|[/?`'"])/g,
    message: 'Use canonical team path `/team` (via `teamPath()`).',
    allowPaths: [
      /^app[\\/]+agents[\\/]/,
    ],
  },
  {
    id: 'legacy-home-valuation-path',
    pattern: /(['"`])\/home-valuation(\b|[/?`'"])/g,
    message: 'Use canonical valuation path `/sell/valuation` (via `valuationPath()`).',
    allowPaths: [
      /^app[\\/]+home-valuation[\\/]/,
    ],
  },
]

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(full)
  }
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function normalizeForRule(relPath) {
  return relPath.replace(/\//g, path.sep)
}

const files = []
for (const dir of TARGET_DIRS) {
  const full = path.join(ROOT, dir)
  if (fs.existsSync(full)) walk(full, files)
}

const failures = []

for (const file of files) {
  const rel = toRel(file)
  const relForRule = normalizeForRule(rel)
  const content = fs.readFileSync(file, 'utf8')

  for (const rule of RULES) {
    if (rule.allowPaths.some((allow) => allow.test(relForRule))) continue
    rule.pattern.lastIndex = 0
    let match
    while ((match = rule.pattern.exec(content)) != null) {
      const line = content.slice(0, match.index).split('\n').length
      failures.push({
        rel,
        line,
        ruleId: rule.id,
        message: rule.message,
      })
    }
  }
}

if (failures.length > 0) {
  console.error('SEO route guardrails failed:\n')
  for (const failure of failures) {
    console.error(`- ${failure.rel}:${failure.line} [${failure.ruleId}] ${failure.message}`)
  }
  console.error('\nUpdate links to canonical helpers before merging.')
  process.exit(1)
}

console.log('SEO route guardrails passed.')
