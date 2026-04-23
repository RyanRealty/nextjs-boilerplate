'use client'

import { useCallback, useEffect, useState } from 'react'

type UnsplashRow = {
  id: string | null
  url: string
  thumbUrl: string
  attribution: string
  sourceUrl?: string
}

type ShutterRow = {
  id: string
  description: string | null
  previewUrl: string | null
  thumbUrl: string | null
}

const DEFAULT_QUERY = 'Three Sisters Oregon Cascade'

export default function StockPhotosPicker() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [loading, setLoading] = useState(false)
  const [unsplash, setUnsplash] = useState<UnsplashRow[]>([])
  const [shutter, setShutter] = useState<ShutterRow[]>([])
  const [errU, setErrU] = useState<string | null>(null)
  const [errS, setErrS] = useState<string | null>(null)

  const searchWithQuery = useCallback(async (raw: string) => {
    setLoading(true)
    setErrU(null)
    setErrS(null)
    const q = encodeURIComponent(raw.trim() || DEFAULT_QUERY)
    try {
      const [uRes, sRes] = await Promise.all([
        fetch(`/api/admin/stock/unsplash/search?query=${q}&count=10`, { credentials: 'include' }),
        fetch(`/api/admin/stock/shutterstock/search?query=${q}&per_page=12`, { credentials: 'include' }),
      ])
      const uJson = (await uRes.json().catch(() => ({}))) as {
        error?: string
        data?: UnsplashRow[]
      }
      const sJson = (await sRes.json().catch(() => ({}))) as {
        error?: string
        data?: ShutterRow[]
      }
      if (!uRes.ok) setErrU(uJson.error ?? `Unsplash HTTP ${uRes.status}`)
      else setUnsplash(uJson.data ?? [])
      if (!sRes.ok) setErrS(sJson.error ?? `Shutterstock HTTP ${sRes.status}`)
      else setShutter(sJson.data ?? [])
    } catch (e) {
      setErrU(e instanceof Error ? e.message : String(e))
      setErrS(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void searchWithQuery(DEFAULT_QUERY)
  }, [searchWithQuery])

  const runSearch = () => void searchWithQuery(query)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock photos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live previews from your env keys (<code className="rounded bg-muted px-1">UNSPLASH_ACCESS_KEY</code>,{' '}
          <code className="rounded bg-muted px-1">SHUTTERSTOCK_*</code>). Shutterstock still needs a separate license per
          image before publish. Tell me pick codes like <strong>U3</strong> (Unsplash row) or <strong>S-123456</strong>{' '}
          (Shutterstock id).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm font-medium text-foreground">
          Search query
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Sunriver Oregon mountain"
          />
        </label>
        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Search'}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Unsplash</h2>
        {errU && <p className="text-sm text-destructive">{errU}</p>}
        {!errU && unsplash.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Click Search to load (or fix Unsplash key).</p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unsplash.map((row, i) => (
            <li
              key={`${row.url}-${i}`}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <div className="bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">U{i + 1}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.thumbUrl || row.url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
              <div className="space-y-1 p-2 text-xs text-muted-foreground">
                {row.id && (
                  <p>
                    <span className="font-medium text-foreground">id</span> {row.id}
                  </p>
                )}
                <p>{row.attribution}</p>
                {row.sourceUrl && (
                  <a href={row.sourceUrl} className="text-primary underline" target="_blank" rel="noopener noreferrer">
                    Profile ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Shutterstock</h2>
        {errS && <p className="text-sm text-destructive">{errS}</p>}
        {!errS && shutter.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Click Search to load (or fix Shutterstock keys).</p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shutter.map((row) => (
            <li key={row.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">S-{row.id}</div>
              {row.previewUrl || row.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.previewUrl || row.thumbUrl || ''}
                  alt={row.description ?? ''}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted text-xs">No preview</div>
              )}
              <p className="line-clamp-3 p-2 text-xs text-muted-foreground">{row.description ?? '—'}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
