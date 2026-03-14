'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-foreground">Admin error</h2>
      <p className="mt-2 text-sm text-muted-foreground">Something went wrong in the admin.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        Try again
      </button>
    </div>
  )
}
