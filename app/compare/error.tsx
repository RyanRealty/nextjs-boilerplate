'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">We couldn&apos;t load the comparison page. Please try again.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted"
        >
          Try again
        </button>
        <Link href="/listings" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Browse Listings
        </Link>
      </div>
    </main>
  )
}
