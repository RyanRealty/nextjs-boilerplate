'use server'

import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase/paginate'
import {
  classifyInventoryPropertyType,
  isActiveForSaleStatus,
} from '@/lib/inventory-filters'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function supabase() {
  if (!url?.trim() || !anonKey?.trim()) throw new Error('Supabase not configured')
  return createClient(url, anonKey)
}

export type InventoryBreakdown = {
  singleFamily: number
  condoTownhome: number
  manufacturedMobile: number
  landLot: number
}

const EMPTY_BREAKDOWN: InventoryBreakdown = {
  singleFamily: 0,
  condoTownhome: 0,
  manufacturedMobile: 0,
  landLot: 0,
}

function summarizeBuckets(rows: Array<{ PropertyType?: string | null; StandardStatus?: string | null }>): InventoryBreakdown {
  const result: InventoryBreakdown = { ...EMPTY_BREAKDOWN }
  for (const row of rows) {
    if (!isActiveForSaleStatus(row.StandardStatus)) continue
    const bucket = classifyInventoryPropertyType(row.PropertyType)
    if (bucket === 'single_family') result.singleFamily += 1
    else if (bucket === 'condo_townhome') result.condoTownhome += 1
    else if (bucket === 'manufactured_mobile') result.manufacturedMobile += 1
    else if (bucket === 'land_lot') result.landLot += 1
  }
  return result
}

export async function getCityInventoryBreakdown(cityName: string): Promise<InventoryBreakdown> {
  const rows = await fetchAllRows<{ PropertyType?: string | null; StandardStatus?: string | null }>(
    supabase(),
    'listings',
    'PropertyType, StandardStatus',
    (q: any) => q.ilike('City', cityName).or('StandardStatus.is.null,StandardStatus.ilike.%Active%,StandardStatus.ilike.%For Sale%,StandardStatus.ilike.%Coming Soon%')
  )
  return summarizeBuckets(rows)
}

export async function getCommunityInventoryBreakdown(cityName: string, subdivisionName: string): Promise<InventoryBreakdown> {
  const rows = await fetchAllRows<{ PropertyType?: string | null; StandardStatus?: string | null }>(
    supabase(),
    'listings',
    'PropertyType, StandardStatus',
    (q: any) =>
      q
        .ilike('City', cityName)
        .ilike('SubdivisionName', subdivisionName)
        .or('StandardStatus.is.null,StandardStatus.ilike.%Active%,StandardStatus.ilike.%For Sale%,StandardStatus.ilike.%Coming Soon%')
  )
  return summarizeBuckets(rows)
}

export async function getNeighborhoodInventoryBreakdown(neighborhoodId: string): Promise<InventoryBreakdown> {
  const sb = supabase()
  const { data: propIds } = await sb.from('properties').select('id').eq('neighborhood_id', neighborhoodId).limit(5000)
  const ids = (propIds ?? []).map((row: { id: string }) => row.id)
  if (ids.length === 0) return { ...EMPTY_BREAKDOWN }
  const rows = await fetchAllRows<{ PropertyType?: string | null; StandardStatus?: string | null }>(
    sb,
    'listings',
    'PropertyType, StandardStatus',
    (q: any) => q.in('property_id', ids).or('StandardStatus.is.null,StandardStatus.ilike.%Active%,StandardStatus.ilike.%For Sale%,StandardStatus.ilike.%Coming Soon%')
  )
  return summarizeBuckets(rows)
}
