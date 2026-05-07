import { Composition } from 'remotion'
import { MarketReport, MarketReportInput, computeDurationFrames } from './MarketReport'
import { FPS, HEIGHT, WIDTH } from './brand'

// Default props match the monthly-first 9-stat structure:
// 9 unique stats (no label-only duplicate beats) + intro + outro = 11 beatDurations.
const defaultStats: MarketReportInput = {
  city: 'Bend',
  period: '2026',
  subhead: 'April 2026 Monthly Market Report',
  citySlug: 'bend',
  voPath: '',
  captionWords: [],
  beatDurations: [4.0, 5.2, 5.6, 4.9, 4.9, 4.8, 5.2, 5.2, 4.8, 4.8, 6.0],
  stats: [
    { label: 'Median Sale Price', value: '$699K', layout: 'hero', bgVariant: 'navy', changeText: '7.3% vs 2025', changeDir: 'down', context: 'April closed homes: 190' },
    { label: 'Months of Supply', value: '', layout: 'gauge', bgVariant: 'navy-rich', gaugeValue: 5.8, gaugeMin: 0, gaugeMax: 12, verdict: 'balanced', verdictText: 'BALANCED MARKET', context: 'Buyers have options but the market is not soft.' },
    { label: 'Days on Market', value: '46', unit: 'days', layout: 'compare', bgVariant: 'gold-tint', changeText: '13.0% faster YoY', changeDir: 'up', context: 'Thirteen days faster than last year.' },
    { label: 'Sale-to-List Ratio', value: '98.5', unit: '%', layout: 'bar', bgVariant: 'cream', barPct: 0.925, context: 'Negotiation is limited. Pricing has been firm.' },
    { label: 'Active Listings', value: '1,149', layout: 'compare', bgVariant: 'navy', changeText: '415 pending', changeDir: 'flat', context: '415 pending · 360 new last 30 days' },
    { label: 'DOM Distribution', value: '46d', layout: 'histogram', bgVariant: 'navy-rich', bins: [{ label: '0-7', count: 18, pct: 9.5 }, { label: '8-14', count: 28, pct: 14.7 }, { label: '15-30', count: 44, pct: 23.2 }, { label: '31-60', count: 54, pct: 28.4 }, { label: '61+', count: 46, pct: 24.2 }], annotations: ['47% went pending in 30 days', '53% took longer than 30 days'] },
    { label: 'Price Band Mix', value: '$699K', layout: 'price_band', bgVariant: 'cream', bands: [{ label: '<$400K', count: 24, pct: 12.6 }, { label: '$400K-$600K', count: 58, pct: 30.5 }, { label: '$600K-$800K', count: 54, pct: 28.4 }, { label: '$800K-$1.0M', count: 32, pct: 16.8 }, { label: '$1.0M+', count: 22, pct: 11.6 }] },
    { label: 'What This Means', value: '', layout: 'takeaway', bgVariant: 'navy-radial', buyer: ['Buyers can negotiate with 5.8 months of supply', 'Focus on listings with longer DOM for leverage'], seller: ['Price to the latest comps for April 2026', 'Presentation quality still moves days on market'] },
  ],
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketReport"
        component={MarketReport}
        durationInFrames={computeDurationFrames(defaultStats)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultStats}
        calculateMetadata={({ props }) => ({
          durationInFrames: computeDurationFrames(props),
        })}
      />
    </>
  )
}
