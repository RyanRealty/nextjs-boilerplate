'use server'

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { pickFirstVideoFromDetails } from '@/lib/pick-video-from-details'

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

const LISTING_VIDEO_SELECT_BASE =
  'ListingKey, ListPrice, BedroomsTotal, BathroomsTotal, TotalLivingAreaSqFt, SubdivisionName, City, StreetNumber, StreetName, PhotoURL, StandardStatus, details, ModificationTimestamp'

const ACTIVE_STATUS_OR =
  'StandardStatus.is.null,StandardStatus.ilike.%Active%,StandardStatus.ilike.%For Sale%,StandardStatus.ilike.%Coming Soon%'

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
  const candidateLimit = Math.min(Math.max(maxRows * 25, 200), 900)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFiltersAndOrder(q: any) {
    let query = q
    if (filters?.status !== 'all') {
      query = query.or(ACTIVE_STATUS_OR)
    }
    if (filters?.sort === 'price_desc') {
      query = query.order('ListPrice', { ascending: false, nullsFirst: false })
    } else {
      query = query.order('ModificationTimestamp', { ascending: false, nullsFirst: false })
    }
    return query.limit(candidateLimit)
  }

  const seenKeys = new Set<string>()
  const listRows: Array<Record<string, unknown>> = []

  const tourRes = await applyFiltersAndOrder(
    supabase.from('listings').select(`${LISTING_VIDEO_SELECT_BASE}, has_virtual_tour`).eq('has_virtual_tour', true)
  )
  const tourErr = tourRes.error?.message ?? ''
  if (
    !tourRes.error &&
    Array.isArray(tourRes.data) &&
    tourRes.data.length > 0
  ) {
    for (const row of tourRes.data as Array<Record<string, unknown>>) {
      const k = String(row.ListingKey ?? '').trim()
      if (!k || seenKeys.has(k)) continue
      seenKeys.add(k)
      listRows.push(row)
    }
  } else if (tourRes.error && !/has_virtual_tour|column/i.test(tourErr)) {
    console.error('[getListingsWithVideos] has_virtual_tour query', tourRes.error)
  }

  if (listRows.length < candidateLimit) {
    const broadRes = await applyFiltersAndOrder(
      supabase.from('listings').select(LISTING_VIDEO_SELECT_BASE)
    )
    if (broadRes.error) {
      console.error('[getListingsWithVideos] broad query', broadRes.error)
    } else {
      for (const row of (broadRes.data ?? []) as Array<Record<string, unknown>>) {
        const k = String(row.ListingKey ?? '').trim()
        if (!k || seenKeys.has(k)) continue
        seenKeys.add(k)
        listRows.push(row)
        if (listRows.length >= candidateLimit) break
      }
    }
  }

  const rows: VideoListingRow[] = []
  for (const row of listRows) {
    const r = row as {
      ListingKey?: string | null
      ListPrice?: number | null
      BedroomsTotal?: number | null
      BathroomsTotal?: number | null
      TotalLivingAreaSqFt?: number | null
      SubdivisionName?: string | null
      City?: string | null
      StreetNumber?: string | null
      StreetName?: string | null
      PhotoURL?: string | null
      details?: unknown
    }
    const listingKey = String(r.ListingKey ?? '').trim()
    if (!listingKey) continue
    const video = pickFirstVideoFromDetails(r.details)
    if (!video) continue
    if (filters?.community && r.SubdivisionName !== filters.community) continue
    if (filters?.city && r.City !== filters.city) continue
    const price = r.ListPrice ?? null
    if (filters?.minPrice != null && (price == null || price < filters.minPrice)) continue
    if (filters?.maxPrice != null && (price == null || price > filters.maxPrice)) continue
    const unparsedAddress = [String(r.StreetNumber ?? '').trim(), String(r.StreetName ?? '').trim()]
      .filter((part) => part.length > 0)
      .join(' ')
      .trim()
    rows.push({
      listing_key: listingKey,
      list_price: price,
      beds_total: r.BedroomsTotal ?? null,
      baths_full: r.BathroomsTotal ?? null,
      living_area: r.TotalLivingAreaSqFt ?? null,
      subdivision_name: r.SubdivisionName ?? null,
      city: r.City ?? null,
      unparsed_address: unparsedAddress || null,
      photo_url: r.PhotoURL ?? null,
      video_url: video.url,
      video_source: video.source,
    })
  }

  // Compatibility fallback for deployments that still expose snake_case listings schema.
  if (rows.length === 0) {
    const { data: legacyVideos } = await supabase
      .from('listing_videos')
      .select('listing_key, video_url')
      .limit(candidateLimit)
    const legacyVideoByKey = new Map(
      (legacyVideos ?? []).map((r) => [
        String((r as { listing_key?: string }).listing_key ?? '').trim(),
        String((r as { video_url?: string }).video_url ?? '').trim(),
      ])
    )

    const { data: legacyListings } = await supabase
      .from('listings')
      .select(
        'listing_key, list_price, beds_total, baths_full, living_area, subdivision_name, city, unparsed_address, photo_url, virtual_tour_url, standard_status, modification_timestamp'
      )
      .limit(candidateLimit)

    for (const row of legacyListings ?? []) {
      const r = row as {
        listing_key?: string | null
        list_price?: number | null
        beds_total?: number | null
        baths_full?: number | null
        living_area?: number | null
        subdivision_name?: string | null
        city?: string | null
        unparsed_address?: string | null
        photo_url?: string | null
        virtual_tour_url?: string | null
        standard_status?: string | null
      }
      const listingKey = String(r.listing_key ?? '').trim()
      if (!listingKey) continue

      if (filters?.status !== 'all') {
        const status = String(r.standard_status ?? '').toLowerCase()
        const isActive =
          status.length === 0 ||
          status.includes('active') ||
          status.includes('for sale') ||
          status.includes('coming soon')
        if (!isActive) continue
      }

      if (filters?.community && r.subdivision_name !== filters.community) continue
      if (filters?.city && r.city !== filters.city) continue
      const price = r.list_price ?? null
      if (filters?.minPrice != null && (price == null || price < filters.minPrice)) continue
      if (filters?.maxPrice != null && (price == null || price > filters.maxPrice)) continue

      const videoUrl = legacyVideoByKey.get(listingKey) || String(r.virtual_tour_url ?? '').trim()
      if (!videoUrl) continue
      rows.push({
        listing_key: listingKey,
        list_price: price,
        beds_total: r.beds_total ?? null,
        baths_full: r.baths_full ?? null,
        living_area: r.living_area ?? null,
        subdivision_name: r.subdivision_name ?? null,
        city: r.city ?? null,
        unparsed_address: r.unparsed_address ?? null,
        photo_url: r.photo_url ?? null,
        video_url: videoUrl,
        video_source: legacyVideoByKey.has(listingKey) ? 'listing_video' : 'virtual_tour',
      })
    }
  }
  if (filters?.sort === 'price_desc') {
    rows.sort((a, b) => (b.list_price ?? 0) - (a.list_price ?? 0))
  }
  return rows.slice(0, maxRows)
}

async function _getListingsWithVideosCachedUncached(
  city: string | null,
  community: string | null,
  sort: 'newest' | 'most_viewed' | 'price_desc',
  status: 'active' | 'all',
  limit: number
): Promise<VideoListingRow[]> {
  return getListingsWithVideos({
    city: city ?? undefined,
    community: community ?? undefined,
    sort,
    status,
    limit,
  })
}

const _getListingsWithVideosCached = unstable_cache(
  _getListingsWithVideosCachedUncached,
  ['listings-with-videos-v1'],
  { revalidate: 300, tags: ['listings-videos'] }
)

export async function getListingsWithVideosCached(filters?: {
  community?: string
  city?: string
  sort?: 'newest' | 'most_viewed' | 'price_desc'
  status?: 'active' | 'all'
  limit?: number
}): Promise<VideoListingRow[]> {
  return _getListingsWithVideosCached(
    filters?.city?.trim() || null,
    filters?.community?.trim() || null,
    filters?.sort ?? 'newest',
    filters?.status ?? 'active',
    Math.min(Math.max(filters?.limit ?? 24, 1), 60)
  )
}
