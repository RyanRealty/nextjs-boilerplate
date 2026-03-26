import type { ReportMetrics, ReportPriceBandsResult, ReportMetricsTimeSeriesPoint } from '@/app/actions/reports'

export const BEACON_REPORT_DEFAULT_CITIES = [
  'Bend',
  'Redmond',
  'Sisters',
  'La Pine',
  'Sunriver',
  'Tumalo',
  'Terrebonne',
  'Madras',
  'Prineville',
  'Crooked River Ranch',
] as const

export type BeaconCityMetrics = {
  city: string
  metrics: ReportMetrics
}

export type BeaconReportData = {
  periodStart: string
  periodEnd: string
  metricsByCity: BeaconCityMetrics[]
  priceBandsSample: ReportPriceBandsResult | null
  priceBandsSampleCity: string | null
  timeseriesSample: ReportMetricsTimeSeriesPoint[] | null
  timeseriesSampleCity: string | null
}
