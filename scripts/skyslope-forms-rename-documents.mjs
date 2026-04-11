#!/usr/bin/env node
/**
 * SkySlope Forms — apply standardized document file names via PATCH.
 *
 * Default is **dry run** (no writes). To apply renames:
 *   SKYSLOPE_APPLY_RENAMES=1 npm run skyslope:forms-rename-documents
 *
 * Uses the same folder inventory as the comprehensive log (`skyslope-files-api.mjs`)
 * and the same naming rules as `skyslope-forms-document-taxonomy.mjs`.
 *
 * Requires .env.local SKYSLOPE_* (same as other SkySlope scripts).
 */
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

import { fetchSkyslopeFileFolderRows, skyslopeFetchWithRetry } from './skyslope-files-api.mjs'
import { inferKind, parseDate, suggestStandardName } from './skyslope-forms-document-taxonomy.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')
const BASE = 'https://api-latest.skyslope.com'
const APPLY = process.env.SKYSLOPE_APPLY_RENAMES === '1'
const INCLUDE_ARCHIVED = process.env.SKYSLOPE_INCLUDE_ARCHIVED === '1'
const CONCURRENCY = Math.min(
  8,
  Math.max(1, Number.parseInt(String(process.env.SKYSLOPE_RENAME_CONCURRENCY || '4'), 10) || 4)
)

function loadEnvLocal(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"'))
      val = val.slice(1, -1).replace(/\\n/g, '\n')
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    env[key] = val
  }
  return env
}

