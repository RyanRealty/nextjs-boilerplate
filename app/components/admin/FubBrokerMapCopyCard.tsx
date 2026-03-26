'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  envLine: string
  missingSlugs: string[]
}

export default function FubBrokerMapCopyCard({ envLine, missingSlugs }: Props) {
  const [copied, setCopied] = useState(false)

  const helperText = useMemo(() => {
    if (missingSlugs.length === 0) return 'All brokers are currently mapped.'
    return `Missing mapping for: ${missingSlugs.join(', ')}`
  }, [missingSlugs])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(envLine)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copy Env Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Copy this line into your environment to lock broker assignment by slug.
        </p>
        <Textarea readOnly value={envLine} rows={3} className="font-mono text-xs" />
        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy line'}
          </Button>
          <p className="text-xs text-muted-foreground">{helperText}</p>
        </div>
      </CardContent>
    </Card>
  )
}
