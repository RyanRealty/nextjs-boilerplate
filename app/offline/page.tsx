import Link from 'next/link'

export const metadata = {
  title: 'Offline',
  description: 'You are offline.',
}

export default function OfflinePage() {
  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-[var(--brand-navy)]">You&apos;re offline</h1>
      <p className="mt-4 text-[var(--gray-muted)]">
        This page isn&apos;t available right now. When you&apos;re back online, you can continue browsing.
      </p>
      <p className="mt-6">
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.onLine) {
              window.location.reload()
            }
          }}
          className="rounded bg-[var(--brand-navy)] px-4 py-2 text-white hover:opacity-90"
        >
          Try again
        </button>
      </p>
      <p className="mt-6">
        <Link href="/" className="text-[var(--accent)] underline hover:no-underline">
          Go to homepage
        </Link>
      </p>
    </main>
  )
}
