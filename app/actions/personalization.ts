'use server'

import { createClient } from '@/lib/supabase/server'

export type PersonalizedContent = {
  /** Cities the user has browsed */
  browsedCities: string[]
  /** Communities the user has viewed */
  browsedCommunities: string[]
  /** Price range based on viewed listings */
  priceRange: { min: number; max: number } | null
  /** Listing keys the user recently viewed */
  recentlyViewedKeys: string[]
  /** Whether the user has saved searches */
  hasSavedSearches: boolean
  /** Whether the user has saved listings */
  hasSavedListings: boolean
}

/**
 * Get personalized content recommendations for a signed-in user.
 *
 * Analyzes:
 * - Viewing history → browsed cities and communities
 * - Saved listings → price range preferences
 * - Saved searches → search criteria
 *
 * Returns data the homepage can use to personalize sections:
 * - "New in [your browsed areas]"
 * - "Price changes on homes you viewed"
 * - "Similar to homes you saved"
 */
export async function getPersonalizedContent(): Promise<PersonalizedContent | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get recently viewed listings
    const { data: views } = await supabase
      .from('listing_views')
      .select('listing_key, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(50)

    const recentlyViewedKeys = (views ?? []).map((v: { listing_key: string }) => v.listing_key)

    // Get cities and communities from viewed listings
    let browsedCities: string[] = []
    let browsedCommunities: string[] = []
    let priceRange: { min: number; max: number } | null = null

    if (recentlyViewedKeys.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('City, SubdivisionName, ListPrice')
        .in('listing_key', recentlyViewedKeys.slice(0, 30))

      if (listings && listings.length > 0) {
        const cities = new Set<string>()
        const communities = new Set<string>()
        const prices: number[] = []

        for (const l of listings as Array<{ City?: string; SubdivisionName?: string; ListPrice?: number }>) {
          if (l.City) cities.add(l.City)
          if (l.SubdivisionName) communities.add(l.SubdivisionName)
          if (l.ListPrice && l.ListPrice > 0) prices.push(l.ListPrice)
        }

        browsedCities = Array.from(cities).slice(0, 5)
        browsedCommunities = Array.from(communities).slice(0, 5)

        if (prices.length >= 3) {
          prices.sort((a, b) => a - b)
          const p10 = prices[Math.floor(prices.length * 0.1)]
          const p90 = prices[Math.floor(prices.length * 0.9)]
          priceRange = { min: p10, max: p90 }
        }
      }
    }

    // Check saved searches and listings
    const { count: savedSearchCount } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: savedListingCount } = await supabase
      .from('saved_listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return {
      browsedCities,
      browsedCommunities,
      priceRange,
      recentlyViewedKeys: recentlyViewedKeys.slice(0, 10),
      hasSavedSearches: (savedSearchCount ?? 0) > 0,
      hasSavedListings: (savedListingCount ?? 0) > 0,
    }
  } catch (err) {
    console.error('[getPersonalizedContent]', err)
    return null
  }
}
