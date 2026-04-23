/**
 * GET ?query=...&per_page=12 — Pexels photo search (PEXELS_API_KEY server-side).
 * Admin session required. Follow Pexels guidelines for attribution when using photos.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { searchPexelsPhotos } from '@/lib/pexels-api'

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
    const perPage = Number(searchParams.get('per_page') ?? '12') || 12

    const result = await searchPexelsPhotos(query, { perPage })
    if (!result.ok) {
      const status =
        result.status && result.status >= 400 && result.status < 600 ? result.status : result.error.includes('not set') ? 503 : 502
      return NextResponse.json({ error: result.error, upstreamStatus: result.status ?? null }, { status })
    }
    return NextResponse.json({
      source: 'pexels',
      query,
      data: result.data.map((p) => ({
        id: p.id,
        url: p.url,
        thumbUrl: p.thumbUrl,
        photographer: p.photographer,
        photographerUrl: p.photographerUrl,
        width: p.width,
        height: p.height,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/stock/pexels/search', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
