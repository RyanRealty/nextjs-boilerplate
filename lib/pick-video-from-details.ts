/**
 * Extract a playable tour or video URL from Spark/RESO `details` JSONB.
 * Keep in sync with sync pipeline and `getListingsWithVideos`.
 */
export type VideoTourSource = 'virtual_tour' | 'listing_video'

export function pickFirstVideoFromDetails(details: unknown): { url: string; source: VideoTourSource } | null {
  if (!details || typeof details !== 'object') return null
  const d = details as Record<string, unknown>

  const videos = d.Videos
  if (Array.isArray(videos)) {
    for (const video of videos) {
      if (!video || typeof video !== 'object') continue
      const v = video as Record<string, unknown>
      const uri = String(v.Uri ?? v.URL ?? v.Url ?? '').trim()
      if (uri) return { url: uri, source: 'listing_video' }
      const objectHtml = String(v.ObjectHtml ?? '').trim()
      if (objectHtml.length > 20) return { url: objectHtml, source: 'listing_video' }
    }
  }

  const virtualTours = d.VirtualTours
  if (Array.isArray(virtualTours)) {
    for (const tour of virtualTours) {
      if (!tour || typeof tour !== 'object') continue
      const t = tour as Record<string, unknown>
      const uri = String(t.Uri ?? t.URL ?? t.Url ?? '').trim()
      if (uri) return { url: uri, source: 'virtual_tour' }
    }
  }

  const fallbackTour = String(d.VirtualTourURLUnbranded ?? d.VirtualTourURL ?? '').trim()
  if (fallbackTour) return { url: fallbackTour, source: 'virtual_tour' }

  return null
}

/** For client components: same rules as server video picker + optional `has_virtual_tour` column. */
export function listingRowShowsVideoTile(
  row: { details?: unknown; has_virtual_tour?: boolean | null }
): boolean {
  if (row.has_virtual_tour === true) return true
  return pickFirstVideoFromDetails(row.details) != null
}
