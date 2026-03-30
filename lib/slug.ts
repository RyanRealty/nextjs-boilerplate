/**
 * Normalize display names to URL- and storage-safe keys.
 * Used for banner entity_key and storage paths so web and mobile share the same URLs.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

/** Display label for a subdivision. "Out of area; see remarks" (or similar) → "See homes nearby". */
export function getSubdivisionDisplayName(name: string | null | undefined): string {
  const n = (name ?? '').trim().toLowerCase()
  if (!n) return name?.trim() ?? ''
  if (n === 'out of area; see remarks' || n === 'out of area, see remarks') return 'See homes nearby'
  return (name ?? '').trim()
}

/** Entity key for a city (e.g. "Bend" -> "bend"). */
export function cityEntityKey(city: string): string {
  return slugify(city)
}

/** Canonical city listings path (e.g. "Bend" -> "/homes-for-sale/bend"). */
export function cityPagePath(city: string): string {
  return homesForSalePath(city)
}

/** Canonical neighborhood listings path (e.g. "bend", "larkspur" -> "/homes-for-sale/bend/larkspur"). */
export function neighborhoodPagePath(citySlug: string, neighborhoodSlug: string): string {
  return `/homes-for-sale/${slugify(citySlug)}/${slugify(neighborhoodSlug)}`
}

/**
 * SEO-friendly path for browsing homes for sale by place.
 * Use for all "homes for sale in [city]" or "homes for sale in [community]" links and canonicals.
 * - No args: /homes-for-sale (main search)
 * - City only: /homes-for-sale/bend
 * - City + subdivision: /homes-for-sale/bend/sunriver
 */
export function homesForSalePath(city?: string | null, subdivision?: string | null): string {
  if (!city?.trim()) return '/homes-for-sale'
  const citySlug = cityEntityKey(city)
  if (!subdivision?.trim()) return `/homes-for-sale/${citySlug}`
  return `/homes-for-sale/${citySlug}/${slugify(subdivision)}`
}

/** Canonical subdivision/community listings path with optional neighborhood segment. */
export function subdivisionListingsPath(
  city?: string | null,
  subdivision?: string | null,
  neighborhood?: string | null
): string {
  if (!city?.trim() || !subdivision?.trim()) return homesForSalePath(city ?? null, subdivision ?? null)
  const citySlug = cityEntityKey(city)
  const subdivisionSlug = slugify(subdivision)
  const neighborhoodSlug = neighborhood?.trim() ? slugify(neighborhood) : ''
  if (!neighborhoodSlug || neighborhoodSlug === subdivisionSlug) {
    return `/homes-for-sale/${citySlug}/${subdivisionSlug}`
  }
  return `/homes-for-sale/${citySlug}/${neighborhoodSlug}/${subdivisionSlug}`
}

/** Canonical browse hub for all listings search/navigation. */
export function listingsBrowsePath(): string {
  return '/homes-for-sale'
}

/** Canonical team page path. */
export function teamPath(slug?: string | null): string {
  if (!slug?.trim()) return '/team'
  return `/team/${encodeURIComponent(slug.trim())}`
}

/** Canonical home valuation path. */
export function valuationPath(): string {
  return '/sell/valuation'
}

/**
 * Reports explore page URL with year-to-date pre-loaded for a city (and optional community).
 * Use for "View year-to-date report" from city/community/neighborhood market overview.
 */
export function reportsExploreYtdPath(city: string, subdivision?: string | null): string {
  const now = new Date()
  const start = `${now.getFullYear()}-01-01`
  const end = now.toISOString().slice(0, 10)
  const params = new URLSearchParams()
  params.set('city', city.trim())
  if (subdivision?.trim()) params.set('subdivision', subdivision.trim())
  params.set('start', start)
  params.set('end', end)
  return `/reports/explore?${params.toString()}`
}

/** Entity key for a subdivision (e.g. city "Bend", subdivision "Sunriver" -> "bend:sunriver"). */
export function subdivisionEntityKey(city: string, subdivision: string): string {
  return `${slugify(city)}:${slugify(subdivision)}`
}

