/**
 * SkySlope Forms — Listings/Sales **Files** API helpers (api-latest.skyslope.com).
 * Pagination and date filters must match swagger:
 * GET /api/files/listings and GET /api/files/sales use
 * `earliestDate` / `latestDate` (Unix **seconds**) and `pageNumber` (1..1000),
 * **10 rows per page** (there is no pageSize query param).
 *
 * @see https://api-latest.skyslope.com/swagger/v1/swagger.json
 */

/** Swagger: "Each page contains 10 items" for listings and sales folder lists. */
export const SKYSLOPE_FILES_FOLDER_PAGE_SIZE = 10

/** Max pageNumber per swagger (Min 1, Max 1000). */
export const SKYSLOPE_FILES_FOLDER_MAX_PAGES = 1000

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ maxAttempts?: number }} [opts]
 */
export async function skyslopeFetchWithRetry(url, init, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 10
  let lastStatus = 0
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await fetch(url, init)
    lastStatus = r.status
    if (r.status === 429 || r.status === 503) {
      const backoff = Math.min(60_000, 400 * 2 ** attempt)
      await sleep(backoff)
      continue
    }
    return r
  }
  throw new Error(`SkySlope rate limited after ${maxAttempts} attempts (last HTTP ${lastStatus})`)
}

export function isSkySlopeFilesRowArchived(row) {
  if (!row || typeof row !== 'object') return false
  if (row.isArchived === true || row.archived === true) return true
  const hay = [row.status, row.stage, row.mlsStatus, row.fileStatus]
    .filter(Boolean)
    .map((x) => String(x))
    .join(' ')
    .toLowerCase()
  return /\barchiv/.test(hay)
}

/** Wide UTC window as Unix seconds for folder list queries. */
export function skyslopeFileFoldersDateRangeUnixSec() {
  return {
    earliestDate: Math.floor(Date.UTC(1990, 0, 1, 0, 0, 0) / 1000),
    latestDate: Math.floor(Date.UTC(2037, 11, 31, 23, 59, 59) / 1000),
  }
}

/**
 * @param {string} session
 * @param {string} base e.g. https://api-latest.skyslope.com
 * @param {'listings'|'sales'} kind
 * @param {() => Record<string, string>} getHeaders fresh headers per request (timestamp)
 * @param {boolean} includeArchived
 * @returns {Promise<object[]>}
 */
export async function fetchSkyslopeFileFolderRows(session, base, kind, getHeaders, includeArchived) {
  const valueKey = kind === 'listings' ? 'listings' : 'sales'
  const all = []
  const seen = new Set()
  const { earliestDate, latestDate } = skyslopeFileFoldersDateRangeUnixSec()

  for (let pageNumber = 1; pageNumber <= SKYSLOPE_FILES_FOLDER_MAX_PAGES; pageNumber++) {
    const params = new URLSearchParams({
      earliestDate: String(earliestDate),
      latestDate: String(latestDate),
      pageNumber: String(pageNumber),
    })
    const u = `${base.replace(/\/$/, '')}/api/files/${kind}?${params.toString()}`
    const r = await skyslopeFetchWithRetry(u, { headers: getHeaders() })
    if (!r.ok) throw new Error(`${kind} pageNumber=${pageNumber}: HTTP ${r.status}`)
    const j = await r.json()
    const rows = j?.value?.[valueKey] ?? []
    const kept = includeArchived ? rows : rows.filter((row) => !isSkySlopeFilesRowArchived(row))
    for (const row of kept) {
      const id = kind === 'listings' ? row.listingGuid : row.saleGuid
      if (id) {
        if (seen.has(id)) continue
        seen.add(id)
      }
      all.push(row)
    }
    if (rows.length < SKYSLOPE_FILES_FOLDER_PAGE_SIZE) break
    await sleep(Number(process.env.SKYSLOPE_PAGE_PACE_MS || 250))
  }
  return all
}
