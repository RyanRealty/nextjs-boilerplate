'use server'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  if (!url?.trim() || !anonKey?.trim()) throw new Error('Supabase not configured')
  return createClient(url, anonKey)
}

export type VideoListingRow = {
  listing_key: string
  list_price: number | null
  beds_total: number | null
  baths_full: number | null
  living_area: number | null
  subdivision_name: string | null
  city: string | null
  unparsed_address: string | null
  photo_url: string | null
  video_url: string
  video_source: 'virtual_tour' | 'listing_video'
}

export async function getListingsWithVideos(filters?: {
  community?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'most_viewed' | 'price_desc'
  status?: 'active' | 'all'
  limit?: number
}): Promise<VideoListingRow[]> {
  const supabase = getSupabase()
  const maxRows = Math.min(Math.max(filters?.limit ?? 24, 1), 60)
  const candidateLimit = Math.min(Math.max(maxRows * 8, 80), 240)

  const { data: videoRows } = await supabase
    .from('listing_videos')
    .select('listing_key, video_url')
    .limit(candidateLimit)

  const keysFromVideos = [...new Set((videoRows ?? []).map((r: { listing_key: string }) => r.listing_key))]
  const { data: listWithVirtual } = await supabase
    .from('listings')
    .select('listing_key, list_price, beds_total, baths_full, living_area, subdivision_name, property_id, virtual_tour_url, standard_status, modification_timestamp')
    .not('virtual_tour_url', 'is', null)
    .order('list_price', { ascending: false, nullsFirst: false })
    .limit(candidateLimit)

  const keysFromVirtual = (listWithVirtual ?? []).map((r: { listing_key: string }) => r.listing_key)
  const allKeys = [...new Set([...keysFromVideos, ...keysFromVirtual])]
  if (allKeys.length === 0) return []

  const { data: listRows } = await supabase
    .from('listings')
    .select('listing_key, list_price, beds_total, baths_full, living_area, subdivision_name, property_id, virtual_tour_url, standard_status, modification_timestamp')
    .in('listing_key', allKeys)
    .order('list_price', { ascending: false, nullsFirst: false })
    .limit(candidateLimit)

  const propIds = [...new Set((listRows ?? []).map((l: { property_id?: string }) => l.property_id).filter(Boolean))]
  const { data: propRows } = await supabase.from('properties').select('id, city, unparsed_address').in('id', propIds)
  const { data: photoRows } = await supabase.from('listing_photos').select('listing_key, photo_url').eq('is_hero', true).in('listing_key', allKeys)

  const propById = new Map((propRows ?? []).map((p) => [(p as { id: string }).id, p]))
  const photoByKey = new Map((photoRows ?? []).map((r) => [(r as { listing_key: string }).listing_key, (r as { photo_url: string }).photo_url]))
  const videoByKey = new Map((videoRows ?? []).map((r) => [(r as { listing_key: string }).listing_key, (r as { video_url: string }).video_url]))

  const rows: VideoListingRow[] = []
  for (const row of listRows ?? []) {
    const r = row as {
      listing_key: string
      list_price?: number
      beds_total?: number
      baths_full?: number
      living_area?: number
      subdivision_name?: string
      property_id?: string
      virtual_tour_url?: string
      standard_status?: string
      modification_timestamp?: string
    }
    const videoUrl = videoByKey.get(r.listing_key) ?? r.virtual_tour_url
    if (!videoUrl) continue
    if (filters?.status !== 'all') {
      const status = (r.standard_status ?? '').toLowerCase()
      const isActive =
        status.length === 0 ||
        status.includes('active') ||
        status.includes('for sale') ||
        status.includes('coming soon')
      if (!isActive) continue
    }
    const prop = propById.get(r.property_id ?? '') as { city?: string; unparsed_address?: string } | undefined
    if (filters?.community && r.subdivision_name !== filters.community) continue
    if (filters?.city && prop?.city !== filters.city) continue
    const price = r.list_price ?? null
    if (filters?.minPrice != null && (price == null || price < filters.minPrice)) continue
    if (filters?.maxPrice != null && (price == null || price > filters.maxPrice)) continue
    rows.push({
      listing_key: r.listing_key,
      list_price: price,
      beds_total: r.beds_total ?? null,
      baths_full: r.baths_full ?? null,
      living_area: r.living_area ?? null,
      subdivision_name: r.subdivision_name ?? null,
      city: prop?.city ?? null,
      unparsed_address: prop?.unparsed_address ?? null,
      photo_url: photoByKey.get(r.listing_key) ?? null,
      video_url: videoUrl,
      video_source: videoByKey.get(r.listing_key) ? 'listing_video' : 'virtual_tour',
    })
  }
  if (filters?.sort === 'price_desc') {
    rows.sort((a, b) => (b.list_price ?? 0) - (a.list_price ?? 0))
  }
  return rows.slice(0, maxRows)
}
