import type { SparkListingHistoryItem } from '@/lib/spark'

type ListingContext = {
  listingKey: string
  photoUrl?: string | null
  details?: unknown
  listAgentName?: string | null
  listAgentFirstName?: string | null
  listAgentLastName?: string | null
  listOfficeName?: string | null
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    return raw.length === 5 ? `${raw}:00` : raw
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (!match) return null

  const hour12 = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3].toLowerCase()
  if (!Number.isFinite(hour12) || !Number.isFinite(minute) || hour12 < 1 || hour12 > 12) return null
  let hour24 = hour12 % 12
  if (meridiem === 'pm') hour24 += 12
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

type HistoryTables = {
  statusRows: Array<{ old_status: string | null; new_status: string | null; changed_at: string }>
  priceRows: Array<{ old_price: number | null; new_price: number | null; change_pct: number | null; changed_at: string }>
}

function buildHistoryTables(items: SparkListingHistoryItem[]): HistoryTables {
  const statusRows: HistoryTables['statusRows'] = []
  const priceRows: HistoryTables['priceRows'] = []

  for (const item of items) {
    const changedAt = toIsoDate(item.ModificationTimestamp ?? item.Date) ?? new Date().toISOString()
    const field = String(item.Field ?? '').toLowerCase()
    const oldValue = item.PreviousValue
    const newValue = item.NewValue

    if (field.includes('status')) {
      const oldStatus = oldValue == null ? null : String(oldValue)
      const newStatus = newValue == null ? null : String(newValue)
      if (oldStatus || newStatus) {
        statusRows.push({ old_status: oldStatus, new_status: newStatus, changed_at: changedAt })
      }
    }

    const explicitPriceField = field.includes('price')
    const oldPriceFromField = parseNumber(oldValue)
    const newPriceFromField = parseNumber(newValue)
    const priceAtEvent = parseNumber(item.PriceAtEvent ?? item.Price)
    const priceChange = parseNumber(item.PriceChange)

    let oldPrice: number | null = null
    let newPrice: number | null = null

    if (explicitPriceField && (oldPriceFromField != null || newPriceFromField != null)) {
      oldPrice = oldPriceFromField
      newPrice = newPriceFromField
    } else if (priceAtEvent != null && priceChange != null) {
      newPrice = priceAtEvent
      oldPrice = priceAtEvent - priceChange
    } else if (priceAtEvent != null) {
      newPrice = priceAtEvent
    }

    if (oldPrice != null || newPrice != null || priceChange != null) {
      const changePct =
        oldPrice != null && newPrice != null && oldPrice !== 0
          ? Math.round((((newPrice - oldPrice) / oldPrice) * 100) * 100) / 100
          : null
      priceRows.push({
        old_price: oldPrice,
        new_price: newPrice,
        change_pct: changePct,
        changed_at: changedAt,
      })
    }
  }

  return { statusRows, priceRows }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncAuxiliaryTablesForFinalization(supabase: any, context: ListingContext, historyItems: SparkListingHistoryItem[]) {
  const listingKey = context.listingKey
  if (!listingKey) return { ok: false as const, error: 'Missing listing key' }

  const details = context.details && typeof context.details === 'object'
    ? (context.details as Record<string, unknown>)
    : {}
  const photosRaw = Array.isArray(details.Photos) ? details.Photos : []
  const videosRaw = Array.isArray(details.Videos) ? details.Videos : []
  const openHousesRaw = Array.isArray(details.OpenHouses) ? details.OpenHouses : []

  const photos = photosRaw
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const url =
        (typeof row.Uri1600 === 'string' && row.Uri1600) ||
        (typeof row.Uri1280 === 'string' && row.Uri1280) ||
        (typeof row.Uri1024 === 'string' && row.Uri1024) ||
        (typeof row.Uri800 === 'string' && row.Uri800) ||
        (typeof row.Uri640 === 'string' && row.Uri640) ||
        (typeof row.Uri300 === 'string' && row.Uri300) ||
        ''
      if (!url.trim()) return null
      return {
        listing_key: listingKey,
        photo_url: url.trim(),
        sort_order: Number.isFinite(Number(row.Order)) ? Number(row.Order) : index,
        is_hero: row.Primary === true || index === 0,
        source: 'spark',
      }
    })
    .filter((row) => row != null)

  if (photos.length === 0 && context.photoUrl?.trim()) {
    photos.push({
      listing_key: listingKey,
      photo_url: context.photoUrl.trim(),
      sort_order: 0,
      is_hero: true,
      source: 'spark',
    })
  }

  const videos = videosRaw
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const url =
        (typeof row.Uri === 'string' && row.Uri) ||
        (typeof row.URL === 'string' && row.URL) ||
        (typeof row.Url === 'string' && row.Url) ||
        ''
      if (!url.trim()) return null
      return {
        listing_key: listingKey,
        video_url: url.trim(),
        sort_order: Number.isFinite(Number(row.Order)) ? Number(row.Order) : index,
        source: 'spark',
      }
    })
    .filter((row) => row != null)

  const openHouses = openHousesRaw
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const dateIso = toIsoDate(row.Date)
      if (!dateIso) return null
      const eventDate = dateIso.slice(0, 10)
      const startTime = normalizeTime(row.StartTime)
      const endTime = normalizeTime(row.EndTime)
      const key = `${listingKey}:${eventDate}:${startTime ?? 'na'}:${index}`
      return {
        listing_key: listingKey,
        open_house_key: key,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        host_agent_name: typeof row.AgentName === 'string' ? row.AgentName : null,
        remarks: typeof row.Remarks === 'string' ? row.Remarks : null,
      }
    })
    .filter((row) => row != null)

  const listAgentName = context.listAgentName?.trim()
    || [context.listAgentFirstName, context.listAgentLastName].filter(Boolean).join(' ').trim()
  const agents = listAgentName
    ? [{
        listing_key: listingKey,
        agent_role: 'list',
        agent_name: listAgentName,
        agent_first_name: context.listAgentFirstName ?? null,
        agent_last_name: context.listAgentLastName ?? null,
        office_name: context.listOfficeName ?? null,
      }]
    : []

  const { statusRows, priceRows } = buildHistoryTables(historyItems)

  try {
    const photosDelete = await supabase.from('listing_photos').delete().eq('listing_key', listingKey)
    if (photosDelete.error) return { ok: false as const, error: photosDelete.error.message }
    if (photos.length > 0) {
      const photosInsert = await supabase.from('listing_photos').insert(photos)
      if (photosInsert.error) return { ok: false as const, error: photosInsert.error.message }
    }

    const videosDelete = await supabase.from('listing_videos').delete().eq('listing_key', listingKey)
    if (videosDelete.error) return { ok: false as const, error: videosDelete.error.message }
    if (videos.length > 0) {
      const videosInsert = await supabase.from('listing_videos').insert(videos)
      if (videosInsert.error) return { ok: false as const, error: videosInsert.error.message }
    }

    const agentsDelete = await supabase.from('listing_agents').delete().eq('listing_key', listingKey)
    if (agentsDelete.error) return { ok: false as const, error: agentsDelete.error.message }
    if (agents.length > 0) {
      const agentsInsert = await supabase.from('listing_agents').insert(agents)
      if (agentsInsert.error) return { ok: false as const, error: agentsInsert.error.message }
    }

    const openHousesDelete = await supabase.from('open_houses').delete().eq('listing_key', listingKey)
    if (openHousesDelete.error) return { ok: false as const, error: openHousesDelete.error.message }
    if (openHouses.length > 0) {
      const openHousesInsert = await supabase.from('open_houses').insert(openHouses)
      if (openHousesInsert.error) return { ok: false as const, error: openHousesInsert.error.message }
    }

    const statusDelete = await supabase.from('status_history').delete().eq('listing_key', listingKey)
    if (statusDelete.error) return { ok: false as const, error: statusDelete.error.message }
    if (statusRows.length > 0) {
      const statusInsert = await supabase.from('status_history').insert(
        statusRows.map((row) => ({ listing_key: listingKey, ...row }))
      )
      if (statusInsert.error) return { ok: false as const, error: statusInsert.error.message }
    }

    const priceDelete = await supabase.from('price_history').delete().eq('listing_key', listingKey)
    if (priceDelete.error) return { ok: false as const, error: priceDelete.error.message }
    if (priceRows.length > 0) {
      const priceInsert = await supabase.from('price_history').insert(
        priceRows.map((row) => ({ listing_key: listingKey, ...row }))
      )
      if (priceInsert.error) return { ok: false as const, error: priceInsert.error.message }
    }

    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
