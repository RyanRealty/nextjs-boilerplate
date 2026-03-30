'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'ryan-realty-recent-searches'
const MAX_RECENT = 8

export type RecentSearch = {
  label: string
  url: string
  timestamp: number
}

/**
 * Get recent searches from localStorage.
 */
export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentSearch[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

/**
 * Save a search to recent searches in localStorage.
 */
export function saveRecentSearch(search: Omit<RecentSearch, 'timestamp'>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentSearches()
    // Remove duplicate
    const filtered = existing.filter(s => s.url !== search.url)
    const updated = [{ ...search, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage not available
  }
}

/**
 * Clear all recent searches.
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

type Props = {
  /** Show when search input is focused and empty */
  visible?: boolean
  className?: string
}

/**
 * RecentSearches — dropdown showing user's recent search queries.
 *
 * Stored in localStorage (works for both anonymous and signed-in users).
 * Clicking a recent search restores the exact URL with filters.
 */
export default function RecentSearches({ visible = true, className }: Props) {
  const router = useRouter()
  const [searches, setSearches] = useState<RecentSearch[]>([])

  useEffect(() => {
    setSearches(getRecentSearches())
  }, [])

  if (!visible || searches.length === 0) return null

  return (
    <div className={cn('rounded-lg border border-border bg-card p-2 shadow-md', className)}>
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground">Recent Searches</p>
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            clearRecentSearches()
            setSearches([])
          }}
        >
          Clear
        </Button>
      </div>
      <div className="mt-1 space-y-0.5">
        {searches.map((search, i) => (
          <Button
            key={i}
            type="button"
            variant="ghost"
            className="w-full justify-start px-2 py-1.5 text-sm text-foreground hover:bg-muted"
            onClick={() => router.push(search.url)}
          >
            <span className="truncate">{search.label}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatTimeAgo(search.timestamp)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
