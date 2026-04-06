import { getCityHeroImage } from '@/lib/central-oregon-images'
import { getFallbackImage } from '@/lib/fallback-images'

/**
 * Use admin or CMS hero image when set; otherwise the fallback (curated Unsplash or default).
 * Any non-empty HTTPS URL is accepted (Supabase Storage, Unsplash, etc.).
 */
export function resolveUnsplashHeroImage(
  configuredImageUrl: string | null | undefined,
  fallbackImage: string
): string {
  const v = configuredImageUrl?.trim()
  if (v) return v
  return fallbackImage
}

/** Default homepage hero when brokerage hero image URL is empty (Bend, Oregon landscape). */
export function getHomeHeroImage(): string {
  return getCityHeroImage('bend')
}

export function getCityHeroUnsplash(cityName: string): string {
  return getCityHeroImage(cityName)
}

export function getCommunityHeroUnsplash(cityName: string, communityName: string): string {
  return getFallbackImage('community', `${cityName}-${communityName}`)
}

export function getNeighborhoodHeroUnsplash(cityName: string, neighborhoodName: string): string {
  return getFallbackImage('community', `${cityName}-${neighborhoodName}`)
}
