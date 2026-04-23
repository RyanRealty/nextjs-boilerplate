/**
 * Shutterstock image search (preview metadata only).
 * Env: SHUTTERSTOCK_API_KEY, SHUTTERSTOCK_API_SECRET — https://www.shutterstock.com/developers
 * Each production use still requires a license via Shutterstock’s licensing API / account workflow.
 */

export type ShutterstockSearchHit = {
  id: string
  description: string | null
  previewUrl: string | null
  thumbUrl: string | null
  aspect: number | null
}

function basicAuthHeader(): string | null {
  const key = process.env.SHUTTERSTOCK_API_KEY?.trim()
  const secret = process.env.SHUTTERSTOCK_API_SECRET?.trim()
  if (!key || !secret) return null
  const token = Buffer.from(`${key}:${secret}`, 'utf8').toString('base64')
  return `Basic ${token}`
}

export async function searchShutterstockImages(
  query: string,
  opts?: { perPage?: number; page?: number }
): Promise<{ ok: true; data: ShutterstockSearchHit[] } | { ok: false; error: string; status?: number }> {
  const q = (query || '').trim()
  if (!q) return { ok: false, error: 'Missing query' }

  const auth = basicAuthHeader()
  if (!auth) {
    return { ok: false, error: 'SHUTTERSTOCK_API_KEY and SHUTTERSTOCK_API_SECRET must be set' }
  }

  const perPage = Math.min(50, Math.max(1, opts?.perPage ?? 10))
  const page = Math.max(1, opts?.page ?? 1)

  const url = new URL('https://api.shutterstock.com/v2/images/search')
  url.searchParams.set('query', q)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('page', String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: auth },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        error: text.slice(0, 200) || res.statusText || 'Shutterstock request failed',
      }
    }
    const json = (await res.json()) as {
      data?: Array<{
        id?: string
        description?: string
        aspect?: number
        assets?: {
          preview?: { url?: string }
          small_thumb?: { url?: string }
          huge_thumb?: { url?: string }
        }
      }>
    }
    const data: ShutterstockSearchHit[] = (json.data ?? []).map((row) => ({
      id: String(row.id ?? ''),
      description: row.description ?? null,
      previewUrl: row.assets?.preview?.url ?? null,
      thumbUrl: row.assets?.small_thumb?.url ?? row.assets?.huge_thumb?.url ?? row.assets?.preview?.url ?? null,
      aspect: typeof row.aspect === 'number' ? row.aspect : null,
    }))
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
