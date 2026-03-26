'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import SyncSmart from './SyncSmart'
import SyncHistoryButtons from './SyncHistoryButtons'
import TriggerDeltaSyncButton from './TriggerDeltaSyncButton'
import SyncSinceDateButton from './SyncSinceDateButton'
import RefreshActivePendingButton from './RefreshActivePendingButton'
import type { SyncStatus } from '@/app/actions/sync-full-cron'

type Props = {
  syncStatus: SyncStatus | null
  runInProgress: boolean
  sparkConfigured: boolean
}

export default function SyncPageAdvanced({
  syncStatus,
  runInProgress,
  sparkConfigured,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-muted/30">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-4 py-3 text-muted-foreground">
          <span className="font-medium">Advanced / override</span>
          <span className="text-xs">{open ? 'Hide' : 'Show'} manual sync controls</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border px-4 pb-4 pt-2 space-y-4">
          <p className="text-xs text-muted-foreground">
            Use only to pause, resume, or run one-off sync chunks. Background sync runs automatically.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SyncSmart initialStatus={syncStatus} sparkConfigured={sparkConfigured} compact />
            <RefreshActivePendingButton runInProgress={runInProgress} syncPhase={syncStatus?.cursor?.phase ?? null} />
          </div>
          <div>
            <TriggerDeltaSyncButton />
          </div>
          <SyncSinceDateButton />
          <SyncHistoryButtons compact />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
