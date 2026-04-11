#!/usr/bin/env node
/**
 * Geocode "easy" listings missing Latitude/Longitude.
 *
 * Criteria (conservative):
 * - PropertyType = 'A' (residential)
 * - Both Latitude and Longitude null
 * - Non-empty StreetNumber, StreetName, City, State, PostalCode
 * - Google Geocoding returns OK with geometry.location_type of ROOFTOP or RANGE_INTERPOLATED
 *
 * Usage:
 *   node --env-file=.env.local scripts/geocode-easy-missing-listings.mjs --dry-run --limit 50
 *   node --env-file=.env.local scripts/geocode-easy-missing-listings.mjs --apply --limit 500
 *   node --env-file=.env.local scripts/geocode-easy-missing-listings.mjs --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * Optional: GEOCODE_EASY_DELAY_MS (default 120) throttle between Google calls
 */

import { createClient } from '@supabase/supabase-js'

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const PAGE_SIZE = 250

const ACCEPT_LOCATION_TYPES = new Set(['ROOFTOP', 'RANGE_INTERPOLATED'])

function argFlag(name) {
  return process.argv.includes(`--${name}`)
}

function argValue(name, fallback) {
  const i = process.argv.findIndex((a) => a === `--${name}`)
  if (i === -1) return fallback
  return process.argv[i + 1] ?? fallback
}

function nonempty(s) {
  return typeof s === 'string' && s.trim().length > 0
}

function buildAddress(row) {
  const line1 = [row.StreetNumber, row.StreetName].filter(nonempty).join(' ').trim()
  const line2 = [row.City, row.State, row.PostalCode].filter(nonempty).join(' ').trim()
  return [line1, line2].filter(Boolean).join(', ')
}

async function geocodeRow(apiKey, row) {
  const address = buildAddress(row)
  if (!address.replace(/,/g, '').trim()) {
    return { status: 'skip', reason: 'empty_address' }
  }
  const params = new URLSearchParams({
    address,
    key: apiKey,
    region: 'us',
  })
  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`)
  const data = await res.json()

  if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'REQUEST_DENIED') {
    return { status: 'fatal', reason: data.status, error_message: data.error_message }
  }
  if (data.status !== 'OK' || !data.results?.length) {
    return { status: 'no_result', reason: data.status ?? 'UNKNOWN' }
  }
  const first = data.results[0]
  const locType = first.geometry?.location_type ?? ''
  if (!ACCEPT_LOCATION_TYPES.has(locType)) {
    return { status: 'reject_location_type', reason: locType || 'MISSING' }
  }
  const { lat, lng } = first.geometry?.location ?? {}
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: 'bad_coords' }
  }
  return { status: 'ok', lat, lng, location_type: locType }
}

async function main() {
  const dryRun = argFlag('dry-run') || !argFlag('apply')
  const limitRaw = argValue('limit', '0')
  const maxRows = Number.parseInt(limitRaw, 10)
  const maxTotal = Number.isFinite(maxRows) && maxRows > 0 ? maxRows : Infinity

  const delayMs = Math.max(
    0,
    Number.parseInt(process.env.GEOCODE_EASY_DELAY_MS ?? '120', 10) || 120
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!apiKey?.trim()) {
    console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  console.log(
    dryRun
      ? '[dry-run] No database writes. Pass --apply to update listings.'
      : '[apply] Will update listings.Latitude / Longitude when Google returns ROOFTOP or RANGE_INTERPOLATED.'
  )
  console.log(`[config] delay between requests: ${delayMs}ms, page size: ${PAGE_SIZE}, max rows: ${maxTotal}`)

  const stats = {
    scanned: 0,
    geocode_ok: 0,
    geocode_no_result: 0,
    reject_location_type: 0,
    skip: 0,
    updated: 0,
    update_errors: 0,
    fatal: 0,
  }

  /** Stable offset pagination (safe with --limit partial last page). */
  let rangeOffset = 0

  while (stats.scanned < maxTotal && stats.fatal === 0) {
    const remaining = maxTotal === Infinity ? PAGE_SIZE : maxTotal - stats.scanned
    const take = Math.min(PAGE_SIZE, remaining)
    const rangeEnd = rangeOffset + take - 1

    const { data, error } = await supabase
      .from('listings')
      .select('ListNumber, StreetNumber, StreetName, City, State, PostalCode, Latitude, Longitude')
      .is('Latitude', null)
      .is('Longitude', null)
      .eq('PropertyType', 'A')
      .order('ListNumber', { ascending: true })
      .range(rangeOffset, rangeEnd)
    if (error) {
      console.error('[query]', error.message)
      process.exit(1)
    }
    const rows = data ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      if (stats.scanned >= maxTotal) break

      if (
        !nonempty(row.StreetNumber) ||
        !nonempty(row.StreetName) ||
        !nonempty(row.City) ||
        !nonempty(row.State) ||
        !nonempty(row.PostalCode)
      ) {
        stats.skip += 1
        stats.scanned += 1
        continue
      }

      const g = await geocodeRow(apiKey, row)
      if (g.status === 'fatal') {
        console.error('[fatal]', g.reason, g.error_message ?? '')
        stats.fatal += 1
        break
      }
      if (g.status === 'skip') {
        stats.skip += 1
      } else if (g.status === 'no_result' || g.status === 'bad_coords') {
        stats.geocode_no_result += 1
      } else if (g.status === 'reject_location_type') {
        stats.reject_location_type += 1
      } else if (g.status === 'ok') {
        stats.geocode_ok += 1
        if (!dryRun) {
          const { error: upErr } = await supabase
            .from('listings')
            .update({ Latitude: g.lat, Longitude: g.lng })
            .eq('ListNumber', row.ListNumber)
          if (upErr) {
            console.error('[update]', row.ListNumber, upErr.message)
            stats.update_errors += 1
          } else {
            stats.updated += 1
          }
        }
      }

      stats.scanned += 1
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))

      if (stats.scanned % 100 === 0) {
        console.log('[progress]', { ...stats, rangeOffset })
      }
    }

    rangeOffset += rows.length

    if (rows.length < take) break
  }

  console.log('[done]', stats)
  if (stats.fatal) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