/** Parse entity_key "city:subdivision" into display parts (e.g. "bend:sunriver" -> { city: "Bend", subdivision: "Sunriver" }). */
export function parseEntityKey(entityKey: string): { city: string; subdivision: string } {
  const [city = '', subdivision = ''] = entityKey.split(':')
  const format = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return { city: format(city), subdivision: format(subdivision) }
}

/**
 * Build an SEO-friendly listing URL slug from address parts (e.g. "123-main-st-bend-oregon-97702").
 * Includes street, city, state, and zip for maximum local SEO. Used for /listing/[key]-[addressSlug].
 */
export function listingAddressSlug(parts: {
  streetNumber?: string | null
  streetName?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
}): string {
  const street = [parts.streetNumber, parts.streetName].filter(Boolean).join('-')
  const loc = [parts.city, parts.state].filter(Boolean).join('-')
  const zip = (parts.postalCode ?? '').toString().trim().replace(/\D/g, '')
  const combined = [street, loc, zip].filter(Boolean).join('-')
  return slugify(combined)
}

function normalizePostalCode(postalCode?: string | null): string | null {
  const digits = String(postalCode ?? '').trim().replace(/\D/g, '')
  if (!digits) return null
  return digits.slice(0, 5)
}

/**
 * Build canonical listing detail path using location hierarchy:
 * /homes-for-sale/{city}/{optional-neighborhood}/{community}/{mlsOrKey}-{zip}
 * If location is incomplete, falls back to /homes-for-sale/listing/{mlsOrKey}.
 */
export function listingDetailPath(
  listingKey: string,
  address?: {
    streetNumber?: string | null
    streetName?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  } | null,
  location?: {
    city?: string | null
    neighborhood?: string | null
    subdivision?: string | null
  } | null,
  identifiers?: {
    mlsNumber?: string | null
  } | null
): string {
  const normalizedListingKey = String(listingKey ?? '').trim()
  const normalizedMls = String(identifiers?.mlsNumber ?? '').trim()
  const key = normalizedListingKey || normalizedMls
  if (!key) return listingsBrowsePath()
  const postalCode = normalizePostalCode(address?.postalCode)
  const cityRaw = location?.city ?? address?.city ?? null
  const citySlug = cityRaw?.trim() ? slugify(cityRaw) : null
  const neighborhoodSlug = location?.neighborhood?.trim() ? slugify(location.neighborhood) : null
  const subdivisionSlug = location?.subdivision?.trim() ? slugify(location.subdivision) : null

  // Hierarchy URLs must end with key-zip to match Next rewrites to listing detail.
  // If zip is unavailable, use by-key fallback to avoid routing to /search and 404s.
  if (citySlug && subdivisionSlug && postalCode) {
    const hierarchyBase = subdivisionListingsPath(citySlug, subdivisionSlug, neighborhoodSlug)
    const listingSegment = `${encodeURIComponent(key)}-${postalCode}`
    return `${hierarchyBase}/${listingSegment}`
  }
  return `/homes-for-sale/listing/${encodeURIComponent(key)}`
}

/**
 * Extract the listing key from a URL segment that may be:
 * - "key"
 * - "key~address-slug" (legacy)
 * - "mlsOrKey-zip" (canonical)
 * - "12345-address-slug" (legacy short form)
 * When the first segment is all digits (ListNumber), the rest is address slug; otherwise the whole segment is the key.
 */
export function listingKeyFromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug).trim()
  if (!decoded) return ''
  const beforeTilde = decoded.split('~')[0]?.trim() ?? ''
  if (!beforeTilde) return ''
  const zipMatch = beforeTilde.match(/^(.*)-(\d{5})$/)
  if (zipMatch?.[1]) return zipMatch[1].trim()
  const parts = beforeTilde.split('-')
  const first = parts[0]?.trim() ?? ''
  if (parts.length > 1 && /^\d+$/.test(first)) return first
  return beforeTilde
}
