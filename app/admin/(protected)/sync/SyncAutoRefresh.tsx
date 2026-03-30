'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_INTERVAL_MS = 5000

export default function SyncAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      void (async () => {
        try {
          await fetch('/api/admin/sync/heartbeat', {
            method: 'POST',
            cache: 'no-store',
          })
        } catch {
          // Best-effort heartbeat; page refresh still runs.
        }
        router.refresh()
      })()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [router])

  return null
}