async function login(env) {
  const timestamp = new Date().toISOString()
  const hmac = crypto
    .createHmac('sha256', env.SKYSLOPE_ACCESS_SECRET.trim())
    .update(`${env.SKYSLOPE_CLIENT_ID.trim()}:${env.SKYSLOPE_CLIENT_SECRET.trim()}:${timestamp}`)
    .digest('base64')
  const res = await skyslopeFetchWithRetry(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ss ${env.SKYSLOPE_ACCESS_KEY.trim()}:${hmac}`,
      Timestamp: timestamp,
    },
    body: JSON.stringify({
      ClientId: env.SKYSLOPE_CLIENT_ID.trim(),
      ClientSecret: env.SKYSLOPE_CLIENT_SECRET.trim(),
    }),
  })
  const j = await res.json()
  if (!j.Session) throw new Error(`Login failed: ${JSON.stringify(j).slice(0, 400)}`)
  return j.Session
}

function apiHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Session: session,
    timestamp: new Date().toISOString(),
    Accept: 'application/json',
  }
}

async function fetchDocuments(session, kind, guid) {
  const r = await skyslopeFetchWithRetry(`${BASE}/api/files/${kind}/${guid}/documents`, {
    headers: apiHeaders(session),
  })
  if (!r.ok) return []
  const j = await r.json()
  return j?.value?.documents ?? []
}

async function fetchListingDetail(session, listingGuid) {
  const r = await skyslopeFetchWithRetry(`${BASE}/api/files/listings/${listingGuid}`, {
    headers: apiHeaders(session),
  })
  if (!r.ok) return null
  return r.json()
}

async function fetchSaleDetail(session, saleGuid) {
  const r = await skyslopeFetchWithRetry(`${BASE}/api/files/sales/${saleGuid}`, {
    headers: apiHeaders(session),
  })
  if (!r.ok) return null
  return r.json()
}

function safeAddress(prop) {
  if (!prop) return null
  const n = prop.streetNumber || ''
  const s = prop.streetAddress || ''
  const u = prop.unit || ''
  const c = prop.city || ''
  const st = prop.state || ''
  const z = prop.zip || ''
  const line = [n, s, u].filter(Boolean).join(' ').trim()
  const tail = [c, st, z].filter(Boolean).join(', ')
  return [line, tail].filter(Boolean).join(', ')
}

async function mapPool(items, concurrency, fn) {
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) break
      await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
}

function normName(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
}

async function patchDocumentFileName(session, kind, folderGuid, documentId, newFileName) {
  const pathSeg = kind === 'listing' ? 'listings' : 'sales'
  const idParam = encodeURIComponent(documentId)
  const folderParam = encodeURIComponent(folderGuid)
  const q = new URLSearchParams({ FileName: newFileName })
  const url = `${BASE}/api/files/${pathSeg}/${folderParam}/documents/${idParam}?${q}`
  const r = await skyslopeFetchWithRetry(url, {
    method: 'PATCH',
    headers: apiHeaders(session),
  })
  const text = await r.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  return { ok: r.ok, status: r.status, body }
}

async function main() {
  const env = loadEnvLocal(ENV_PATH)
  const session = await login(env)

  const listingRows = await fetchSkyslopeFileFolderRows(
    session,
    BASE,
    'listings',
    () => apiHeaders(session),
    INCLUDE_ARCHIVED
  )
  const saleRows = await fetchSkyslopeFileFolderRows(
    session,
    BASE,
    'sales',
    () => apiHeaders(session),
    INCLUDE_ARCHIVED
  )

  const folders = []
  for (const L of listingRows) {
    const guid = L.listingGuid
    const [detailJson, documents] = await Promise.all([
      fetchListingDetail(session, guid),
      fetchDocuments(session, 'listings', guid),
    ])
    const listing = detailJson?.value?.listing ?? null
    const propertyLine =
      L.propertyAddress ||
      safeAddress(listing?.property) ||
      [listing?.property?.streetNumber, listing?.property?.streetAddress].filter(Boolean).join(' ')
    folders.push({ kind: 'listing', guid, listing, propertyLine, documents })
  }
  for (const S of saleRows) {
    const guid = S.saleGuid
    const [detailJson, documents] = await Promise.all([
      fetchSaleDetail(session, guid),
      fetchDocuments(session, 'sales', guid),
    ])
    const sale = detailJson?.value?.sale ?? null
    const propertyLine = S.propertyAddress || safeAddress(sale?.property) || null
    folders.push({ kind: 'sale', guid, sale, propertyLine, documents })
  }

  const tasks = []
  for (const f of folders) {
    const mls = f.kind === 'listing' ? f.listing?.mlsNumber || '' : f.sale?.mlsNumber || ''
    const lane = f.kind === 'listing' ? 'LIST' : 'SALE'
    const sorted = [...f.documents].sort((a, b) => {
      const ta = parseDate(a.uploadDate) ?? parseDate(a.modifiedDate) ?? 0
      const tb = parseDate(b.uploadDate) ?? parseDate(b.modifiedDate) ?? 0
      return ta - tb
    })
    let seq = 0
    for (const d of sorted) {
      seq += 1
      const fn = d.fileName || d.name || ''
      const kind = inferKind(fn, d.name)
      const suggested = suggestStandardName({
        lane,
        uploadIso: d.uploadDate || d.modifiedDate,
        mls,
        category: kind,
        seq,
        origName: fn,
      })
      const current = normName(fn)
      const next = normName(suggested)
      if (!d.id || current === next) continue
      tasks.push({ f, d, suggested: next, current, kind })
    }
  }

  console.error(
    JSON.stringify({
      mode: APPLY ? 'apply' : 'dry_run',
      folders: folders.length,
      documentsToRename: tasks.length,
      note: APPLY
        ? 'PATCHing FileName per SkySlope ListingDocuments/SaleDocuments API'
        : 'No PATCH sent. Set SKYSLOPE_APPLY_RENAMES=1 to write.',
    })
  )

  let ok = 0
  let fail = 0
  await mapPool(tasks, CONCURRENCY, async (t) => {
    const line = {
      folderKind: t.f.kind,
      folderGuid: t.f.guid,
      address: t.f.propertyLine,
      documentId: t.d.id,
      from: t.current,
      to: t.suggested,
      category: t.kind,
    }
    if (!APPLY) {
      console.log(JSON.stringify({ action: 'would_rename', ...line }))
      return
    }
    const res = await patchDocumentFileName(session, t.f.kind, t.f.guid, t.d.id, t.suggested)
    if (res.ok) {
      ok++
      console.log(JSON.stringify({ action: 'renamed', ...line, httpStatus: res.status }))
    } else {
      fail++
      console.log(
        JSON.stringify({
          action: 'rename_failed',
          ...line,
          httpStatus: res.status,
          error: res.body,
        })
      )
    }
  })

  if (APPLY) {
    console.error(JSON.stringify({ summary: { renamed: ok, failed: fail } }))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
