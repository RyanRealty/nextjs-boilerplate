'use server'

import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { logAdminAction } from '@/app/actions/log-admin-action'

type ListingPhotoRow = {
  id: string
  listing_key: string
  photo_url: string
  cdn_url: string | null
  sort_order: number
  caption: string | null
  is_hero: boolean
}

export type AdminListingEditable = {
  listingKey: string
  listPrice: number | null
  standardStatus: string | null
  publicRemarks: string | null
  adminNotes: string | null
  marketingHeadline: string | null
  featured: boolean
  photos: ListingPhotoRow[]
}

type ListingDetailsJson = Record<string, unknown> & {
  PublicRemarks?: string
  admin_overrides?: {
    admin_notes?: string | null
    marketing_headline?: string | null
    featured?: boolean
  }
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !serviceKey?.trim()) {
    throw new Error('Supabase service role is not configured.')
  }
  return createClient(url, serviceKey)
}

async function requireSuperuser() {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  if (adminRole?.role !== 'superuser') {
    return { ok: false as const, error: 'Only superuser can edit listings.', adminEmail: '', role: null as string | null }
  }
  return { ok: true as const, adminEmail: session?.user?.email ?? '', role: adminRole.role }
}

function normalizeListingKey(key: string) {
  return String(key ?? '').trim()
}

async function fetchListingRowForEdit(listingKey: string) {
  const supabase = getServiceSupabase()
  const key = normalizeListingKey(listingKey)
  if (!key) return null

  const byListingKey = await supabase
    .from('listings')
    .select('ListingKey, ListNumber, ListPrice, StandardStatus, details')
    .eq('ListingKey', key)
    .maybeSingle()
  if (byListingKey.data) return byListingKey.data as {
    ListingKey: string | null
    ListNumber: string | null
    ListPrice: number | null
    StandardStatus: string | null
    details: ListingDetailsJson | null
  }

  const byListNumber = await supabase
    .from('listings')
    .select('ListingKey, ListNumber, ListPrice, StandardStatus, details')
    .eq('ListNumber', key)
    .maybeSingle()
  if (byListNumber.data) return byListNumber.data as {
    ListingKey: string | null
    ListNumber: string | null
    ListPrice: number | null
    StandardStatus: string | null
    details: ListingDetailsJson | null
  }

  return null
}

export async function getAdminListingEditableData(listingKey: string): Promise<AdminListingEditable | null> {
  const key = normalizeListingKey(listingKey)
  if (!key) return null

  const supabase = getServiceSupabase()
  const listing = await fetchListingRowForEdit(key)
  if (!listing) return null

  const resolvedKey = listing.ListingKey || listing.ListNumber || key
  const details = (listing.details ?? {}) as ListingDetailsJson
  const overrides = details.admin_overrides ?? {}
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('id, listing_key, photo_url, cdn_url, sort_order, caption, is_hero')
    .eq('listing_key', resolvedKey)
    .order('sort_order', { ascending: true })

  return {
    listingKey: resolvedKey,
    listPrice: listing.ListPrice ?? null,
    standardStatus: listing.StandardStatus ?? null,
    publicRemarks: typeof details.PublicRemarks === 'string' ? details.PublicRemarks : null,
    adminNotes: typeof overrides.admin_notes === 'string' ? overrides.admin_notes : null,
    marketingHeadline: typeof overrides.marketing_headline === 'string' ? overrides.marketing_headline : null,
    featured: overrides.featured === true,
    photos: (photos ?? []) as ListingPhotoRow[],
  }
}

