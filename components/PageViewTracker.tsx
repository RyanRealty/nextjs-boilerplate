'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { hasMarketingConsent } from './CookieConsentBanner'

/**
 * Fires Meta Pixel PageView on pathname change (not on initial load, since MetaPixel.tsx already fires once).
 * Guards against firing twice on mount.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialLoadRef = useRef(true)

  useEffect(() => {
    // Skip initial load (MetaPixel already fired PageView once)
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    // Check consent
    if (!hasMarketingConsent()) return

    // Fire fbq
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        window.fbq('track', 'PageView')
      } catch (err) {
        console.warn('[PageViewTracker] fbq failed:', err)
      }
    }
  }, [pathname, searchParams])

  return null
}
