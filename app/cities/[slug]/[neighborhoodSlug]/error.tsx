'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function NeighborhoodError({
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
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-primary">Something went wrong</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          We couldn&apos;t load this neighborhood. Please try again or browse cities.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary hover:bg-accent/90"
          >
            Try again
          </button>
          <Link
            href="/cities"
            className="rounded-lg border border-[var(--border)] bg-white px-6 py-3 font-semibold text-primary hover:bg-[var(--muted)]"
          >
            View all cities
          </Link>
        </div>
      </div>
    </main>
  )
}
