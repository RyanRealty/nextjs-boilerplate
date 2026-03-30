'use client'

import dynamic from 'next/dynamic'

const SearchMapClustered = dynamic(
  () => import('@/components/SearchMapClustered'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"
        style={{ minHeight: '320px' }}
      >
        Loading map…
      </div>
    ),
  }
)

export default SearchMapClustered
