#!/usr/bin/env node
/**
 * Bulk ingest the entire Google Drive ASSET_LIBRARY into the Supabase
 * asset_library + Storage bucket.
 *
 * Walks every PHOTOS/by_subject/<city>/, VIDEOS/market_reports/<city>/,
 * and brand folder, ingesting each file with proper geo + subject tags
 * inferred from the folder path. Idempotent — uses source_id = drive:<file-id>
 * for dedup, so re-runs skip already-imported files.
 *
 * Run: node --env-file=.env.local scripts/ingest-drive-asset-library.mjs
 *      [--dry-run]                  # list only, don't ingest
 *      [--folders bend,redmond]     # limit to specific folders
 */

import { ingestFolder } from '../lib/drive-ingest.mjs'

// Folder map: every Drive folder ID + the tagging strategy for files inside it
const FOLDERS = [
  // Photos by city
  { tag: 'photos/bend',          id: '1884DS6ArT8aURfmPUegXeuxa02NrwelZ', type: 'photo', geo: 'bend,central-oregon',         subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/redmond',       id: '1vKR1sBKlixJ7JD1jhN5HCpIohidPjdyo', type: 'photo', geo: 'redmond,central-oregon',      subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/sisters',       id: '16J-PqrKaxC_FSzNI__XWIK4Hpeeb5zcv', type: 'photo', geo: 'sisters,central-oregon',      subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/sunriver',      id: '1733fmuwZVGKOBp-bsU8CYePJQnhfb4u5', type: 'photo', geo: 'sunriver,central-oregon',     subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/prineville',    id: '1Wzty2d0awfAV2m9vDcujE0eaqy8fgXgH', type: 'photo', geo: 'prineville,central-oregon',   subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/tumalo',        id: '1sl5xwBxnO-kTS-Z2sCSp2Xtewa6vh-NT', type: 'photo', geo: 'tumalo,central-oregon',       subject: 'landscape,exterior',  source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'photos/smith_rock',    id: '1F9b6aKZd3ROn9REddSkaA9gKYQi4SsFg', type: 'photo', geo: 'smith-rock,central-oregon',   subject: 'landscape,landmark,canyon', source: 'curated', license: 'owned', approval: 'approved' },
  // brand assets
  { tag: 'photos/brand',         id: '1PivZZLRH1u9F2tstL8C4u0v9eR_qoG8S', type: 'photo', geo: '',                            subject: 'brand,logo,marketing,template', source: 'curated', license: 'owned', approval: 'approved' },
  // Videos by city (market reports)
  { tag: 'videos/bend',          id: '1oQcXDP2inOqbvEKEltL42yltw0CZ68mp', type: 'video', geo: 'bend,central-oregon',         subject: 'b-roll,market-report,broll', source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'videos/redmond',       id: '1Jo6S7O1Ia66umtN0j7ysftxhR-HAnplQ', type: 'video', geo: 'redmond,central-oregon',      subject: 'b-roll,market-report,broll', source: 'curated', license: 'owned', approval: 'approved' },
  { tag: 'videos/sisters',       id: '1-eX1oxxt6fR4TPPX2nNc1TKBgxqhhccq', type: 'video', geo: 'sisters,central-oregon',      subject: 'b-roll,market-report,broll', source: 'curated', license: 'owned', approval: 'approved' },
]

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) out[a.slice(2, eq)] = a.slice(eq + 1)
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { out[a.slice(2)] = argv[++i] }
      else { out[a.slice(2)] = true }
    } else out._.push(a)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const dryRun = !!args['dry-run']
const onlyFolders = args.folders
  ? args.folders.split(',').map(s => s.trim().toLowerCase())
  : null

const targets = onlyFolders
  ? FOLDERS.filter(f => onlyFolders.some(o => f.tag.toLowerCase().includes(o)))
  : FOLDERS

console.log(`\n=== Bulk Drive ingestion → asset library ===`)
console.log(`Targets: ${targets.length} folders`)
console.log(`Dry run: ${dryRun}`)
console.log()

const totals = { folders: 0, files_attempted: 0, files_ingested: 0, files_skipped: 0, errors: 0 }
const startedAt = Date.now()

for (const folder of targets) {
  console.log(`\n──── ${folder.tag} ────`)
  console.log(`  Drive folder: ${folder.id}`)
  console.log(`  Tags: type=${folder.type}, geo=${folder.geo || '(none)'}, subject=${folder.subject}, source=${folder.source}, license=${folder.license}, approval=${folder.approval}`)
  try {
    const assets = await ingestFolder(folder.id, {
      type: folder.type,
      geo: folder.geo,
      subject: folder.subject,
      source: folder.source,
      license: folder.license,
      approval: folder.approval,
      max: 5000,
      dryRun,
    })
    if (dryRun) {
      console.log(`  DRY RUN — would ingest ${assets.length} files`)
      totals.files_attempted += assets.length
    } else {
      totals.files_ingested += assets.length
      console.log(`  ✓ Ingested: ${assets.length}`)
    }
    totals.folders += 1
  } catch (e) {
    console.error(`  ✗ FAILED: ${e.message}`)
    totals.errors += 1
  }
}

const dur = Math.round((Date.now() - startedAt) / 1000)
console.log()
console.log(`=== Summary ===`)
console.log(`  Folders processed: ${totals.folders}`)
console.log(`  Files ingested:    ${totals.files_ingested}`)
console.log(`  Errors:            ${totals.errors}`)
console.log(`  Duration:          ${Math.floor(dur / 60)}m ${dur % 60}s`)
