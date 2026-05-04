'use server'
import { createClient } from '@supabase/supabase-js'

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const MAX_GEOCODE_BATCH = 10
const MAX_GEOCODE_CONCURRENCY = 2

/** Minimal listing-like shape for geocoding (Spark or internal). */
export type GeocodeListingInput = {
  ListNumber?: string | null
  StreetNumber?: string | null
  StreetName?: string | null
  City?: string | null
  State?: string | null
  PostalCode?: string | null
  Latitude?: number | null
  Longitude?: number | null
  [k: string]: unknown
}

export async function getGeocodedListings<T extends GeocodeListingInput>(listings: T[]): Promise<T[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey?.trim() || !listings) return (listings || []) as T[]
  const mapsApiKey = apiKey.trim()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase =
    supabaseUrl?.trim() && serviceKey?.trim()
      ? createClient(supabaseUrl, serviceKey)
      : null

  const updatedListings = listings.slice()
  const candidates = listings
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !(item.Latitude && item.Longitude))
    .slice(0, MAX_GEOCODE_BATCH)

  async function geocodeOne(item: T): Promise<T> {
    const address = `${item.StreetNumber ?? ''} ${item.StreetName ?? ''}, ${item.City ?? ''}, ${item.State ?? ''} ${item.PostalCode ?? ''}`.trim()
    if (!address.replace(/,/g, '').trim()) return item

    try {
      const params = new URLSearchParams({ address, key: mapsApiKey })
      const res = await fetch(`${GEOCODE_URL}?${params.toString()}`)
      const data = await res.json()

      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry?.location ?? {}
        if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
          if (supabase) {
            await supabase
              .from('listings')
              .update({ Latitude: lat, Longitude: lng })
              .eq('ListNumber', item.ListNumber)
          }
          return { ...item, Latitude: lat, Longitude: lng } as T
        }
      }
    } catch (e) {
      console.error('[getGeocodedListings]', 'Geocoding failed for:', address, e)
    }
    return item
  }

  for (let i = 0; i < candidates.length; i += MAX_GEOCODE_CONCURRENCY) {
    const batch = candidates.slice(i, i + MAX_GEOCODE_CONCURRENCY)
    const results = await Promise.all(batch.map(({ item }) => geocodeOne(item)))
    results.forEach((result, index) => {
      updatedListings[batch[index]!.index] = result
    })
  }

  return updatedListings
}
