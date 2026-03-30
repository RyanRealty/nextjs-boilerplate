'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'extreme' | null

export type ClimateRiskData = {
  floodZone?: string | null // e.g., "Zone X", "Zone AE", "Zone A"
  floodRisk?: RiskLevel
  fireRisk?: RiskLevel
  windRisk?: RiskLevel
  heatRisk?: RiskLevel
  droughtRisk?: RiskLevel
}

type Props = {
  risks: ClimateRiskData | null
  className?: string
}

function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'minimal': return 'bg-success/10 text-success border-success/30'
    case 'low': return 'bg-success/10 text-success border-success/30'
    case 'moderate': return 'bg-warning/10 text-warning border-warning/30'
    case 'high': return 'bg-destructive/10 text-destructive border-destructive/30'
    case 'extreme': return 'bg-destructive/20 text-destructive border-destructive/50'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function riskLabel(level: RiskLevel): string {
  if (!level) return 'Unknown'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function RiskItem({ label, level, detail }: { label: string; level: RiskLevel; detail?: string }) {
  if (!level) return null

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <Badge variant="outline" className={cn('shrink-0 text-xs', riskColor(level))}>
        {riskLabel(level)}
      </Badge>
    </div>
  )
}

/**
 * ClimateRisk — displays environmental risk factors for a property.
 *
 * Data sources:
 * - FEMA flood zone maps
 * - Environmental risk APIs (ClimateCheck, First Street Foundation)
 * - Spark listing data (flood zone fields)
 *
 * In Central Oregon:
 * - Fire risk is often moderate-high (wildland-urban interface)
 * - Flood risk is generally low (high desert)
 * - Wind risk is moderate
 * - Heat/drought risk varies by elevation
 */
export default function ClimateRisk({ risks, className }: Props) {
  if (!risks) return null

  const hasAnyRisk = risks.floodRisk || risks.fireRisk || risks.windRisk || risks.heatRisk || risks.droughtRisk || risks.floodZone

  if (!hasAnyRisk) return null

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground">Environmental Risk</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Risk assessment for this property location
        </p>

        <div className="mt-3 divide-y divide-border">
          {risks.floodZone && (
            <div className="flex items-center justify-between gap-2 py-1.5">
              <div>
                <p className="text-sm text-foreground">Flood Zone</p>
                <p className="text-xs text-muted-foreground">FEMA designation</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {risks.floodZone}
              </Badge>
            </div>
          )}
          <RiskItem label="Flood Risk" level={risks.floodRisk ?? null} detail="River and rainfall flooding" />
          <RiskItem label="Fire Risk" level={risks.fireRisk ?? null} detail="Wildfire exposure" />
          <RiskItem label="Wind Risk" level={risks.windRisk ?? null} detail="Severe wind events" />
          <RiskItem label="Heat Risk" level={risks.heatRisk ?? null} detail="Extreme heat days" />
          <RiskItem label="Drought Risk" level={risks.droughtRisk ?? null} detail="Water stress" />
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground">
          Risk data is informational only. Consult local authorities and insurance providers for official assessments.
        </p>
      </CardContent>
    </Card>
  )
}
