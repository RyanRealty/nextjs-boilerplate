#!/usr/bin/env node
/**
 * Ryan Realty — AgentFire WordPress REST API client.
 *
 * Auth: WordPress Application Passwords (Basic auth, base64-encoded).
 * Required env vars in .env.local:
 *   WP_AGENTFIRE_USER        — WordPress username (not email)
 *   WP_AGENTFIRE_APP_PASSWORD — Application Password from WP Admin → Users → Profile
 *   WP_AGENTFIRE_SITE_URL    — defaults to https://ryan-realty.com
 *
 * If credentials are missing, every exported function halts with a clear
 * setup message so the developer knows exactly what to do.
 *
 * Exports:
 *   createDraft({ title, content, excerpt, slug, categories, tags,
 *                 featured_media, meta })
 *   publishDraft(postId)
 *   uploadMedia(filePath, { title, alt_text, caption })
 *   getCategoryId(slug)
 *   getTagId(name)
 *   pingSitemap()
 */

import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function getSiteUrl() {
  return (process.env.WP_AGENTFIRE_SITE_URL || 'https://ryan-realty.com').replace(/\/+$/, '')
}

function getCredentials() {
  const user = process.env.WP_AGENTFIRE_USER
  const pass = process.env.WP_AGENTFIRE_APP_PASSWORD
  if (!user || !pass) {
    const msg = [
      '',
      'AgentFire WordPress credentials not configured.',
      'Generate at WP Admin → Users → Profile → Application Passwords.',
      'Add WP_AGENTFIRE_USER and WP_AGENTFIRE_APP_PASSWORD to .env.local.',
      '',
      '  WP_AGENTFIRE_USER=your-wp-username',
      '  WP_AGENTFIRE_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx',
      '  WP_AGENTFIRE_SITE_URL=https://ryan-realty.com  (optional, this is the default)',
      '',
    ].join('\n')
    throw new Error(msg)
  }
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return {
    Authorization: `Basic ${token}`,
    'User-Agent': 'RyanRealty-BlogPublisher/1.0',
  }
}

function apiBase() {
  return `${getSiteUrl()}/wp-json/wp/v2`
}

// ---------------------------------------------------------------------------
// Internal fetch helpers
// ---------------------------------------------------------------------------

async function wpFetch(endpoint, options = {}) {
  const creds = getCredentials()
  const url = endpoint.startsWith('http') ? endpoint : `${apiBase()}${endpoint}`

  const headers = {
    ...creds,
    ...(options.headers || {}),
  }

  // Default to JSON content-type unless caller overrides (media upload uses multipart).
  if (!headers['Content-Type'] && options.method !== 'POST_BINARY') {
    headers['Content-Type'] = 'application/json'
  }

  const init = {
    method: options.method || 'GET',
    headers,
  }
  if (options.body !== undefined) init.body = options.body

  const res = await fetch(url, init)

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch {}
    throw new Error(`WP API ${options.method || 'GET'} ${url} → ${res.status} ${res.statusText}: ${detail.slice(0, 400)}`)
  }

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/**
 * Create a DRAFT post in WordPress.
 *
 * @param {object} opts
 * @param {string}   opts.title          — Post title (plain text)
 * @param {string}   opts.content        — Post body HTML
 * @param {string}   [opts.excerpt]      — Meta description / excerpt
 * @param {string}   [opts.slug]         — URL slug (e.g. "bend-2026-04")
 * @param {number[]} [opts.categories]   — WP category IDs
 * @param {number[]} [opts.tags]         — WP tag IDs
 * @param {number}   [opts.featured_media] — WP media attachment ID
 * @param {object}   [opts.meta]         — Arbitrary post meta (Yoast / Rank Math etc.)
 * @returns {{ id: number, link: string, preview_url: string }}
 */
export async function createDraft({ title, content, excerpt, slug, categories, tags, featured_media, meta }) {
  const payload = {
    title,
    content,
    status: 'draft',
    ...(excerpt && { excerpt }),
    ...(slug && { slug }),
    ...(categories?.length && { categories }),
    ...(tags?.length && { tags }),
    ...(featured_media && { featured_media }),
    ...(meta && { meta }),
  }

  const post = await wpFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    id: post.id,
    link: post.link,
    preview_url: `${getSiteUrl()}/?p=${post.id}&preview=true`,
  }
}

/**
 * Flip a draft post to published.
 *
 * @param {number} postId
 * @returns {object} Updated post object
 */
