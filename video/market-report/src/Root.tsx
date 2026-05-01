import { Composition } from 'remotion'

import { MarketReport, MarketReportInput, computeDurationFrames } from './MarketReport'
import {
  FPS,
  LANDSCAPE_HEIGHT,
  LANDSCAPE_WIDTH,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
} from './brand'
import { OutroCard } from './scenes/OutroCard'
import { TitleCard } from './scenes/TitleCard'
import { SAMPLE_CTA, SAMPLE_MARKET, SAMPLE_TITLE } from './scenes/preview-data'

// ---------------------------------------------------------------------------
// Legacy short-form composition (retained for stills + reference; not part of
// the new YouTube market report pipeline).
// ---------------------------------------------------------------------------

const defaultStats: MarketReportInput = {
  city: 'Bend',
  period: '2026',
  subhead: 'YTD Market Report April 2026',
  citySlug: 'bend',
  voPath: '',
  captionWords: [],
  beatDurations: [4.0, 3.5, 4.5, 3.5, 4.5, 3.5, 4.5, 3.5, 4.5, 5.5, 6.0],
  stats: [
    { label: 'Median Sale Price', value: '', layout: 'label-only', bgVariant: 'navy' },
    { label: 'Median Sale Price', value: '$699K', layout: 'hero', bgVariant: 'navy', changeText: '7.3% vs 2025', changeDir: 'down', context: 'YTD 643 closed homes' },
    { label: 'Months of Supply', value: '', layout: 'label-only', bgVariant: 'navy-rich' },
    { label: 'Months of Supply', value: '5.8', unit: 'mo', layout: 'callout', bgVariant: 'navy-rich', pillText: 'BALANCED MARKET', context: 'Buyers have options but the market is not soft.' },
    { label: 'Days on Market', value: '', layout: 'label-only', bgVariant: 'gold-tint' },
    { label: 'Days on Market', value: '57', unit: 'days', layout: 'hero', bgVariant: 'gold-tint', context: 'Thirteen days faster than last year.' },
    { label: 'Sale-to-List Ratio', value: '', layout: 'label-only', bgVariant: 'cream' },
    { label: 'Sale-to-List Ratio', value: '97.1', unit: '%', layout: 'bar', bgVariant: 'cream', barPct: 0.856, context: 'Negotiation is limited. Pricing has been firm.' },
    { label: 'Active Listings', value: '1,149', layout: 'compare', bgVariant: 'navy', context: '415 pending · 360 new last 30 days' },
  ],
}

// ---------------------------------------------------------------------------
// Title-card and outro-card preview compositions, both orientations.
// 90 frames @ 30fps = 3s per still — long enough for animations to settle.
// ---------------------------------------------------------------------------

const STILL_DURATION = 90

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketReport"
        component={MarketReport}
        durationInFrames={computeDurationFrames(defaultStats)}
        fps={FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={defaultStats}
        calculateMetadata={({ props }: { props: MarketReportInput }) => ({
          durationInFrames: computeDurationFrames(props),
        })}
      />

      {/* TitleCard — landscape (YouTube). */}
      <Composition
        id="TitleCard-Landscape"
        component={TitleCard}
        durationInFrames={STILL_DURATION}
        fps={FPS}
        width={LANDSCAPE_WIDTH}
        height={LANDSCAPE_HEIGHT}
        defaultProps={{
          title: SAMPLE_TITLE,
          market: SAMPLE_MARKET,
        }}
      />

      {/* TitleCard — portrait (Reels / Shorts). */}
      <Composition
        id="TitleCard-Portrait"
        component={TitleCard}
        durationInFrames={STILL_DURATION}
        fps={FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={{
          title: SAMPLE_TITLE,
          market: SAMPLE_MARKET,
        }}
      />

      {/* OutroCard — landscape. */}
      <Composition
        id="OutroCard-Landscape"
        component={OutroCard}
        durationInFrames={STILL_DURATION}
        fps={FPS}
        width={LANDSCAPE_WIDTH}
        height={LANDSCAPE_HEIGHT}
        defaultProps={{
          cta: SAMPLE_CTA,
          showLogo: true,
        }}
      />

      {/* OutroCard — portrait. */}
      <Composition
        id="OutroCard-Portrait"
        component={OutroCard}
        durationInFrames={STILL_DURATION}
        fps={FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={{
          cta: SAMPLE_CTA,
          showLogo: true,
        }}
      />
    </>
  )
}
