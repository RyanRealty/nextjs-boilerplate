import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { cityEntityKey, listingDetailPath, listingsBrowsePath, slugify, teamPath, valuationPath } from '../lib/slug'
import { getAllPresetSlugs } from '../lib/search-presets'

const ACTIVE_STATUS_OR =
  'standard_status.is.null,standard_status.ilike.%Active%,standard_status.ilike.%For Sale%,standard_status.ilike.%Coming Soon%'
const SITEMAP_CHUNK_SIZE = 5000

export const revalidate = 3600

async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}${listingsBrowsePath()}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/communities`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/cities`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}${teamPath()}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${baseUrl}/reports`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/reports/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/open-houses`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/sell`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/sell/plan`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}${valuationPath()}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/buy`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/our-homes`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/area-guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/join`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/reviews`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/accessibility`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/fair-housing`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/dmca`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/tools/mortgage-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/tools/appreciation`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/activity`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  // If Supabase is not configured (e.g. during Vercel build), return only static pages.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return staticPages
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')

  const { data: cityRows } = await supabase
    .from('listings')
    .select('City')
    .or(ACTIVE_STATUS_OR)
    .not('City', 'is', null)
    .limit(5000)
  const cities = Array.from(
    new Set(
      ((cityRows ?? []) as Array<{ City?: string | null }>)
        .map((row) => (row.City ?? '').trim())
        .filter((city) => city.length > 0)
    )
  ).map((City) => ({ City }))
  const citySlugPages: MetadataRoute.Sitemap = cities.map(({ City }) => ({
    url: `${baseUrl}/cities/${cityEntityKey(City)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))
  const searchCityPages: MetadataRoute.Sitemap = cities.map(({ City }) => ({
    url: `${baseUrl}/homes-for-sale/${cityEntityKey(City)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  const { data: communityRows } = await supabase
    .from('communities')
    .select('slug, subdivision, updated_at')
    .limit(5000)
  const communities = (communityRows ?? []) as Array<{ slug: string; subdivision: string; updated_at?: string | null }>
  const communityPages: MetadataRoute.Sitemap = communities.map((c) => ({
    url: `${baseUrl}/communities/${encodeURIComponent(c.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const subdivisionPages: MetadataRoute.Sitemap = []
  const searchSubdivisionPages: MetadataRoute.Sitemap = []
  const presetSlugs = getAllPresetSlugs()
  const searchCityPresetPages: MetadataRoute.Sitemap = []
  const searchSubdivisionPresetPages: MetadataRoute.Sitemap = []
  for (const { City } of cities) {
    const cityKey = cityEntityKey(City)
    for (const presetSlug of presetSlugs) {
      searchCityPresetPages.push({
        url: `${baseUrl}/homes-for-sale/${cityKey}/${presetSlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })
    }
    const { data: subdivisionRows } = await supabase
      .from('listings')
      .select('SubdivisionName')
      .eq('City', City)
      .not('SubdivisionName', 'is', null)
      .limit(5000)
    const subs = Array.from(
      new Set(
        ((subdivisionRows ?? []) as Array<{ SubdivisionName?: string | null }>)
          .map((row) => (row.SubdivisionName ?? '').trim())
          .filter((name) => name.length > 0)
      )
    ).map((subdivisionName) => ({ subdivisionName }))
    for (const { subdivisionName } of subs) {
      const neighborhoodSlug = slugify(subdivisionName)
      subdivisionPages.push({
        url: `${baseUrl}/cities/${cityEntityKey(City)}/${encodeURIComponent(neighborhoodSlug)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
      const subSlug = slugify(subdivisionName)
      searchSubdivisionPages.push({
        url: `${baseUrl}/homes-for-sale/${cityEntityKey(City)}/${subSlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
      for (const presetSlug of presetSlugs) {
        searchSubdivisionPresetPages.push({
          url: `${baseUrl}/homes-for-sale/${cityKey}/${subSlug}/${presetSlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.75,
        })
      }
    }
  }

  const { data: brokers } = await supabase
    .from('brokers')
    .select('slug, updated_at')
    .eq('is_active', true)
    .limit(5000)
  const teamPages: MetadataRoute.Sitemap = ((brokers ?? []) as Array<{ slug: string; updated_at?: string | null }>).map((b) => ({
    url: `${baseUrl}${teamPath(b.slug)}`,
    lastModified: new Date((b.updated_at as string | undefined) ?? now.toISOString()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const { data: reports } = await supabase
    .from('market_reports')
    .select('slug, created_at')
    .limit(500)
  const reportPages: MetadataRoute.Sitemap = ((reports ?? []) as Array<{ slug: string; created_at?: string | null }>).map((r) => ({
    url: `${baseUrl}/reports/${r.slug}`,
    lastModified: new Date((r.created_at as string | undefined) ?? now.toISOString()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
  const reportGeoPages: MetadataRoute.Sitemap = []
  for (const { City } of cities) {
    reportGeoPages.push({
      url: `${baseUrl}/reports/city/${encodeURIComponent(City)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
  }
  for (const c of communities) {
    reportGeoPages.push({
      url: `${baseUrl}/reports/community/${encodeURIComponent(c.subdivision)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
  }

  const { data: zipRows } = await supabase
    .from('listings')
    .select('PostalCode')
    .or(ACTIVE_STATUS_OR)
    .not('PostalCode', 'is', null)
    .limit(10000)
  const zipPages: MetadataRoute.Sitemap = Array.from(
    new Set(
      ((zipRows ?? []) as Array<{ PostalCode?: string | null }>)
        .map((row) => (row.PostalCode ?? '').replace(/\D/g, '').slice(0, 5))
        .filter((zip) => zip.length === 5)
    )
  ).map((zip) => ({
    url: `${baseUrl}/zip/${zip}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let listingPages: MetadataRoute.Sitemap = []
  if (url?.trim() && anonKey?.trim()) {
    const supabase = createClient(url, anonKey)
    const { data } = await supabase
      .from('listings')
      .select('listing_key, list_number, subdivision_name, city, state, postal_code, street_number, street_name, updated_at')
      .or(ACTIVE_STATUS_OR)
      .limit(50000)
    const rows = (data ?? []) as Array<{
      listing_key: string
      list_number?: string | null
      subdivision_name?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      street_number?: string | null
      street_name?: string | null
      updated_at?: string
    }>
    listingPages = rows.map((r) => {
      const lastMod = r.updated_at ? new Date(r.updated_at) : new Date()
      return {
        url: `${baseUrl}${listingDetailPath(
          r.listing_key,
          {
            streetNumber: r.street_number ?? null,
            streetName: r.street_name ?? null,
            city: r.city ?? null,
            state: r.state ?? null,
            postalCode: r.postal_code ?? null,
          },
          {
            city: r.city ?? null,
            subdivision: r.subdivision_name ?? null,
          },
          {
            mlsNumber: r.list_number ?? null,
          }
        )}`,
        lastModified: lastMod,
        changeFrequency: 'daily' as const,
        priority: 0.7 as const,
      }
    })
  }

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, published_at')
    .eq('status', 'published')
    .limit(500)
  const blogPages: MetadataRoute.Sitemap = ((posts ?? []) as Array<{ slug: string; published_at?: string | null }>).map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const { data: guides } = await supabase
    .from('guides')
    .select('slug, published_at, updated_at')
    .eq('status', 'published')
    .limit(1000)
  const guidePages: MetadataRoute.Sitemap = ((guides ?? []) as Array<{ slug: string; published_at?: string | null; updated_at?: string | null }>).map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: g.updated_at ? new Date(g.updated_at) : g.published_at ? new Date(g.published_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  return [
    ...staticPages,
    ...searchCityPages,
    ...searchCityPresetPages,
    ...searchSubdivisionPages,
    ...searchSubdivisionPresetPages,
    ...citySlugPages,
    ...communityPages,
    ...subdivisionPages,
    ...teamPages,
    ...reportPages,
    ...reportGeoPages,
    ...zipPages,
    ...listingPages,
    ...blogPages,
    ...guidePages,
  ]
}

export async function generateSitemaps() {
  const entries = await buildSitemapEntries()
  const chunkCount = Math.max(1, Math.ceil(entries.length / SITEMAP_CHUNK_SIZE))
  return Array.from({ length: chunkCount }, (_, id) => ({ id }))
}

export default async function sitemap(props?: { id?: number }): Promise<MetadataRoute.Sitemap> {
  const entries = await buildSitemapEntries()
  const id = props?.id ?? 0
  const start = id * SITEMAP_CHUNK_SIZE
  return entries.slice(start, start + SITEMAP_CHUNK_SIZE)
}
