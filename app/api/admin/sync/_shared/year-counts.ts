import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSparkListingsPage } from '@/lib/spark'

function yearBounds(year: number) {
  const fromIso = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString()
  const toIsoExclusive = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)).toISOString()
  return { fromIso, toIsoExclusive }
}

async function countWithRetry(
  run: () => Promise<{ count: number | null; error: { message?: string } | null }>,
  attempts = 3
): Promise<number> {
  for (let i = 0; i < attempts; i += 1) {
    const { count, error } = await run()
    if (!error) return count ?? 0
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)))
  }
  return 0
}

/** Count listings by OnMarketDate only — matches Spark's filter for apples-to-apples comparison. */
export async function countSupabaseListingsForYear(
  supabase: SupabaseClient,
  year: number
): Promise<number> {
  const { fromIso, toIsoExclusive } = yearBounds(year)
  return countWithRetry(async () =>
    await supabase
      .from('listings')
      .select('ListingKey', { count: 'exact', head: true })
      .gte('OnMarketDate', fromIso)
      .lt('OnMarketDate', toIsoExclusive)
  )
}

export async function countFinalizedClosedForYear(
  supabase: SupabaseClient,
  year: number
): Promise<number> {
  const { fromIso, toIsoExclusive } = yearBounds(year)
  return countWithRetry(async () =>
    await supabase
      .from('listings')
      .select('ListingKey', { count: 'exact', head: true })
      .eq('history_finalized', true)
      .gte('OnMarketDate', fromIso)
      .lt('OnMarketDate', toIsoExclusive)
  )
}

export async function getSparkListingsCountForYear(
  accessToken: string,
  year: number
): Promise<number> {
  const { fromIso, toIsoExclusive } = yearBounds(year)
  const filter = `OnMarketDate Ge ${fromIso} And OnMarketDate Lt ${toIsoExclusive}`
  const response = await fetchSparkListingsPage(accessToken, {
    page: 1,
    limit: 1,
    filter,
  })
  return Number(response.D?.Pagination?.TotalRows ?? 0)
}
