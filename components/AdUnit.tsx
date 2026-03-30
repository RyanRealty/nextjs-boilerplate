'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { hasMarketingConsent } from '@/components/CookieConsentBanner'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

type Props = {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  className?: string
  showLabel?: boolean
}

export default function AdUnit({ slot, format = 'auto', className, showLabel = true }: Props) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? ''
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    const syncConsent = () => setCanRender(hasMarketingConsent())
    syncConsent()
    const onConsent = () => syncConsent()
    window.addEventListener('cookie-consent', onConsent)
    return () => window.removeEventListener('cookie-consent', onConsent)
  }, [])

  const adStyle = useMemo<CSSProperties>(() => {
    if (format === 'rectangle') return { display: 'block', minHeight: 280 }
    if (format === 'horizontal') return { display: 'block', minHeight: 120 }
    if (format === 'vertical') return { display: 'block', minHeight: 320 }
    return { display: 'block' }
  }, [format])

  useEffect(() => {
    if (!clientId || !slot || !canRender) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Ads can fail silently due to blockers or ad inventory.
    }
  }, [clientId, slot, canRender])

  if (!clientId || !slot || !canRender) return null

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {showLabel && <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Sponsored</p>}
        <ins
          className="adsbygoogle"
          style={adStyle}
          data-ad-client={clientId}
          data-ad-slot={slot}
          data-ad-format={format === 'auto' ? 'auto' : undefined}
          data-full-width-responsive="true"
        />
      </CardContent>
    </Card>
  )
}