export async function publishDraft(postId) {
  return wpFetch(`/posts/${postId}`, {
    method: 'POST',
    body: JSON.stringify({ status: 'publish' }),
    headers: {
      // WP REST API PATCH-equivalent via POST with _method override OR use PUT.
      // Standard WP REST v2 uses POST for partial updates when PATCH isn't available.
      'X-HTTP-Method-Override': 'PATCH',
    },
  })
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * Upload a local file to the WordPress media library, then PATCH its title,
 * alt text, and caption.
 *
 * @param {string} filePath  — Absolute path to the image file
 * @param {object} opts
 * @param {string} [opts.title]    — Media title
 * @param {string} [opts.alt_text] — Alt text (mandatory per skill §3.9)
 * @param {string} [opts.caption]  — Image caption
 * @returns {{ id: number, source_url: string }}
 */
export async function uploadMedia(filePath, { title, alt_text, caption } = {}) {
  const creds = getCredentials()
  const fileBuffer = await readFile(filePath)
  const fileStat = await stat(filePath)
  const filename = basename(filePath)
  const ext = extname(filePath).toLowerCase()

  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }
  const mime = mimeTypes[ext] || 'application/octet-stream'

  const uploadUrl = `${apiBase()}/media`
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...creds,
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(fileStat.size),
    },
    body: fileBuffer,
  })

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => '')
    throw new Error(`WP media upload failed ${uploadRes.status}: ${detail.slice(0, 300)}`)
  }

  const media = await uploadRes.json()

  // PATCH metadata (title, alt_text, caption) in a second call.
  const metaPatch = {}
  if (title)    metaPatch.title    = title
  if (alt_text) metaPatch.alt_text = alt_text
  if (caption)  metaPatch.caption  = caption

  if (Object.keys(metaPatch).length > 0) {
    await wpFetch(`/media/${media.id}`, {
      method: 'POST',
      body: JSON.stringify(metaPatch),
      headers: { 'X-HTTP-Method-Override': 'PATCH' },
    })
  }

  return {
    id: media.id,
    source_url: media.source_url,
  }
}

// ---------------------------------------------------------------------------
// Categories + Tags (get-or-create)
// ---------------------------------------------------------------------------

/**
 * Return the WP category ID for a given slug. Creates the category if it
 * doesn't exist yet.
 *
 * @param {string} slug — e.g. "market-reports"
 * @param {string} [name] — Display name used only when creating. Defaults to
 *                          slug with hyphens replaced by spaces, title-cased.
 * @returns {number} category ID
 */
export async function getCategoryId(slug, name) {
  const res = await wpFetch(`/categories?slug=${encodeURIComponent(slug)}&per_page=1`)
  const rows = Array.isArray(res) ? res : []

  if (rows.length > 0) return rows[0].id

  // Create it
  const displayName = name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const created = await wpFetch('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: displayName, slug }),
  })
  return created.id
}

/**
 * Return the WP tag ID for a given name. Creates the tag if it doesn't exist.
 *
 * @param {string} name — Tag display name (e.g. "bend")
 * @returns {number} tag ID
 */
export async function getTagId(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const res = await wpFetch(`/tags?slug=${encodeURIComponent(slug)}&per_page=1`)
  const rows = Array.isArray(res) ? res : []

  if (rows.length > 0) return rows[0].id

  const created = await wpFetch('/tags', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  })
  return created.id
}

// ---------------------------------------------------------------------------
// Sitemap ping
// ---------------------------------------------------------------------------

/**
 * Best-effort sitemap refresh. Tries Yoast/Rank Math's ping endpoint, then
 * falls back to a HEAD request on the sitemap index so caches warm up.
 * Never throws — the post is already live if this is called.
 */
export async function pingSitemap() {
  const siteUrl = getSiteUrl()
  const creds = getCredentials()

  const attempts = [
    // Rank Math REST endpoint
    `${siteUrl}/wp-json/rankmath/v1/updateSitemapPing`,
    // Generic sitemap index (warm CDN caches + Google ping)
    `${siteUrl}/sitemap_index.xml`,
    `${siteUrl}/sitemap.xml`,
  ]

  for (const url of attempts) {
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: creds,
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        console.log(`  sitemap ping OK → ${url}`)
        return
      }
    } catch {
      // Silently continue to next attempt
    }
  }

  // Non-fatal: the post is live; Google will discover it on next crawl.
  console.warn('  sitemap ping: all attempts failed (non-fatal — Google will crawl on next pass)')
}
