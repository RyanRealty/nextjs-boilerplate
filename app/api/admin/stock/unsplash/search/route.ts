/**
 * GET ?query=...&count=10 — Unsplash photo search (uses UNSPLASH_ACCESS_KEY server-side).
 * Admin session required. Follow Unsplash API guidelines for hotlinking and attribution on use.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { fetchPlacePhotoOptions } from '@/lib/photo-api'

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
    const count = Math.min(10, Math.max(1, Number(searchParams.get('count') ?? '8') || 8))

    if (!process.env.UNSPLASH_ACCESS_KEY?.trim()) {
      return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY not configured' }, { status: 503 })
    }

    const data = await fetchPlacePhotoOptions(query, count)
    return NextResponse.json({
      source: 'unsplash',
      query,
      data: data.map((d) => ({
        id: d.unsplashId ?? null,
        url: d.url,
        thumbUrl: d.thumbUrl,
        attribution: d.attribution,
        sourceUrl: d.sourceUrl,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/stock/unsplash/search', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
