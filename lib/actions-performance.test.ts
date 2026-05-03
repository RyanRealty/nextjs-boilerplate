import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CITY_LISTING_TILE_SELECT,
  COMMUNITY_LISTING_TILE_SELECT,
  HOME_TILE_SELECT,
} from './listing-tile-projections'

const listingState = vi.hoisted(() => {
  let resolveList: ((value: unknown) => void) | null = null
  let resolveCount: ((value: unknown) => void) | null = null
  return {
    listStarted: false,
    countStarted: false,
    makeListPromise: () =>
      new Promise((resolve) => {
        resolveList = resolve
      }),
    makeCountPromise: () =>
      new Promise((resolve) => {
        resolveCount = resolve
      }),
    resolveList: (value: unknown) => resolveList?.(value),
    resolveCount: (value: unknown) => resolveCount?.(value),
    reset: () => {
      resolveList = null
      resolveCount = null
      listingState.listStarted = false
      listingState.countStarted = false
    },
  }
})

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => new FakeListingsQuery(),
  }),
}))

class FakeListingsQuery {
  private isCountQuery = false

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.isCountQuery = options?.head === true
    return this
  }

  ilike() { return this }
  or() { return this }
  gte() { return this }
  lte() { return this }
  order() { return this }
  limit() { return this }

  then(resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) {
    if (this.isCountQuery) {
      listingState.countStarted = true
      return listingState.makeCountPromise().then(resolve, reject)
    }

    listingState.listStarted = true
    return listingState.makeListPromise().then(resolve, reject)
  }
}

describe('listing action performance contracts', () => {
  beforeEach(() => {
    listingState.reset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('starts basic listing rows and total count before either query resolves', async () => {
    const { getListingsWithAdvanced } = await import('@/app/actions/listings')

    const resultPromise = getListingsWithAdvanced({ city: 'Bend', limit: 24 })
    await Promise.resolve()

    expect(listingState.listStarted).toBe(true)
    expect(listingState.countStarted).toBe(true)

    listingState.resolveList({
      data: [
        {
          ListingKey: 'lk-1',
          ListNumber: '220000001',
          ListPrice: 700000,
          BedroomsTotal: 3,
          BathroomsTotal: 2,
          StreetNumber: '1',
          StreetName: 'Main',
          City: 'Bend',
          State: 'OR',
          PostalCode: '97702',
          SubdivisionName: 'Example',
          PhotoURL: null,
          Latitude: 44,
          Longitude: -121,
          StandardStatus: 'Active',
        },
      ],
    })
    listingState.resolveCount({ count: 1 })

    await expect(resultPromise).resolves.toMatchObject({ totalCount: 1 })
  })

  it('limits concurrent external geocode requests', async () => {
    const { getGeocodedListings } = await import('@/app/actions/geocode')
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'maps-key'

    let inFlight = 0
    let maxInFlight = 0
    const fetchMock = vi.fn(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      return {
        json: async () => ({
          status: 'OK',
          results: [{ geometry: { location: { lat: 44.1, lng: -121.3 } } }],
        }),
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const listings = Array.from({ length: 8 }, (_, index) => ({
      ListNumber: `22000000${index}`,
      StreetNumber: `${index}`,
      StreetName: 'Main St',
      City: 'Bend',
      State: 'OR',
      PostalCode: '97702',
      Latitude: null,
      Longitude: null,
    }))

    const result = await getGeocodedListings(listings)

    expect(result).toHaveLength(8)
    expect(fetchMock).toHaveBeenCalledTimes(8)
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })

  it('caps external geocode requests per call', async () => {
    const { getGeocodedListings } = await import('@/app/actions/geocode')
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'maps-key'

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        status: 'OK',
        results: [{ geometry: { location: { lat: 44.1, lng: -121.3 } } }],
      }),
    }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    const listings = Array.from({ length: 14 }, (_, index) => ({
      ListNumber: `22000000${index}`,
      StreetNumber: `${index}`,
      StreetName: 'Main St',
      City: 'Bend',
      State: 'OR',
      PostalCode: '97702',
      Latitude: null,
      Longitude: null,
    }))

    const result = await getGeocodedListings(listings)

    expect(result).toHaveLength(14)
    expect(fetchMock).toHaveBeenCalledTimes(10)
    expect(result.filter((listing) => listing.Latitude != null && listing.Longitude != null)).toHaveLength(10)
  })

  it('keeps listing tile projections off details JSONB', () => {
    for (const projection of [HOME_TILE_SELECT, CITY_LISTING_TILE_SELECT, COMMUNITY_LISTING_TILE_SELECT]) {
      expect(projection.split(',').map((column) => column.trim())).not.toContain('details')
    }
  })
})