export async function updateAdminListingEditableData(input: {
  listingKey: string
  listPrice: number | null
  standardStatus: string | null
  publicRemarks: string | null
  adminNotes: string | null
  marketingHeadline: string | null
  featured: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireSuperuser()
  if (!access.ok) return { ok: false, error: access.error }

  const supabase = getServiceSupabase()
  const listing = await fetchListingRowForEdit(input.listingKey)
  if (!listing) return { ok: false, error: 'Listing not found.' }

  const details = (listing.details ?? {}) as ListingDetailsJson
  const nextDetails: ListingDetailsJson = {
    ...details,
    PublicRemarks: input.publicRemarks?.trim() || undefined,
    admin_overrides: {
      ...(details.admin_overrides ?? {}),
      admin_notes: input.adminNotes?.trim() || null,
      marketing_headline: input.marketingHeadline?.trim() || null,
      featured: input.featured,
    },
  }

  const key = listing.ListingKey || listing.ListNumber || normalizeListingKey(input.listingKey)
  const { error } = await supabase
    .from('listings')
    .update({
      ListPrice: input.listPrice,
      StandardStatus: input.standardStatus?.trim() || null,
      details: nextDetails,
      ModificationTimestamp: new Date().toISOString(),
    })
    .eq('ListingKey', key)

  if (error) return { ok: false, error: error.message }

  await logAdminAction({
    adminEmail: access.adminEmail,
    role: access.role,
    actionType: 'update',
    resourceType: 'listing',
    resourceId: key,
    details: {
      list_price: input.listPrice,
      standard_status: input.standardStatus ?? null,
      featured: input.featured,
    },
  })
  return { ok: true }
}

export async function addAdminListingPhoto(input: {
  listingKey: string
  photoUrl: string
  caption?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireSuperuser()
  if (!access.ok) return { ok: false, error: access.error }

  const key = normalizeListingKey(input.listingKey)
  const url = input.photoUrl.trim()
  if (!key || !url) return { ok: false, error: 'Listing key and photo URL are required.' }

  const supabase = getServiceSupabase()
  const { data: existing } = await supabase
    .from('listing_photos')
    .select('sort_order')
    .eq('listing_key', key)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (existing?.sort_order ?? -1) + 1
  const { error } = await supabase.from('listing_photos').insert({
    listing_key: key,
    photo_url: url,
    sort_order: nextSort,
    caption: input.caption?.trim() || null,
    is_hero: false,
    source: 'admin',
  })
  if (error) return { ok: false, error: error.message }

  await logAdminAction({
    adminEmail: access.adminEmail,
    role: access.role,
    actionType: 'create',
    resourceType: 'listing_photo',
    resourceId: key,
    details: { photo_url: url },
  })
  return { ok: true }
}

export async function deleteAdminListingPhoto(input: {
  listingKey: string
  photoId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireSuperuser()
  if (!access.ok) return { ok: false, error: access.error }

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('listing_photos')
    .delete()
    .eq('listing_key', normalizeListingKey(input.listingKey))
    .eq('id', input.photoId)

  if (error) return { ok: false, error: error.message }

  await logAdminAction({
    adminEmail: access.adminEmail,
    role: access.role,
    actionType: 'delete',
    resourceType: 'listing_photo',
    resourceId: input.photoId,
    details: { listing_key: input.listingKey },
  })
  return { ok: true }
}

export async function setAdminListingHeroPhoto(input: {
  listingKey: string
  photoId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireSuperuser()
  if (!access.ok) return { ok: false, error: access.error }

  const key = normalizeListingKey(input.listingKey)
  const supabase = getServiceSupabase()

  const reset = await supabase
    .from('listing_photos')
    .update({ is_hero: false })
    .eq('listing_key', key)
  if (reset.error) return { ok: false, error: reset.error.message }

  const set = await supabase
    .from('listing_photos')
    .update({ is_hero: true })
    .eq('listing_key', key)
    .eq('id', input.photoId)
  if (set.error) return { ok: false, error: set.error.message }

  await logAdminAction({
    adminEmail: access.adminEmail,
    role: access.role,
    actionType: 'update',
    resourceType: 'listing_photo',
    resourceId: input.photoId,
    details: { listing_key: key, set_hero: true },
  })
  return { ok: true }
}

export async function reorderAdminListingPhotos(input: {
  listingKey: string
  orderedPhotoIds: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireSuperuser()
  if (!access.ok) return { ok: false, error: access.error }
  if (input.orderedPhotoIds.length === 0) return { ok: true }

  const key = normalizeListingKey(input.listingKey)
  const supabase = getServiceSupabase()
  for (let i = 0; i < input.orderedPhotoIds.length; i += 1) {
    const id = input.orderedPhotoIds[i]
    const { error } = await supabase
      .from('listing_photos')
      .update({ sort_order: i })
      .eq('listing_key', key)
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  }

  await logAdminAction({
    adminEmail: access.adminEmail,
    role: access.role,
    actionType: 'update',
    resourceType: 'listing_photo',
    resourceId: key,
    details: { reordered_count: input.orderedPhotoIds.length },
  })
  return { ok: true }
}
