import { Composition } from 'remotion'
import { YouTubeMarketReport, YouTubeMarketReportInput, computeTotalFrames } from './YouTubeMarketReport'
import { FPS, WIDTH, HEIGHT } from './brand'

// Default props for Remotion Studio preview — Bend April 2026.
// Real renders come from scripts/build-youtube-long.mjs → props.json.
const defaultInput: YouTubeMarketReportInput = {
  city: 'Bend',
  period: '2026-04',
  subhead: 'Single-Family Market · April 2026 · Deschutes County',
  eyebrow: 'Ryan Realty Market Report',
  citySlug: 'bend',
  marketHealthLabel: 'BALANCED MARKET',
  medianPriceDisplay: '$699K',
  voPath: '',
  captionWords: [],
  chapterDurations: [45, 75, 75, 60, 75, 60, 75, 75, 90, 45],
  imageCount: 15,
  chapters: [
    // Ch 2 — Median Sale Price (line_chart)
    {
      label: 'Median Sale Price',
      value: '$699K',
      layout: 'line_chart',
      bgVariant: 'navy',
      context: '+18% appreciation over 4 years',
      series: [
        { month: '2023', value: 715000, color: '#5BA8D4', yearLabel: '2023' },
        { month: '2024', value: 749000, color: '#7BC5A8', yearLabel: '2024' },
        { month: '2025', value: 754000, color: '#C8A864', yearLabel: '2025' },
        { month: '2026', value: 699000, color: '#D4AF37', yearLabel: '2026' },
      ],
    },
    // Ch 3 — Price Segments (histogram)
    {
      label: 'Price Segments',
      value: '190',
      layout: 'histogram',
      bgVariant: 'navy-rich',
      bins: [
        { label: '<$400K', count: 24, pct: 12.6 },
        { label: '$400-600K', count: 58, pct: 30.5 },
        { label: '$600-800K', count: 54, pct: 28.4 },
        { label: '$800K-1M', count: 32, pct: 16.8 },
        { label: '$1M+', count: 22, pct: 11.6 },
      ],
      annotations: ['Middle-market drove volume', '$400K-$800K = 59% of sales'],
      context: '190 closed sales by price band — April 2026',
    },
    // Ch 4 — Months of Supply (gauge)
    {
      label: 'Months of Supply',
      value: '5.8',
      layout: 'gauge',
      bgVariant: 'navy',
      gaugeValue: 5.8,
      gaugeMin: 0,
      gaugeMax: 10,
      verdict: 'balanced',
      verdictText: 'BALANCED MARKET',
      context: 'Buyers have options without pushing the market soft.',
    },
    // Ch 5 — Days on Market (histogram)
    {
      label: 'Days on Market',
      value: '46',
      layout: 'histogram',
      bgVariant: 'gold-tint',
      bins: [
        { label: '0-7d', count: 18, pct: 9.5 },
        { label: '8-14d', count: 28, pct: 14.7 },
        { label: '15-30d', count: 44, pct: 23.2 },
        { label: '31-60d', count: 54, pct: 28.4 },
        { label: '61-90d', count: 28, pct: 14.7 },
        { label: '90d+', count: 18, pct: 9.5 },
      ],
      annotations: ['Median: 46 days', '47% closed in under 30 days'],
      context: 'Speed distribution — April 2026 SFR Bend',
    },
    // Ch 6 — Sale-to-List + Concessions (bar)
    {
      label: 'Sale-to-List Ratio',
      value: '97.1',
      unit: '%',
      layout: 'bar',
      bgVariant: 'cream',
      barPct: 0.855,
      context: 'Limited negotiation room — sellers holding firm on price.',
    },
    // Ch 7 — Cash Buyers (donut)
    {
      label: 'Cash Purchases',
      value: '28%',
      layout: 'donut',
      bgVariant: 'navy-rich',
      donutPct: 28,
      donutLabel: 'CASH',
      context: 'One in four buyers paid cash. The high end is transacting without financing pressure.',
    },
    // Ch 8 — Top Neighborhoods (leaderboard)
    {
      label: 'Top Neighborhoods',
      value: '',
      layout: 'leaderboard',
      bgVariant: 'navy',
      rows: [
        { name: 'Tetherow', median: '$1.24M', dom: '38', yoy: '+4.2%', highlight: true },
        { name: 'NorthWest Crossing', median: '$875K', dom: '42', yoy: '-2.1%' },
        { name: 'River West', median: '$749K', dom: '51', yoy: '+1.8%' },
        { name: 'Skyline Ranch', median: '$699K', dom: '46', yoy: '-5.3%' },
        { name: 'Old Bend', median: '$659K', dom: '34', yoy: '+3.1%' },
      ],
      context: 'Top 5 subdivisions by closed volume — April 2026',
    },
    // Ch 9 — Agent Commentary (takeaway)
    {
      label: 'What This Means',
      value: '',
      layout: 'takeaway',
      bgVariant: 'navy-radial',
      buyer: [
        'Supply at 5.8 months gives you negotiating room — use it',
        'Focus on listings with 45+ DOM for the biggest leverage',
        'Rate lock now — inventory is climbing, not crashing',
      ],
      seller: [
        'Price to April comps, not February hope',
        'Days are stretching — presentation quality moves listings',
        'Concessions are the new price reduction — offer credits early',
      ],
    },
  ],
}

export const RemotionRoot: React.FC = () => (
  <Composition
    id="YouTubeMarketReport"
    component={YouTubeMarketReport}
    durationInFrames={computeTotalFrames(defaultInput)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={defaultInput}
    calculateMetadata={({ props }) => ({
      durationInFrames: computeTotalFrames(props),
    })}
  />
)
