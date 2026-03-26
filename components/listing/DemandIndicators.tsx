'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

type Props = {
  listingKey?: string
  viewCount: number
  saveCount: number
  likeCount: number
  daysOnMarket: number | null
}

export default function DemandIndicators({ listingKey, viewCount, saveCount, likeCount, daysOnMarket }: Props) {
  const [counts, setCounts] = useState({ viewCount, saveCount, likeCount })

  useEffect(() => {
    setCounts({ viewCount, saveCount, likeCount })
  }, [viewCount, saveCount, likeCount])

  useEffect(() => {
    if (!listingKey) return
    let mounted = true
    const supabase = createSupabaseClient()
    const channel = supabase
      .channel(`engagement-demand-${listingKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engagement_metrics', filter: `listing_key=eq.${listingKey}` },
        (payload: { new?: unknown; old?: unknown }) => {
          const row = (payload.new ?? payload.old ?? {}) as {
            view_count?: number
            like_count?: number
            save_count?: number
          }
          if (!mounted) return
          setCounts({
            viewCount: Math.max(0, Number(row.view_count ?? 0)),
            saveCount: Math.max(0, Number(row.save_count ?? 0)),
            likeCount: Math.max(0, Number(row.like_count ?? 0)),
          })
        }
      )
      .subscribe()
    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [listingKey])

  const activityScore = Math.max(0, counts.viewCount) + Math.max(0, counts.saveCount) * 3 + Math.max(0, counts.likeCount) * 2
  const demandLabel =
    activityScore >= 120 ? 'Very high demand' : activityScore >= 50 ? 'High demand' : activityScore >= 20 ? 'Moderate demand' : 'Early demand'

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Demand indicators</h2>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Views" value={counts.viewCount.toLocaleString()} />
          <Metric label="Saves" value={counts.saveCount.toLocaleString()} />
          <Metric label="Likes" value={counts.likeCount.toLocaleString()} />
          <Metric label="Days on market" value={daysOnMarket == null ? '—' : String(daysOnMarket)} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{demandLabel}</p>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}
