/**
 * GET ?query=...&per_page=10&page=1 — Shutterstock image search (preview URLs only).
 * Admin session required. Does not license assets.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { searchShutterstockImages } from '@/lib/shutterstock-api'

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAdminRoleForEmail(user.email)
    if (!role) {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') ?? ''
    const perPage = Number(searchParams.get('per_page') ?? '10') || 10
    const page = Number(searchParams.get('page') ?? '1') || 1

    const result = await searchShutterstockImages(query, { perPage, page })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 }
      )
    }
    return NextResponse.json({ source: 'shutterstock', query, data: result.data })
  } catch (e) {
    console.error('GET /api/admin/stock/shutterstock/search', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
