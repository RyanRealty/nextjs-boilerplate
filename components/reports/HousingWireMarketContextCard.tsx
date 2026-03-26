'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HousingWireMarketContext } from '@/lib/housingwire-types'

type Props = {
  data: HousingWireMarketContext | null
  error?: string | null
  /** When true, show a short message that HousingWire can be configured for national context. */
  showConfigHint?: boolean
}

export default function HousingWireMarketContextCard({ data, error, showConfigHint }: Props) {
  if (error) {
    return (
      <Card className="border-border bg-card shadow-sm" aria-labelledby="housingwire-heading">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
          <CardTitle id="housingwire-heading" className="text-base font-semibold text-foreground">
            National market context
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    if (!showConfigHint) return null
    return (
      <Card className="border-border border-dashed bg-muted/20 shadow-sm" aria-labelledby="housingwire-heading">
        <CardHeader className="pb-2">
          <CardTitle id="housingwire-heading" className="text-base font-semibold text-foreground">
            National market context
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Add <code className="rounded bg-muted px-1 text-xs">HOUSINGWIRE_API_KEY</code> and{' '}
            <code className="rounded bg-muted px-1 text-xs">HOUSINGWIRE_API_BASE_URL</code> to see U.S. inventory, mortgage rates, and Treasury yields alongside your local data (HousingWire Data / Altos Research).
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasAny =
    data.nationalInventory != null ||
    data.mortgageRate30Yr != null ||
    data.treasury10Y != null ||
    data.nationalMedianListPrice != null

  if (!hasAny) return null

  return (
    <Card className="border-border bg-card shadow-sm" aria-labelledby="housingwire-heading">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
        <CardTitle id="housingwire-heading" className="text-base font-semibold text-foreground">
          National market context
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.sourceLabel ?? 'HousingWire Data'} · as of {data.asOf}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.nationalInventory != null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">U.S. inventory</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {Number(data.nationalInventory).toLocaleString('en-US')}
              </p>
              <p className="text-xs text-muted-foreground">Single-family on market</p>
            </div>
          )}
          {data.mortgageRate30Yr != null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">30-yr fixed rate</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {Number(data.mortgageRate30Yr).toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">Conforming</p>
            </div>
          )}
          {data.treasury10Y != null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">10Y Treasury</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {Number(data.treasury10Y).toFixed(2)}%
              </p>
            </div>
          )}
          {data.nationalMedianListPrice != null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Median list price (U.S.)</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                ${Number(data.nationalMedianListPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
