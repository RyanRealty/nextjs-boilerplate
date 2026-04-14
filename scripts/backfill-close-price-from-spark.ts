/**
 * Re-fetch closed listings with NULL ClosePrice from Spark and upsert typed ClosePrice / OriginalListPrice.
 * Run after lib/spark.ts mapping fix is deployed and history backfill has run.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-close-price-from-spark.ts --dry-run --limit 20
 *   npx tsx --env-file=.env.local scripts/backfill-close-price-from-spark.ts --apply --limit 100 --delay-ms 250
 *
 * Optional: --before-year=2024  only rows with CloseDate < YYYY-01-01
 */

import { createClient } from '@supabase/supabase-js'
import { fetchSparkListingByKey, sparkListingToSupabaseRow } from '../lib/spark'

function argFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function argInt(name: string, fallback: number) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!m) return fallback
  const v = Number(m.split('=')[1])
  return Number.isFinite(v) ? v : fallback
}

function argYear(name: string): number | null {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!m) return null
  const v = Number(m.split('=')[1])
  return Number.isFinite(v) ? v : null
}

const dryRun = argFlag('dry-run') || !argFlag('apply')
const limit = Math.max(1, Math.min(500, argInt('limit', 100)))
const delayMs = Math.max(0, argInt('delay-ms', 200))
const beforeYear = argYear('before-year')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sparkKey = process.env.SPARK_API_KEY

if (!url?.trim() || !serviceKey?.trim()) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!sparkKey?.trim()) {
  console.error('Missing SPARK_API_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  let q = supabase
    .from('listings')
    .select('ListingKey, ListNumber')
    .ilike('StandardStatus', '%Closed%')
    .is('ClosePrice', null)
    .order('CloseDate', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (beforeYear != null) {
    q = q.lt('CloseDate', `${beforeYear}-01-01`)
  }

  const { data: rows, error } = await q
  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const list = (rows ?? []) as { ListingKey?: string | null; ListNumber?: string | null }[]
  console.log(JSON.stringify({ dryRun, limit, delayMs, beforeYear, selected: list.length }, null, 2))

  let fetched = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of list) {
    const keys = [row.ListingKey, row.ListNumber].map((k) => (k ?? '').toString().trim()).filter(Boolean)
    const uniqueKeys = [...new Set(keys)]
    if (uniqueKeys.length === 0) {
      skipped += 1
      continue
    }

    let rowOut: ReturnType<typeof sparkListingToSupabaseRow> | null = null
    for (const k of uniqueKeys) {
      try {
        const resp = await fetchSparkListingByKey(sparkKey, k)
        const result = resp?.D?.Results?.[0]
        if (result) {
          rowOut = sparkListingToSupabaseRow(result)
          break
        }
      } catch {
        // try next key
      }
    }

    fetched += 1
    const close = rowOut?.ClosePrice as number | null | undefined
    const olp = rowOut?.OriginalListPrice as number | null | undefined

    if (close == null && olp == null) {
      skipped += 1
    } else if (dryRun) {
      console.log(
        JSON.stringify({
          listingKey: row.ListingKey,
          listNumber: row.ListNumber,
          wouldSet: { ClosePrice: close ?? null, OriginalListPrice: olp ?? null },
        })
      )
    } else {
      const patch: Record<string, unknown> = {}
      if (close != null) patch.ClosePrice = close
      if (olp != null) patch.OriginalListPrice = olp
      const { error: upErr } = await supabase.from('listings').update(patch).eq('ListingKey', row.ListingKey)
      if (upErr) {
        console.error('[update]', row.ListingKey, upErr.message)
        errors += 1
      } else {
        updated += 1
      }
    }

    if (delayMs > 0) await sleep(delayMs)
  }

  console.log(JSON.stringify({ fetched, updated, skipped, errors, dryRun }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
