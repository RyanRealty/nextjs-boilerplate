import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { getListingSyncStatusBreakdown } from '@/app/actions/listings'
import { getSparkListingsCountForSync, getSparkListingsCountsByStatus } from '@/lib/spark'

export const dynamic = 'force-dynamic'

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAdminRoleForEmail(user.email)
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const [statusBreakdownResult, sparkSyncCountResult, sparkCountsByStatusResult] = await Promise.allSettled([
      withTimeout(getListingSyncStatusBreakdown(), 12000, 'DB status breakdown'),
      withTimeout(getSparkListingsCountForSync(), 12000, 'Spark total count'),
      withTimeout(getSparkListingsCountsByStatus(), 12000, 'Spark status counts'),
    ])

    const statusBreakdown = statusBreakdownResult.status === 'fulfilled'
      ? statusBreakdownResult.value
      : {
          total: 0,
          active: 0,
          pending: 0,
          contingent: 0,
          closed: 0,
          closed_finalized: 0,
          expired: 0,
          withdrawn: 0,
          cancelled: 0,
          other: 0,
          by_city: [],
          error: `Listing status unavailable: ${statusBreakdownResult.reason instanceof Error ? statusBreakdownResult.reason.message : String(statusBreakdownResult.reason)}`,
        }
    const sparkSyncCount = sparkSyncCountResult.status === 'fulfilled'
      ? sparkSyncCountResult.value
      : {
          totalListings: 0,
          totalPages: 0,
          pageSize: 100,
          error: `Spark total unavailable: ${sparkSyncCountResult.reason instanceof Error ? sparkSyncCountResult.reason.message : String(sparkSyncCountResult.reason)}`,
        }
    const sparkCountsByStatus = sparkCountsByStatusResult.status === 'fulfilled'
      ? sparkCountsByStatusResult.value
      : {
          total: 0,
          active: 0,
          pending: 0,
          contingent: 0,
          closed: 0,
          expired: 0,
          withdrawn: 0,
          cancelled: 0,
          other: 0,
          error: `Spark status breakdown unavailable: ${sparkCountsByStatusResult.reason instanceof Error ? sparkCountsByStatusResult.reason.message : String(sparkCountsByStatusResult.reason)}`,
        }

    return NextResponse.json(
      {
        statusBreakdown,
        sparkSyncCount,
        sparkCountsByStatus,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        statusBreakdown: {
          total: 0,
          active: 0,
          pending: 0,
          contingent: 0,
          closed: 0,
          closed_finalized: 0,
          expired: 0,
          withdrawn: 0,
          cancelled: 0,
          other: 0,
          by_city: [],
          error: `Heavy sync diagnostics failed: ${message}`,
        },
        sparkSyncCount: {
          totalListings: 0,
          totalPages: 0,
          pageSize: 100,
          error: `Spark count failed: ${message}`,
        },
        sparkCountsByStatus: {
          total: 0,
          active: 0,
          pending: 0,
          contingent: 0,
          closed: 0,
          expired: 0,
          withdrawn: 0,
          cancelled: 0,
          other: 0,
          error: `Spark status breakdown failed: ${message}`,
        },
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  }
}
