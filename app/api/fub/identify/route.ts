/**
 * POST /api/fub/identify
 *
 * Cross-origin identify endpoint for the AgentFire WordPress site at ryan-realty.com.
 *
 * Flow:
 *   1. WP snippet captures Google ID token (One Tap) or Facebook access token (FB Login).
 *   2. WP fetches this endpoint with { provider, idToken|accessToken, sourceUrl }.
 *   3. Endpoint verifies the token with the provider (no trusting the client).
 *   4. Endpoint looks up the verified email in FUB:
 *      - Hit  → logs "Signed in again (Google|Facebook) - WP" event on existing person.
 *      - Miss → creates person via FUB event with "Signed up (Google|Facebook) - WP".
 *   5. Returns { ok, matched, fubPersonId } so WP can show "Welcome back" UX.
 *
 * Origin allowlist + provider-side token verification is the auth model.
 * The endpoint does NOT trust an email passed in the body.
 */

import { NextResponse } from 'next/server'
import { findPersonByEmail, trackSignedInUser } from '@/lib/followupboss'

// Domains allowed to call this endpoint. Add staging/preview here if needed.
const ALLOWED_ORIGINS = new Set<string>([
  'https://ryan-realty.com',
  'https://www.ryan-realty.com',
])

const GOOGLE_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo'
const FB_DEBUG_TOKEN = 'https://graph.facebook.com/debug_token'
const FB_USER = 'https://graph.facebook.com/me'

type Provider = 'google' | 'facebook'

type IdentifyBody = {
  provider?: Provider
  idToken?: string // Google
  accessToken?: string // Facebook
  sourceUrl?: string // page on ryan-realty.com the user was on
}

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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return jsonError(403, 'Origin not allowed', origin)
  }

  let body: IdentifyBody
  try {
    body = (await request.json()) as IdentifyBody
  } catch {
    return jsonError(400, 'Invalid JSON', origin)
  }

  const { provider, idToken, accessToken, sourceUrl } = body
  if (provider !== 'google' && provider !== 'facebook') {
    return jsonError(400, 'Invalid provider', origin)
  }

  let email: string | undefined
  let fullName: string | undefined
  let providerLabel: 'Google' | 'Facebook'

  if (provider === 'google') {
    const verified = await verifyGoogleIdToken(idToken)
    if (!verified.ok) return jsonError(verified.status, verified.error, origin)
    email = verified.email
    fullName = verified.name
    providerLabel = 'Google'
  } else {
    const verified = await verifyFacebookAccessToken(accessToken)
    if (!verified.ok) return jsonError(verified.status, verified.error, origin)
    email = verified.email
    fullName = verified.name
    providerLabel = 'Facebook'
  }

  if (!email) {
    return jsonError(401, 'Provider returned no email', origin)
  }

  // Look up first so we know whether to call this a return visit or a new sign-up.
  // trackSignedInUser also calls findPersonByEmail internally; the duplicate
  // lookup is a single GET (~100ms) and keeps the existing function untouched.
  const existing = await findPersonByEmail(email)

  await trackSignedInUser({
    email,
    fullName,
    sourceUrl: sourceUrl || origin,
    message: existing ? `Signed in (${providerLabel}) - WP` : `Signed up (${providerLabel}) - WP`,
  })

  return NextResponse.json(
    {
      ok: true,
      matched: !!existing,
      fubPersonId: existing?.id ?? null,
      firstName: existing?.firstName ?? fullName?.split(' ')[0] ?? null,
    },
    { headers: corsHeaders(origin) },
  )
}

// ---------- Provider verification ----------

type Verified =
  | { ok: true; email: string; name?: string }
  | { ok: false; status: number; error: string }

/**
 * Verify a Google ID token via Google's public tokeninfo endpoint.
 * Same checks google-auth-library does, without adding the dependency.
 */
async function verifyGoogleIdToken(idToken: string | undefined): Promise<Verified> {
  if (!idToken) return { ok: false, status: 400, error: 'Missing idToken' }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  if (!clientId) return { ok: false, status: 500, error: 'Google OAuth not configured' }

  let res: Response
  try {
    res = await fetch(`${GOOGLE_TOKENINFO}?id_token=${encodeURIComponent(idToken)}`, {
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 502, error: 'Google verification network error' }
  }
  if (!res.ok) return { ok: false, status: 401, error: 'Google ID token invalid' }

  const payload = (await res.json()) as {
    iss?: string
    aud?: string
    exp?: string
    email?: string
    email_verified?: string
    name?: string
  }

  if (payload.aud !== clientId) {
    return { ok: false, status: 401, error: 'Token audience mismatch' }
  }
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    return { ok: false, status: 401, error: 'Token issuer invalid' }
  }
  if (payload.email_verified !== 'true') {
    return { ok: false, status: 401, error: 'Email not verified by Google' }
  }
  const expSec = Number(payload.exp ?? '0')
  if (!Number.isFinite(expSec) || expSec * 1000 < Date.now()) {
    return { ok: false, status: 401, error: 'Token expired' }
  }
  if (!payload.email) {
    return { ok: false, status: 401, error: 'Token missing email' }
  }

  return { ok: true, email: payload.email, name: payload.name }
}

/**
 * Verify a Facebook user access token via the Graph API debug_token endpoint,
 * then fetch the user's email + name. Standard server-side Facebook Login flow.
 */
async function verifyFacebookAccessToken(accessToken: string | undefined): Promise<Verified> {
  if (!accessToken) return { ok: false, status: 400, error: 'Missing accessToken' }

  const appId = process.env.META_APP_ID?.trim()
  const appSecret = process.env.META_APP_SECRET?.trim()
  if (!appId || !appSecret) {
    return { ok: false, status: 500, error: 'Facebook OAuth not configured' }
  }

  // 1. Validate the token belongs to our app and isn't expired/revoked.
  const appToken = `${appId}|${appSecret}`
  let debugRes: Response
  try {
    const url = `${FB_DEBUG_TOKEN}?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    debugRes = await fetch(url, { cache: 'no-store' })
  } catch {
    return { ok: false, status: 502, error: 'Facebook verification network error' }
  }
  if (!debugRes.ok) return { ok: false, status: 401, error: 'Facebook token invalid' }
  const debug = (await debugRes.json()) as {
    data?: { app_id?: string; is_valid?: boolean; expires_at?: number; user_id?: string }
  }
  if (!debug.data?.is_valid) return { ok: false, status: 401, error: 'Facebook token invalid' }
  if (debug.data.app_id !== appId) return { ok: false, status: 401, error: 'Token app mismatch' }
  if (debug.data.expires_at && debug.data.expires_at * 1000 < Date.now()) {
    return { ok: false, status: 401, error: 'Token expired' }
  }

  // 2. Fetch the user's email + name with the same token.
  let userRes: Response
  try {
    const url = `${FB_USER}?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
    userRes = await fetch(url, { cache: 'no-store' })
  } catch {
    return { ok: false, status: 502, error: 'Facebook user fetch network error' }
  }
  if (!userRes.ok) return { ok: false, status: 401, error: 'Facebook user fetch failed' }
  const user = (await userRes.json()) as { id?: string; name?: string; email?: string }
  if (!user.email) {
    return { ok: false, status: 403, error: 'Facebook user did not grant email permission' }
  }
  return { ok: true, email: user.email, name: user.name }
}
