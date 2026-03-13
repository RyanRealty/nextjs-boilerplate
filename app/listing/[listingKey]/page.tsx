import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  fetchSparkListingByKey,
  fetchSparkListingHistory,
  fetchSparkPriceHistory,
  getAdjacentListingKey,
  type SparkDocument,
  type SparkListingResult,
} from '../../../lib/spark'
import {
  getListingByKey,
  getAdjacentListingKeyFromSupabase,
  getAdjacentListingsFromSupabase,
  getAdjacentListingsSliceFromSupabase,
  getListingsSliceInSubdivision,
  getListingHistory,
  getSimilarListingsWithFallback,
  getListingsAtAddress,
} from '../../actions/listings'
import { getBannerUrl } from '../../actions/banners'
import { getBrokerageSettings } from '../../actions/brokerage'
import { getSession } from '../../actions/auth'
import { getBuyingPreferences } from '../../actions/buying-preferences'
import { isListingSaved, getSavedListingCount, getSavedListingKeys } from '../../actions/saved-listings'
import { isListingLiked, getLikeCount, getLikedListingKeys } from '../../actions/likes'
import { getEngagementForListingDetail } from '../../actions/engagement'
import { getLastDeltaSyncCompletedAt } from '../../actions/sync-full-cron'
import { cityEntityKey, subdivisionEntityKey, listingKeyFromSlug, listingAddressSlug, getSubdivisionDisplayName, cityPagePath, neighborhoodPagePath } from '../../../lib/slug'
import { getCanonicalSiteUrl, listingShareSummary, listingShareText, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '../../../lib/share-metadata'
import { communityPagePath } from '../../../lib/community-slug'
import { getSubdivisionNeighborhood } from '../../actions/communities'
import { trackListingView } from '../../../lib/followupboss'
import { getFubPersonIdFromCookie } from '../../actions/fub-identity-bridge'
import { estimatedMonthlyPayment, formatMonthlyPayment, DEFAULT_DISPLAY_RATE, DEFAULT_DISPLAY_DOWN_PCT, DEFAULT_DISPLAY_TERM_YEARS } from '../../../lib/mortgage'
import SaveListingButton from '../../../components/listing/SaveListingButton'
import LikeButton from '../../../components/listing/LikeButton'
import ListingHero from '../../../components/listing/ListingHero'
import ListingFloorPlans from '../../../components/listing/ListingFloorPlans'
import ListingVideos from '../../../components/listing/ListingVideos'
import ListingDetails from '../../../components/listing/ListingDetails'
import ListingNav from '../../../components/listing/ListingNav'
import ListingSimilarListings from '../../../components/listing/ListingSimilarListings'
import ListingOtherListingsAtAddress from '../../../components/listing/ListingOtherListingsAtAddress'
import ListingDetailMapGoogle from '../../../components/listing/ListingDetailMapGoogle'
import ListingHistory from '../../../components/listing/ListingHistory'
import ListingDocuments from '../../../components/listing/ListingDocuments'
import ListingJsonLd from '../../../components/listing/ListingJsonLd'
import ListingCtaSidebar from '../../../components/listing/ListingCtaSidebar'
import ListingSpecial from '../../../components/listing/ListingSpecial'
import { buildListingHighlights } from '../../../lib/listing-highlights'
import ListingValuationSection from '../../../components/listing/ListingValuationSection'
import ListingSummary from '../../../components/listing/ListingSummary'
import ShareButton from '../../../components/ShareButton'
import TrackListingView from '../../../components/tracking/TrackListingView'
import BreadcrumbStrip from '../../../components/layout/BreadcrumbStrip'
import CollapsibleSection from '../../../components/CollapsibleSection'
import BackToSearchLink from '../../../components/listing/BackToSearchLink'
import ListingEstimatedMonthlyCost from '../../../components/listing/ListingEstimatedMonthlyCost'
import { getSubdivisionTabContent } from '../../actions/subdivision-descriptions'

type PageProps = {
  params: Promise<{ listingKey: string }>
  searchParams?: Promise<{ from?: string; return?: string }>
}

export const revalidate = 60

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')

function metadataFromFields(f: Record<string, unknown>, listingKey: string) {
  const address = [f.StreetNumber, f.StreetName].filter(Boolean).join(' ')
  const cityState = [f.City, f.StateOrProvince].filter(Boolean).join(', ')
  const title = address || cityState || `MLS# ${f.ListingId ?? listingKey}`
  const price = f.ListPrice != null ? `$${Number(f.ListPrice).toLocaleString()}` : ''
  const beds = (f.BedroomsTotal ?? f.BedsTotal) != null ? `${f.BedroomsTotal ?? f.BedsTotal} bed` : null
  const baths = (f.BathroomsTotal ?? f.BathsTotal) != null ? `${f.BathroomsTotal ?? f.BathsTotal} bath` : null
  const desc = [price, beds, baths, cityState].filter(Boolean).join(' · ')
  return { title: `${title}${cityState ? ` | ${cityState}` : ''}`, description: desc || undefined }
}

function firstPhotoUrl(fields: Record<string, unknown>): string | undefined {
  const photos = fields.Photos as Array<{ Uri1600?: string; Uri1280?: string; Uri1024?: string; Uri800?: string; Primary?: boolean }> | undefined
  if (!Array.isArray(photos) || photos.length === 0) return undefined
  const primary = photos.find((p) => p.Primary) ?? photos[0]
  return primary?.Uri1600 ?? primary?.Uri1280 ?? primary?.Uri1024 ?? primary?.Uri800
}

/** Normalize Photos from Spark or Supabase details (handles casing so hero always gets Uri*, Primary). */
function normalizeListingPhotos(fields: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = fields.Photos ?? fields.photos
  if (!Array.isArray(raw)) return []
  return raw.map((p) => {
    if (typeof p !== 'object' || p === null) return {}
    const o = p as Record<string, unknown>
    return {
      Id: o.Id ?? o.id,
      Primary: o.Primary ?? o.primary,
      Uri300: o.Uri300 ?? o.uri300,
      Uri640: o.Uri640 ?? o.uri640,
      Uri800: o.Uri800 ?? o.uri800,
      Uri1024: o.Uri1024 ?? o.uri1024,
      Uri1280: o.Uri1280 ?? o.uri1280,
      Uri1600: o.Uri1600 ?? o.uri1600,
      Caption: o.Caption ?? o.caption,
      ...o,
    }
  })
}

/** Normalize Videos from Spark or Supabase details (handles casing so hero shows ObjectHtml/Uri). See docs/VIDEO_DATA_FLOW.md for full trace. */
/** Only returns actual playable/embed video entries — never virtual tour URLs (use virtual tours section for those). */
function normalizeListingVideos(fields: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = fields.Videos ?? fields.videos
  if (!Array.isArray(raw)) return []
  return raw.map((v) => {
    if (typeof v !== 'object' || v === null) return {}
    const o = v as Record<string, unknown>
    return {
      Id: o.Id ?? o.id,
      Uri: o.Uri ?? o.uri,
      ObjectHtml: o.ObjectHtml ?? o.object_html ?? o.ObjectHTML,
      Name: o.Name ?? o.name,
      Caption: o.Caption ?? o.caption,
      ...o,
    }
  })
}

/** Normalize VirtualTours from Spark or Supabase details. */
function normalizeListingVirtualTours(fields: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = fields.VirtualTours ?? fields.virtual_tours
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((vt) => {
      if (typeof vt !== 'object' || vt === null) return {}
      const o = vt as Record<string, unknown>
      return { Id: o.Id ?? o.id, Uri: o.Uri ?? o.uri, Name: o.Name ?? o.name, ...o }
    })
  }
  const singleUrl =
    (fields.VirtualTourURL as string)?.trim() ||
    (fields.VirtualTourURLUnbranded as string)?.trim() ||
    (fields.UnbrandedVirtualTourURL as string)?.trim() ||
    (fields.VirtualTourUrl as string)?.trim()
  if (singleUrl) return [{ Id: 'vt0', Uri: singleUrl, Name: 'Virtual tour' }]
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingKey } = await params
  const row = await getListingByKey(listingKey)
  const resolvedKey = row ? (row.ListNumber ?? row.ListingKey ?? listingKey) : listingKeyFromSlug(listingKey)
  let f = row?.details as Record<string, unknown> | undefined
  if (!f) {
    const token = process.env.SPARK_API_KEY
    if (token?.trim() && resolvedKey) {
      try {
        const res = await fetchSparkListingByKey(token, resolvedKey)
        if (!res) return { title: 'Listing' }
        const raw = (res.D as any)?.Results?.[0] ?? res.D
        f = raw?.StandardFields ?? {}
      } catch {
        return { title: 'Listing' }
      }
    } else {
      return { title: 'Listing' }
    }
  }
  const { title } = metadataFromFields(f!, listingKey)
  const canonicalUrl = getCanonicalSiteUrl()
  const addressSlug = listingAddressSlug({
    streetNumber: f!.StreetNumber as string | null,
    streetName: f!.StreetName as string | null,
    city: f!.City as string | null,
    state: f!.StateOrProvince as string | null,
    postalCode: f!.PostalCode as string | null,
  })
  const pathSegment = addressSlug && addressSlug !== 'unknown' ? `${resolvedKey}-${addressSlug}` : String(resolvedKey)
  const listingUrl = `${canonicalUrl}/listing/${encodeURIComponent(pathSegment)}`
  const resolvedKeyStr = String(resolvedKey).trim()
  const ogImageUrl = resolvedKeyStr ? `${canonicalUrl}/api/og?type=listing&id=${encodeURIComponent(resolvedKeyStr)}` : undefined
  const address = [f!.StreetNumber, f!.StreetName].filter(Boolean).join(' ')
  const city = (f!.City as string) ?? undefined
  const description = listingShareSummary({
    price: (f!.ListPrice as number) ?? undefined,
    beds: (f!.BedroomsTotal ?? f!.BedsTotal) as number | undefined,
    baths: (f!.BathroomsTotal ?? f!.BathsTotal) as number | undefined,
    sqft: (f!.LivingArea ?? f!.TotalLivingAreaSqFt) as number | undefined,
    address: address || undefined,
    city,
  })
  return {
    title,
    description,
    alternates: { canonical: listingUrl },
    openGraph: {
      title,
      description,
      url: listingUrl,
      siteName: 'Ryan Realty',
      type: 'website',
      ...(ogImageUrl && { images: [{ url: ogImageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
  }
}

export default async function ListingPage({ params, searchParams }: PageProps) {
  const { listingKey } = await params
  const sp = (await searchParams?.catch(() => ({})) ?? {}) as { return?: string }
  const returnUrl = typeof sp.return === 'string' && sp.return.trim() ? sp.return.trim() : null
  const accessToken = process.env.SPARK_API_KEY

  let raw: SparkListingResult | null = null
  let fromSupabase = false

  const row = await getListingByKey(listingKey)
  const resolvedKey = String(
    row ? (row.ListNumber ?? row.ListingKey ?? listingKey) : listingKeyFromSlug(listingKey)
  ).trim()
  if (row?.details && typeof row.details === 'object') {
    raw = {
      Id: row.ListingKey ?? row.ListNumber ?? listingKey,
      ResourceUri: '',
      StandardFields: row.details as Record<string, unknown>,
    }
    fromSupabase = true
  }

  if (!raw && accessToken?.trim() && resolvedKey) {
    try {
      const res = await fetchSparkListingByKey(accessToken, resolvedKey)
      if (res) {
        const D = res.D as Record<string, unknown> | undefined
        const results = D?.Results as SparkListingResult[] | undefined
        if (Array.isArray(results) && results.length > 0) raw = results[0]
        else if (D && (D.Id || D.StandardFields)) raw = D as SparkListingResult
      }
    } catch {
      raw = null
    }
  }

  if (!raw) notFound()

  const fields = raw.StandardFields ?? {}
  /** MLS# for display: prefer ListNumber (actual MLS list number); fall back to Spark ListingId or resolvedKey. */
  const mlsDisplay = String((row?.ListNumber ?? (fields.ListingId as string) ?? resolvedKey) ?? '').trim()
  const modTs = (fields.ModificationTimestamp as string) ?? row?.ModificationTimestamp ?? ''
  /** Use OnMarketDate for Spark adjacent listing so we get full historical data; fallback to ListDate then ModificationTimestamp. */
  const orderByDate = (fields.OnMarketDate as string) ?? (fields.ListDate as string) ?? modTs
  const subdivisionName = ((fields.SubdivisionName as string) ?? '').trim()

  const streetNumber = (row?.StreetNumber ?? fields.StreetNumber ?? '')?.toString().trim() || null
  const streetName = (row?.StreetName ?? fields.StreetName ?? '')?.toString().trim() || null
  const addressCity = (row?.City ?? fields.City ?? '')?.toString().trim() || null
  const addressState = (row?.State ?? fields.StateOrProvince ?? '')?.toString().trim() || null
  const postalCode = (row?.PostalCode ?? fields.PostalCode ?? '')?.toString().trim() || null
  const hasAddress = !!(streetNumber || streetName) && !!addressCity

  const [prevKey, nextKey, adjacentListings, adjacentSlice, historyRows, similarListings, listingsAtAddressActive, listingsAtAddressAll] = await Promise.all([
    fromSupabase && modTs
      ? getAdjacentListingKeyFromSupabase(modTs, 'prev')
      : accessToken && orderByDate
        ? getAdjacentListingKey(resolvedKey, orderByDate, 'prev')
        : Promise.resolve(null),
    fromSupabase && modTs
      ? getAdjacentListingKeyFromSupabase(modTs, 'next')
      : accessToken && orderByDate
        ? getAdjacentListingKey(resolvedKey, orderByDate, 'next')
        : Promise.resolve(null),
    fromSupabase && modTs ? getAdjacentListingsFromSupabase(modTs) : Promise.resolve({ prev: null, next: null }),
    fromSupabase && modTs
      ? subdivisionName?.trim() && addressCity?.trim()
        ? getListingsSliceInSubdivision(addressCity, subdivisionName, modTs, 12, 12)
        : getAdjacentListingsSliceFromSupabase(modTs, 4, 4)
      : Promise.resolve({ prevList: [], nextList: [] }),
    getListingHistory(resolvedKey),
    getSimilarListingsWithFallback(subdivisionName || null, addressCity || null, resolvedKey, 4, 8),
    hasAddress
      ? getListingsAtAddress({
          streetNumber,
          streetName,
          city: addressCity,
          state: addressState,
          postalCode,
          excludeListingKey: resolvedKey,
          includeClosed: false,
        })
      : Promise.resolve([]),
    hasAddress
      ? getListingsAtAddress({
          streetNumber,
          streetName,
          city: addressCity,
          state: addressState,
          postalCode,
          excludeListingKey: resolvedKey,
          includeClosed: true,
        })
      : Promise.resolve([]),
  ])
  let historyItems: { Date?: string; Event?: string; Price?: number; PriceChange?: number; Description?: string }[] = historyRows.map((r) => ({
    Date: r.event_date ?? undefined,
    Event: r.event ?? undefined,
    Price: r.price ?? undefined,
    PriceChange: r.price_change ?? undefined,
    Description: r.description ?? undefined,
  }))
  // VOW/Spark fallback: when Supabase has no history, fetch from Spark API (works with VOW subscription)
  if (historyItems.length === 0 && accessToken?.trim()) {
    let sparkItems = (await fetchSparkListingHistory(accessToken, resolvedKey)).items
    if (sparkItems.length === 0) sparkItems = (await fetchSparkPriceHistory(accessToken, resolvedKey)).items
    if (sparkItems.length > 0) {
      const mapped = sparkItems.map((item) => ({
        Date: (item.ModificationTimestamp ?? item.Date) ?? undefined,
        Event: typeof item.Event === 'string' ? item.Event : undefined,
        Price: typeof item.Price === 'number' ? item.Price : typeof item.PriceAtEvent === 'number' ? item.PriceAtEvent : undefined,
        PriceChange: typeof item.PriceChange === 'number' ? item.PriceChange : undefined,
        Description: typeof item.Description === 'string' ? item.Description : undefined,
      }))
      mapped.sort((a, b) => {
        const tA = a.Date ? new Date(a.Date).getTime() : 0
        const tB = b.Date ? new Date(b.Date).getTime() : 0
        return tB - tA
      })
      historyItems = mapped
    }
  }

  const address = [
    fields.StreetNumber,
    fields.StreetDirPrefix,
    fields.StreetName,
    fields.StreetSuffix,
    fields.StreetDirSuffix,
  ]
    .filter(Boolean)
    .join(' ')
  const cityStateZip = [fields.City, fields.StateOrProvince, fields.PostalCode].filter(Boolean).join(', ')

  const canonicalUrl = getCanonicalSiteUrl()
  const listingUrl = `${canonicalUrl}/listing/${encodeURIComponent(listingKey)}`
  const firstPhoto = firstPhotoUrl(fields)
  const rawCity = (fields.City as string) ?? ''
  const rawSubdivision = ((fields.SubdivisionName as string) ?? '').trim()
  const isBlank = (s: string) => !s || s.toUpperCase() === 'NA'
  /** Exclude N/A and similar from neighborhood/subdivision for display and breadcrumb. */
  const isBlankSubdivision = (s: string) => isBlank(s) || /^n\/a$/i.test(s) || s.toUpperCase() === 'N/A'
  const city = isBlank(rawCity) ? '' : rawCity
  const subdivision = isBlankSubdivision(rawSubdivision) ? '' : rawSubdivision

  // Look up neighborhood for this listing's subdivision (may be null)
  const subdivNeighborhood = subdivision ? await getSubdivisionNeighborhood(subdivision) : null

  const breadcrumbItems: { name: string; item: string }[] = [
    { name: 'Ryan Realty', item: siteUrl },
    { name: 'Homes for Sale', item: `${siteUrl}/listings` },
  ]
  if (city) breadcrumbItems.push({ name: city, item: `${siteUrl}${cityPagePath(city)}` })
  if (subdivNeighborhood) {
    breadcrumbItems.push({
      name: subdivNeighborhood.neighborhoodName,
      item: `${siteUrl}${neighborhoodPagePath(subdivNeighborhood.citySlug, subdivNeighborhood.neighborhoodSlug)}`,
    })
  }
  if (subdivision) breadcrumbItems.push({ name: subdivision, item: `${siteUrl}${communityPagePath(city, subdivision)}` })
  const lastCrumbName = address || `MLS# ${mlsDisplay}`
  breadcrumbItems.push({ name: lastCrumbName.length > 48 ? lastCrumbName.slice(0, 45) + '…' : lastCrumbName, item: listingUrl })
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({ '@type': 'ListItem' as const, position: i + 1, name: item.name, item: item.item })),
  }

  const [areaBannerUrl, brokerage, session, prefs, saved, saveCount, liked, likeCount, engagementDetail, lastDeltaSyncAt] = await Promise.all([
    city
      ? getBannerUrl(
          subdivision ? 'subdivision' : 'city',
          subdivision ? subdivisionEntityKey(city, subdivision) : cityEntityKey(city)
        )
      : Promise.resolve(null),
    getBrokerageSettings(),
    getSession(),
    getBuyingPreferences(),
    isListingSaved(resolvedKey),
    getSavedListingCount(resolvedKey),
    isListingLiked(resolvedKey),
    getLikeCount(resolvedKey),
    getEngagementForListingDetail(resolvedKey),
    getLastDeltaSyncCompletedAt(),
  ])
  const listOfficeName = (fields.ListOfficeName as string)?.trim() ?? ''
  const brokerageName = brokerage?.name?.trim() ?? ''
  const isOurBroker =
    listOfficeName.length > 0 &&
    brokerageName.length > 0 &&
    listOfficeName.toLowerCase() === brokerageName.toLowerCase()
  const [savedKeys, likedKeys] = session?.user
    ? await Promise.all([getSavedListingKeys(), getLikedListingKeys()])
    : [[] as string[], [] as string[]]
  const listPrice = fields.ListPrice != null ? Number(fields.ListPrice) : 0
  const displayPrefs = prefs ?? { downPaymentPercent: DEFAULT_DISPLAY_DOWN_PCT, interestRate: DEFAULT_DISPLAY_RATE, loanTermYears: DEFAULT_DISPLAY_TERM_YEARS }
  const monthlyPayment = listPrice > 0 ? estimatedMonthlyPayment(listPrice, displayPrefs.downPaymentPercent, displayPrefs.interestRate, displayPrefs.loanTermYears) : null
  const signedIn = !!session?.user
  const calculatorUrl =
    listPrice > 0
      ? `/tools/mortgage-calculator?price=${listPrice}&down=${displayPrefs.downPaymentPercent}&rate=${displayPrefs.interestRate}&term=${displayPrefs.loanTermYears}`
      : undefined
  const areaSearchHref = city ? (subdivision ? `${siteUrl}${communityPagePath(city, subdivision)}` : `${siteUrl}${cityPagePath(city)}`) : null
  const areaLabel = subdivision ? getSubdivisionDisplayName(subdivision) : city

  /** For "Listing information current as of": prefer last delta sync (2-min Inngest) for active/pending; else per-listing timestamp. */
  const statusStr = String(fields.StandardStatus ?? '').toLowerCase()
  const isActiveOrPending = /active|pending|for sale|coming soon|under contract/i.test(statusStr) || !statusStr
  const perListingTs =
    fromSupabase && row
      ? ((row as Record<string, unknown>).updated_at as string | undefined) ??
        ((row as Record<string, unknown>).UpdatedAt as string | undefined) ??
        ((row as Record<string, unknown>).modification_timestamp as string | undefined) ??
        (modTs || null)
      : null
  const lastSyncedAt = isActiveOrPending && lastDeltaSyncAt
    ? lastDeltaSyncAt
    : perListingTs

  /** Key facts with RESO/Spark field fallbacks. Coerce to number only when finite to avoid NaN in DOM. */
  const toNum = (v: unknown): number | null => {
    if (v == null) return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  const sqFt = toNum(fields.BuildingAreaTotal ?? fields.LivingArea)
  const listPriceNum = fields.ListPrice != null ? Number(fields.ListPrice) : 0
  const daysOnMarketFromFields = toNum(fields.DaysOnMarket ?? fields.CumulativeDaysOnMarket)
  const daysOnMarketComputed = (() => {
    const listDate = (fields.OnMarketDate ?? fields.ListDate) as string | undefined
    if (!listDate?.trim()) return null
    const listMs = new Date(listDate.trim()).getTime()
    if (!Number.isFinite(listMs)) return null
    const endDate = (fields.CloseDate as string)?.trim() || new Date().toISOString().slice(0, 10)
    const endMs = new Date(endDate).getTime()
    if (!Number.isFinite(endMs) || endMs < listMs) return null
    return Math.max(0, Math.floor((endMs - listMs) / (24 * 60 * 60 * 1000)))
  })()
  const keyFacts = {
    beds: toNum(fields.BedroomsTotal ?? fields.BedsTotal),
    baths: toNum(fields.BathroomsTotal ?? fields.BathsTotal),
    sqFt,
    lotAcres: toNum(fields.LotSizeAcres),
    yearBuilt: fields.YearBuilt != null ? (typeof fields.YearBuilt === 'number' ? fields.YearBuilt : (Number(fields.YearBuilt) || String(fields.YearBuilt))) : null,
    pricePerSqFt: sqFt != null && sqFt > 0 && listPriceNum > 0 ? Math.round(listPriceNum / sqFt) : null,
    daysOnMarket: daysOnMarketFromFields ?? daysOnMarketComputed,
  }
  const { highlights: specialHighlights, featureTags: specialTags } = buildListingHighlights(fields as Record<string, unknown>)

  const shareText = listingShareText({
    price: fields.ListPrice != null ? Number(fields.ListPrice) : null,
    beds: keyFacts.beds,
    baths: keyFacts.baths,
    sqft: keyFacts.sqFt,
    address: address || undefined,
    city: (fields.City as string) ?? undefined,
    publicRemarks: (fields.PublicRemarks as string) ?? undefined,
  })

  const fubPersonId = session?.user ? undefined : await getFubPersonIdFromCookie()
  if (session?.user?.email || (fubPersonId != null && fubPersonId > 0)) {
    trackListingView({
      user: session?.user ?? undefined,
      fubPersonId: fubPersonId ?? undefined,
      listingUrl,
      property: {
        street: address || undefined,
        city: (fields.City as string) || undefined,
        state: (fields.StateOrProvince as string) || undefined,
        code: (fields.PostalCode as string) || undefined,
        mlsNumber: mlsDisplay,
        price: fields.ListPrice != null ? Number(fields.ListPrice) : undefined,
        bedrooms: keyFacts.beds ?? undefined,
        bathrooms: keyFacts.baths ?? undefined,
        area: keyFacts.sqFt ?? undefined,
      },
    }).catch(() => {})
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900">
      <TrackListingView
        listingKey={resolvedKey}
        listingUrl={listingUrl}
        price={fields.ListPrice != null ? Number(fields.ListPrice) : undefined}
        city={fields.City as string}
        state={fields.StateOrProvince as string}
        mlsNumber={mlsDisplay}
        bedrooms={keyFacts.beds ?? undefined}
        bathrooms={keyFacts.baths ?? undefined}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }} />
      <ListingJsonLd listingKey={resolvedKey} fields={fields} imageUrl={firstPhoto} />

      {/* Hero: video first (if any), then photos — full width at top. Normalize for Supabase details (casing). */}
      <ListingHero
        photos={normalizeListingPhotos(fields) as import('../../../lib/spark').SparkPhoto[]}
        videos={normalizeListingVideos(fields) as import('../../../lib/spark').SparkVideo[]}
      />

      <BreadcrumbStrip
        items={breadcrumbItems.map((item, i) => (i < breadcrumbItems.length - 1 ? { label: item.name, href: item.item } : { label: item.name }))}
      />

      {/* Top bar: back to search (when from search) + All listings + prev/next with thumbnails */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BackToSearchLink returnUrl={returnUrl ?? undefined} />
            <Link href="/listings" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              All listings
            </Link>
          </div>
          <ListingNav
            listingKey={resolvedKey}
            prevKey={prevKey}
            nextKey={nextKey}
            prevListing={adjacentListings.prev}
            nextListing={adjacentListings.next}
            adjacentSlice={adjacentSlice}
            currentThumb={{
              ListingKey: resolvedKey,
              PhotoURL: firstPhoto ?? (row as { PhotoURL?: string } | null)?.PhotoURL ?? null,
              ListPrice: listPrice,
              StreetNumber: streetNumber ?? (fields.StreetNumber as string) ?? null,
              StreetName: streetName ?? (fields.StreetName as string) ?? null,
              City: addressCity ?? (fields.City as string) ?? null,
            }}
          />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8">
          <div className="min-w-0">
            {areaSearchHref && !subdivision && (
              <Link
                href={areaSearchHref}
                className="mb-6 flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow"
              >
                {areaBannerUrl ? (
                  <img
                    src={areaBannerUrl}
                    alt=""
                    className="h-20 w-40 shrink-0 object-cover sm:h-24 sm:w-52"
                    width={208}
                    height={96}
                  />
                ) : (
                  <div className="flex h-20 w-40 shrink-0 items-center justify-center bg-zinc-100 text-zinc-400 sm:h-24 sm:w-52" />
                )}
                <div className="flex flex-1 items-center px-4">
                  <span className="font-medium text-zinc-700">Explore homes in {areaLabel}</span>
                  <span className="ml-2 text-zinc-400">→</span>
                </div>
              </Link>
            )}
            {/* 2. Address, price, status */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">MLS# {mlsDisplay}</p>
                {listPrice > 0 && (
                  <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--brand-navy)]">
                    ${listPrice.toLocaleString()}
                  </p>
                )}
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">
                  {address || 'Address not specified'}
                </h1>
                {cityStateZip && <p className="mt-0.5 text-zinc-600">{cityStateZip}</p>}
                {fields.StandardStatus && (
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      String(fields.StandardStatus).toLowerCase().includes('pending')
                        ? 'bg-amber-100 text-amber-800'
                        : String(fields.StandardStatus).toLowerCase().includes('closed')
                          ? 'bg-zinc-200 text-zinc-700'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {String(fields.StandardStatus).trim() || 'Active'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveCount > 0 && (
                  <span className="text-sm text-zinc-500">{saveCount} {saveCount === 1 ? 'person has' : 'people have'} saved this home</span>
                )}
                {session?.user && (
                  <SaveListingButton
                    listingKey={resolvedKey}
                    saved={saved}
                    userEmail={session.user.email ?? undefined}
                    listingUrl={listingUrl}
                    property={{
                      street: address || undefined,
                      city: (fields.City as string) ?? undefined,
                      state: (fields.StateOrProvince as string) ?? undefined,
                      mlsNumber: mlsDisplay,
                      price: fields.ListPrice != null ? Number(fields.ListPrice) : undefined,
                      bedrooms: keyFacts.beds ?? undefined,
                      bathrooms: keyFacts.baths ?? undefined,
                    }}
                  />
                )}
                {session?.user && (
                  <LikeButton listingKey={resolvedKey} liked={liked} likeCount={likeCount} variant="default" />
                )}
                <ShareButton
                  title={`${address || cityStateZip || `MLS# ${mlsDisplay}`}${cityStateZip ? ` | ${cityStateZip}` : ''}`}
                  text={shareText}
                  url={listingUrl}
                  variant="default"
                  trackContext="listing_detail"
                />
              </div>
            </div>

            {/* 3. Key facts strip — with icons (beds, baths, sq ft, lot, year built, days on market) */}
            {(keyFacts.beds != null || keyFacts.baths != null || keyFacts.sqFt != null || keyFacts.lotAcres != null || keyFacts.yearBuilt != null || keyFacts.daysOnMarket != null) && (
              <div className="mb-8 grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm sm:flex sm:flex-wrap sm:gap-6">
                {keyFacts.beds != null && Number.isFinite(keyFacts.beds) && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Beds</p><p className="font-semibold text-zinc-900">{String(keyFacts.beds)}</p></div>
                  </div>
                )}
                {keyFacts.baths != null && Number.isFinite(keyFacts.baths) && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Baths</p><p className="font-semibold text-zinc-900">{String(keyFacts.baths)}</p></div>
                  </div>
                )}
                {keyFacts.sqFt != null && keyFacts.sqFt > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Sq Ft</p><p className="font-semibold text-zinc-900">{Number(keyFacts.sqFt).toLocaleString()}</p></div>
                  </div>
                )}
                {keyFacts.lotAcres != null && Number.isFinite(keyFacts.lotAcres) && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M12 12a2 2 0 104 0 2 2 0 00-4 0z" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Lot</p><p className="font-semibold text-zinc-900">{String(keyFacts.lotAcres)} ac</p></div>
                  </div>
                )}
                {keyFacts.yearBuilt != null && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Year Built</p><p className="font-semibold text-zinc-900">{String(keyFacts.yearBuilt)}</p></div>
                  </div>
                )}
                {keyFacts.daysOnMarket != null && Number.isFinite(keyFacts.daysOnMarket) && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </span>
                    <div><p className="text-xs text-zinc-500">Days on market</p><p className="font-semibold text-zinc-900">{Number(keyFacts.daysOnMarket).toLocaleString()}</p></div>
                  </div>
                )}
              </div>
            )}

            {/* 3c. Estimated Monthly Cost — directly under Home Features; expandable Mortgage Calculator, saves to profile */}
            <ListingEstimatedMonthlyCost
              listPrice={listPrice}
              initialPrefs={displayPrefs}
              signedIn={signedIn}
            />

            {/* 3a. Listing summary — Spark sync time, days on market, views, saves, likes (no listing agency phone) */}
            <div className="mb-8">
              <ListingSummary
                lastSyncedAt={lastSyncedAt}
                daysOnMarket={null}
                viewCount={engagementDetail?.view_count ?? 0}
                saveCount={engagementDetail?.save_count ?? 0}
                likeCount={engagementDetail?.like_count ?? 0}
              />
            </div>

            {/* 3b. Estimated Value (CMA) — only when valuation exists and VOW allows display */}
            <ListingValuationSection listingKey={resolvedKey} signedIn={!!session?.user} />

            {/* 4. What Makes This Property Special — per competitive audit */}
            <div className="mb-8">
              <ListingSpecial highlights={specialHighlights} featureTags={specialTags} />
            </div>

            {/* CTAs: visible on mobile/tablet only (desktop has sidebar) */}
            <div className="mb-6 lg:hidden">
              <ListingCtaSidebar
                address={address || 'Address not specified'}
                cityStateZip={cityStateZip ?? undefined}
                listingUrl={listingUrl}
                listPrice={fields.ListPrice != null ? Number(fields.ListPrice) : null}
                listingId={mlsDisplay}
                listingKey={resolvedKey}
                userEmail={session?.user?.email ?? undefined}
                userName={session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.name ?? undefined}
                fubPersonId={fubPersonId ?? undefined}
                calculatorUrl={calculatorUrl}
              />
            </div>

            {/* 5. Property Description — full copy before details per audit */}
            {(fields.PublicRemarks ?? fields.PrivateRemarks) && (
              <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">Property description</h2>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-700">{String(fields.PublicRemarks ?? fields.PrivateRemarks).trim()}</p>
              </section>
            )}

            {/* 6. Property Details — MLS fields (description shown above) */}
            <div className="mb-8">
              <ListingDetails listing={raw} showRemarks={false} isOurBroker={isOurBroker} />
            </div>

            {/* 7. Location and Neighborhood */}
        {(fields.Latitude != null && fields.Longitude != null && Number.isFinite(Number(fields.Latitude)) && Number.isFinite(Number(fields.Longitude))) ||
        similarListings.some((l) => l.Latitude != null && l.Longitude != null && Number.isFinite(Number(l.Latitude)) && Number.isFinite(Number(l.Longitude))) ? (
          <CollapsibleSection id="location" title="Location" defaultOpen>
            <ListingDetailMapGoogle
              subjectListing={
                (() => {
                  if (fields.Latitude == null || fields.Longitude == null) return null
                  const lat = Number(fields.Latitude)
                  const lng = Number(fields.Longitude)
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
                  return {
                    latitude: lat,
                    longitude: lng,
                    listingKey: resolvedKey,
                    listPrice: fields.ListPrice,
                    photoUrl: firstPhoto ?? (row as { PhotoURL?: string } | null)?.PhotoURL ?? undefined,
                  }
                })()
              }
              otherListings={similarListings
                .filter((l) => l.Latitude != null && l.Longitude != null && Number.isFinite(Number(l.Latitude)) && Number.isFinite(Number(l.Longitude)))
                .map((l) => ({
                  latitude: Number(l.Latitude),
                  longitude: Number(l.Longitude),
                  listingKey: (l.ListNumber ?? l.ListingKey ?? '').toString().trim(),
                  listPrice: l.ListPrice,
                }))}
            />
            {similarListings.length > 0 && (
              <p className="mt-2 text-sm text-zinc-500">
                Thumbnail is this listing; others show price. Click a marker to view that listing.
              </p>
            )}
          </CollapsibleSection>
        ) : null}

            {/* 9. Market Context — price/sf, DOM, days on market, price history */}
            <CollapsibleSection id="market-context" title="Market context" defaultOpen={historyItems.length > 0}>
              <div className="space-y-4">
                {keyFacts.pricePerSqFt != null && (
                  <p className="text-zinc-700">Price per sq ft: <span className="font-semibold">${keyFacts.pricePerSqFt.toLocaleString()}</span></p>
                )}
                {(fields.OnMarketDate ?? fields.ListDate) && (
                  <p className="text-zinc-700">
                    On market: <span className="font-semibold">{new Date((fields.OnMarketDate ?? fields.ListDate) as string).toLocaleDateString()}</span>
                  </p>
                )}
                <ListingHistory items={historyItems} />
              </div>
            </CollapsibleSection>

            {/* 10. Nearby / similar listings — when no subdivision show "Nearby Homes"; subdivision listings are in the top strip only */}
            {!subdivision && (
              <CollapsibleSection id="similar" title="Nearby Homes" defaultOpen badge={similarListings.length || null}>
                {similarListings.length > 0 ? (
                  <ListingSimilarListings
                    subdivisionName={subdivisionName || 'Area'}
                    sectionTitle="Nearby Homes"
                    listings={similarListings}
                    signedIn={!!session?.user}
                    userEmail={session?.user?.email ?? undefined}
                    savedKeys={savedKeys}
                    likedKeys={likedKeys}
                  />
                ) : (
                  <p className="text-zinc-500">No similar listings available right now.</p>
                )}
              </CollapsibleSection>
            )}

            {/* Floor plans */}
        {(fields.FloorPlans?.length ?? 0) > 0 && (
          <CollapsibleSection id="floor-plans" title="Floor plans" defaultOpen badge={(fields.FloorPlans?.length ?? 0)}>
            <ListingFloorPlans floorPlans={fields.FloorPlans ?? []} />
          </CollapsibleSection>
        )}

        {/* Videos & virtual tours — videos are playable only; virtual tours open in new tab */}
        {(normalizeListingVideos(fields).length > 0 || normalizeListingVirtualTours(fields).length > 0) && (
          <CollapsibleSection id="videos" title="Videos & virtual tours" defaultOpen>
            <ListingVideos
              videos={normalizeListingVideos(fields) as import('../../../lib/spark').SparkVideo[]}
              virtualTours={normalizeListingVirtualTours(fields) as import('../../../lib/spark').SparkVirtualTour[]}
            />
          </CollapsibleSection>
        )}

        {/* Other listings at this address (active + optional past) */}
        {listingsAtAddressActive.length > 0 || listingsAtAddressAll.length > 0 ? (
          <CollapsibleSection id="same-address" title="Other listings at this address" defaultOpen>
            <ListingOtherListingsAtAddress
              addressLabel={address || cityStateZip || 'This address'}
              activeListings={listingsAtAddressActive}
              allListings={listingsAtAddressAll}
            />
          </CollapsibleSection>
        ) : null}

        {/* Documents */}
        {(fields.Documents as SparkDocument[] | undefined)?.length ? (
          <CollapsibleSection id="documents" title="Documents" defaultOpen badge={(fields.Documents as SparkDocument[]).length}>
            <ListingDocuments documents={(fields.Documents as SparkDocument[]) ?? []} />
          </CollapsibleSection>
        ) : null}

          </div>

          {/* Sticky CTA sidebar (desktop): Schedule a showing + Contact agent */}
          <div className="hidden lg:block">
            <ListingCtaSidebar
              address={address || 'Address not specified'}
              cityStateZip={cityStateZip ?? undefined}
              listingUrl={listingUrl}
              listPrice={fields.ListPrice != null ? Number(fields.ListPrice) : null}
              listingId={mlsDisplay}
              listingKey={resolvedKey}
              userEmail={session?.user?.email ?? undefined}
              userName={session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.name ?? undefined}
              fubPersonId={fubPersonId ?? undefined}
              calculatorUrl={calculatorUrl}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
