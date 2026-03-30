import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import {
  countSupabaseListingsForYear,
  countFinalizedClosedForYear,
  getSparkListingsCountForYear,
} from '../_shared/year-counts'

export const dynamic = 'force-dynamic'

type YearCacheRow = {
  sparkListings?: number
  supabaseListings?: number
  finalizedListings?: number
  lastSyncedAt?: string | null
  lastError?: string | null
  runStatus?: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  runPhase?: string | null
  runStartedAt?: string | null
  runUpdatedAt?: string | null
  processedListings?: number
  totalListings?: number
  listingsUpserted?: number
  historyInserted?: number
  listingsFinalized?: number
}

const CACHE_VERSION = 2

type YearCachePayload = {
  version: number
  rows: Record<string, YearCacheRow>
  sparkMinYear?: number
  sparkMaxYear?: number
  updatedAt: string
}

function parseYearCache(raw: unknown): YearCachePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<YearCachePayload>
  if (typeof obj.version !== 'number' || !obj.rows || typeof obj.rows !== 'object') return null
  return obj as YearCachePayload
}

export async function GET(request: Request) {
  try {
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const accessToken = process.env.SPARK_API_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)

    const { searchParams } = new URL(request.url)
    const bootstrap = searchParams.get('bootstrap') === '1'

    const [{ data: syncState }, { data: cursorRow }] = await Promise.all([
      supabase.from('sync_state').select('year_sync_matrix_cache').eq('id', 'default').maybeSingle(),
      supabase.from('sync_year_cursor').select('current_year, phase, next_history_offset, total_listings').eq('id', 'default').maybeSingle(),
    ])

    const yearCache = parseYearCache((syncState as { year_sync_matrix_cache?: unknown } | null)?.year_sync_matrix_cache) ?? {
      version: 1,
      rows: {},
      updatedAt: new Date().toISOString(),
    }

    const currentYear = new Date().getUTCFullYear()
    const sparkOldestYear = typeof yearCache.sparkMinYear === 'number' ? yearCache.sparkMinYear : 1990
    const sparkNewestYear = typeof yearCache.sparkMaxYear === 'number' ? yearCache.sparkMaxYear : currentYear
    const minYear = Math.max(sparkOldestYear, 1990)
    const maxYear = Math.min(sparkNewestYear, currentYear)
    const sparkYears = minYear <= maxYear ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i) : []
    const cacheYears = Object.keys(yearCache.rows)
      .map((k) => Number(k))
      .filter((y) => Number.isFinite(y) && y >= 1990 && y <= currentYear)
    const years = [...new Set([...sparkYears, ...cacheYears])].sort((a, b) => b - a)

    const needsBootstrap =
      bootstrap &&
      accessToken?.trim() &&
      years.some((y) => {
        const c = yearCache.rows[String(y)]
        return typeof c?.sparkListings !== 'number' || typeof c?.supabaseListings !== 'number'
      })

    if (needsBootstrap) {
      const BATCH = 5
      for (let i = 0; i < years.length; i += BATCH) {
        const chunk = years.slice(i, i + BATCH)
        await Promise.all(
          chunk.map(async (year) => {
            const [sparkListings, supabaseListings, finalizedListings] = await Promise.all([
              getSparkListingsCountForYear(accessToken!, year),
              countSupabaseListingsForYear(supabase, year),
              countFinalizedClosedForYear(supabase, year),
            ])
            const existing = yearCache.rows[String(year)] ?? {}
            yearCache.rows[String(year)] = {
              ...existing,
              sparkListings,
              supabaseListings,
              finalizedListings,
              ...(existing.runStatus === 'running'
                ? {
                    runStatus: 'running' as const,
                    runPhase: existing.runPhase,
                    runUpdatedAt: existing.runUpdatedAt,
                  }
                : {}),
            }
          })
        )
      }
      yearCache.sparkMinYear = minYear
      yearCache.sparkMaxYear = maxYear
      yearCache.version = CACHE_VERSION
      yearCache.updatedAt = new Date().toISOString()
      await supabase
        .from('sync_state')
        .upsert(
          {
            id: 'default',
            year_sync_matrix_cache: yearCache,
            updated_at: yearCache.updatedAt,
          },
          { onConflict: 'id' }
        )
    }

    const rows: Array<{
      year: number
      sparkListings: number | null
      supabaseListings: number | null
      finalizedListings: number | null
      lastSyncedAt: string | null
      lastError: string | null
      runStatus: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
      runPhase: string | null
      runStartedAt: string | null
      runUpdatedAt: string | null
      processedListings: number
      totalListings: number
      listingsUpserted: number
      historyInserted: number
      listingsFinalized: number
    }> = []

    const cursor = cursorRow as {
      current_year?: number | null
      phase?: string | null
      next_history_offset?: number
      total_listings?: number | null
    } | null
    const cursorActive =
      cursor?.current_year != null &&
      cursor?.phase !== 'idle' &&
      cursor?.phase !== 'pick_next'

    for (const year of years) {
      const cached = yearCache.rows[String(year)]
      const isCursorYear = cursorActive && cursor?.current_year === year
      const runStatus = isCursorYear
        ? ('running' as const)
        : cursorActive && cursor?.current_year !== year
          ? ('idle' as const)
          : (cached?.runStatus ?? 'idle')
      const runPhase = isCursorYear ? (cursor?.phase ?? cached?.runPhase ?? null) : (cached?.runPhase ?? null)
      const processedListings = isCursorYear ? Number(cursor?.next_history_offset ?? cached?.processedListings ?? 0) : Number(cached?.processedListings ?? 0)
      const totalListings = isCursorYear ? Number(cursor?.total_listings ?? cached?.totalListings ?? 0) : Number(cached?.totalListings ?? 0)
      rows.push({
        year,
        sparkListings: typeof cached?.sparkListings === 'number' ? cached.sparkListings : null,
        supabaseListings: typeof cached?.supabaseListings === 'number' ? cached.supabaseListings : null,
        finalizedListings: typeof cached?.finalizedListings === 'number' ? cached.finalizedListings : null,
        lastSyncedAt: cached?.lastSyncedAt ?? null,
        lastError: cached?.lastError ?? null,
        runStatus,
        runPhase,
        runStartedAt: cached?.runStartedAt ?? null,
        runUpdatedAt: cached?.runUpdatedAt ?? null,
        processedListings,
        totalListings,
        listingsUpserted: Number(cached?.listingsUpserted ?? 0),
        historyInserted: Number(cached?.historyInserted ?? 0),
        listingsFinalized: Number(cached?.listingsFinalized ?? 0),
      })
    }

    const filtered = rows.filter((row) => {
      const spark = row.sparkListings
      const supabase = row.supabaseListings
      const vacant = typeof spark === 'number' && typeof supabase === 'number' && spark === 0 && supabase === 0
      return !vacant
    })

    return NextResponse.json(
      {
        ok: true,
        rows: filtered,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
