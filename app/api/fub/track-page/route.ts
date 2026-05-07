/**
 * POST /api/fub/track-page
 *
 * Cross-origin page-tracking endpoint for the AgentFire WordPress site at
 * ryan-realty.com. Called by the body-before-closing-tag snippet on every
 * page load (after the visitor has identified via /api/fub/identify and the
 * `rr_identified=<fubPersonId>` cookie is set).
 *
 * Dispatches to the existing FUB helpers:
 *   - listing detail page (mlsNumber or street present) → trackListingView
 *     (FUB event type: "Viewed Property")
 *   - any other page → trackPageView
 *     (FUB event type: "Viewed Page")
 *
 * Auth model:
 *   - Origin allowlist (only ryan-realty.com / www.ryan-realty.com)
 *   - fubPersonId is trusted from the request body. Trade-off: a spammer who
 *     spoofs Origin and posts arbitrary fubPersonIds will create noise events
 *     in FUB. Acceptable for v1 because (a) Origin check stops casual abuse,
 *     (b) IP rate-limit middleware is already in place at 60 req/min, (c) the
 *     attack value is just noise — no PII exfiltration, no account takeover.
 *     A signed-cookie HMAC layer can be added in v2 if abuse is observed.
 */

import { NextResponse } from 'next/server'
import { trackPageView, trackListingView } from '@/lib/followupboss'

const ALLOWED_ORIGINS = new Set<string>([
  'https://ryan-realty.com',
  'https://www.ryan-realty.com',
])

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonError(status: number, error: string, origin: string | null) {
  return NextResponse.json({ ok: false, error }, { status, headers: corsHeaders(origin) })
}

type ListingMeta = {
  listingUrl?: string
  street?: string
  city?: string
  state?: string
  code?: string
  mlsNumber?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  area?: number
}

type TrackPageBody = {
  fubPersonId?: number | string
  pageUrl?: string
  pageTitle?: string
  listing?: ListingMeta | null
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return jsonError(403, 'Origin not allowed', origin)
  }

  let body: TrackPageBody
  try {
    body = (await request.json()) as TrackPageBody
  } catch {
    return jsonError(400, 'Invalid JSON', origin)
  }

  const fubPersonId = Number(body.fubPersonId)
  if (!Number.isFinite(fubPersonId) || fubPersonId <= 0) {
    return jsonError(400, 'Invalid fubPersonId', origin)
  }

  const pageUrl = body.pageUrl?.trim() || ''
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    return jsonError(400, 'Missing or invalid pageUrl', origin)
  }
  // Defense in depth: only accept URLs from the allowed origins.
  try {
    const u = new URL(pageUrl)
    if (!ALLOWED_ORIGINS.has(`${u.protocol}//${u.host}`)) {
      return jsonError(400, 'pageUrl host not allowed', origin)
    }
  } catch {
    return jsonError(400, 'pageUrl unparseable', origin)
  }

  const pageTitle = body.pageTitle?.trim() || undefined

  const listing = body.listing
  const isListingPage = !!(listing && (listing.mlsNumber || listing.street))

  if (isListingPage && listing) {
    await trackListingView({
      fubPersonId,
      listingUrl: listing.listingUrl || pageUrl,
      property: {
        street: listing.street,
        city: listing.city,
        state: listing.state,
        code: listing.code,
        mlsNumber: listing.mlsNumber,
        price: typeof listing.price === 'number' ? listing.price : undefined,
        bedrooms: typeof listing.bedrooms === 'number' ? listing.bedrooms : undefined,
        bathrooms: typeof listing.bathrooms === 'number' ? listing.bathrooms : undefined,
        area: typeof listing.area === 'number' ? listing.area : undefined,
      },
    })
    return NextResponse.json({ ok: true, eventType: 'Viewed Property' }, { headers: corsHeaders(origin) })
  }

  await trackPageView({
    fubPersonId,
    pageUrl,
    pageTitle,
  })
  return NextResponse.json({ ok: true, eventType: 'Viewed Page' }, { headers: corsHeaders(origin) })
}
