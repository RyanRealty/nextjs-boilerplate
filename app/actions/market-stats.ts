'use server'

import { createServiceClient } from '@/lib/supabase/service'

export type MarketGeoType = 'region' | 'city' | 'subdivision'
export type MarketPeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type CachedStatRow = {
  id: string
  geo_type: MarketGeoType
  geo_slug: string
  geo_label: string
  period_type: MarketPeriodType
  period_start: string
  period_end: string
  sold_count: number
  median_sale_price: number | null
  avg_sale_price: number | null
  total_volume: number | null
  median_dom: number | null
  speed_p25: number | null
  speed_p50: number | null
  speed_p75: number | null
  median_ppsf: number | null
  avg_sale_to_list_ratio: number | null
  market_health_score: number | null
  market_health_label: string | null
  computed_at: string
}

export type MarketPulseRow = {
  geo_type: MarketGeoType
  geo_slug: string
  geo_label: string
  active_count: number
  pending_count: number
  new_count_7d: number
  new_count_30d: number
  median_list_price: number | null
  avg_list_price: number | null
  market_health_score: number | null
  market_health_label: string | null
  updated_at: string
}

export async function getCachedStats(input: {
  geoType: MarketGeoType
  geoSlug: string
  periodType?: MarketPeriodType
  periodStart?: string
}): Promise<CachedStatRow | null> {
  const supabase = createServiceClient()
  let query = supabase
    .from('market_stats_cache')
    .select('*')
    .eq('geo_type', input.geoType)
    .eq('geo_slug', input.geoSlug)
    .eq('period_type', input.periodType ?? 'monthly')
  if (input.periodStart) {
    query = query.eq('period_start', input.periodStart)
  }
  const { data } = await query.order('period_start', { ascending: false }).limit(1).maybeSingle()
  return (data as CachedStatRow | null) ?? null
}

export async function getLiveMarketPulse(input: {
  geoType: MarketGeoType
  geoSlug: string
}): Promise<MarketPulseRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('market_pulse_live')
    .select('*')
    .eq('geo_type', input.geoType)
    .eq('geo_slug', input.geoSlug)
    .maybeSingle()
  return (data as MarketPulseRow | null) ?? null
}
