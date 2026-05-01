/**
 * Type-fixture for VideoProps. Compiles only if the interface is internally
 * consistent and every scene's data shape can actually be constructed.
 *
 * This file is the unit test for VideoProps.ts — `tsc --noEmit` is the assertion.
 * Numbers here are illustrative SAMPLES, not real Bend data. Do not import this
 * fixture into render code. Real data comes from generate-props.ts at runtime.
 */

import {
  type AlignmentWord,
  COMPOSITION_SIZE,
  type Citation,
  computeTotalDurationFrames,
  dimensionsFor,
  FPS,
  MARKETS,
  type Market,
  type MarketCondition,
  secondsToFrames,
  type SceneDurations,
  VIDEO_PROPS_SCHEMA_VERSION,
  type VideoProps,
} from './VideoProps';

// Sample alignment words for one tiny VO segment.
const sampleWords: AlignmentWord[] = [
  { word: 'April', startSeconds: 0.0, endSeconds: 0.35, startFrame: 0, endFrame: 11, segmentIndex: 0 },
  { word: 'was', startSeconds: 0.35, endSeconds: 0.55, startFrame: 11, endFrame: 17, segmentIndex: 0 },
  { word: 'a', startSeconds: 0.55, endSeconds: 0.62, startFrame: 17, endFrame: 19, segmentIndex: 0 },
  { word: 'shifting', startSeconds: 0.62, endSeconds: 1.10, startFrame: 19, endFrame: 33, segmentIndex: 0 },
  { word: 'month', startSeconds: 1.10, endSeconds: 1.45, startFrame: 33, endFrame: 44, segmentIndex: 0 },
];

const sampleCitations: readonly Citation[] = [
  {
    kind: 'supabase',
    metric: 'Median Sale Price',
    value: 725000,
    display: '$725K',
    source: 'Supabase listings',
    table: 'listings',
    filters:
      "StandardStatus='Closed', PropertyType='A', property_sub_type='Single Family Residence', City='Bend', CloseDate 2026-04-01..2026-04-30, ClosePrice >= 10000",
    rowCount: 188,
    query:
      'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "ClosePrice")',
    sparkValue: 724500,
    sparkDeltaPct: 0.07,
    fetchedAtIso: '2026-04-30T14:22:00Z',
  },
  {
    kind: 'months_of_supply',
    metric: 'Months of Supply',
    value: 4.2,
    display: '4.2 mo',
    active: 412,
    closedLookback: 706,
    lookbackDays: 180,
    formula: 'active / (closed_180d / 180 * 30)',
    source: 'Supabase listings (SFR-only manual)',
    sparkActive: 410,
    sparkDeltaPct: 0.49,
    fetchedAtIso: '2026-04-30T14:22:00Z',
  },
  {
    kind: 'external',
    metric: 'National Median Sale Price',
    value: 412000,
    display: '$412K',
    source: 'NAR Existing Home Sales',
    url: 'https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales',
    fetchedAtIso: '2026-04-30T14:22:00Z',
  },
];

const sceneDurations: SceneDurations = {
  scene0Hook: secondsToFrames(30),
  scene1Title: secondsToFrames(15),
  scene2MedianPrice: secondsToFrames(90),
  scene3PricePerSqFt: secondsToFrames(60),
  scene4Inventory: secondsToFrames(105),
  scene5DaysToPending: secondsToFrames(60),
  scene6Neighborhoods: secondsToFrames(90),
  scene7Takeaways: secondsToFrames(60),
  scene8Cta: secondsToFrames(30),
};

const verdict: MarketCondition = "Seller's Market";

export const sampleVideoProps: VideoProps = {
  schemaVersion: VIDEO_PROPS_SCHEMA_VERSION,
  market: 'Bend',
  period: {
    label: 'April 2026',
    monthId: '2026-04',
    monthName: 'April',
    year: 2026,
    current: { start: '2026-04-01', end: '2026-04-30' },
    priorYear: { start: '2025-04-01', end: '2025-04-30' },
    trailing24mo: { start: '2024-05-01', end: '2026-04-30' },
  },
  orientation: 'landscape',
  episodeId: '2026-04-bend-monthly',
  generatedAtIso: '2026-04-30T14:22:00Z',

  scene0: {
    medianPrice: 725000,
    closedCount: 188,
    medianDaysToPending: 12,
    direction: 'up',
    characterization: 'shifting',
    anchorStatName: 'months_of_supply',
    anchorStatDisplay: '4.2 months',
    anchorStatValue: 4.2,
  },

  scene1: {
    monthYear: 'April 2026',
    miniAgenda: [
      'Prices',
      'Inventory',
      'Days to Pending',
      'Neighborhood Breakdown',
    ],
  },

  scene2: {
    monthlySeries: [
      { month: '2024-05-01', medianPrice: 695000, salesCount: 165 },
      { month: '2024-06-01', medianPrice: 712500, salesCount: 178 },
      { month: '2026-04-01', medianPrice: 725000, salesCount: 188 },
    ],
    currentMedian: 725000,
    priorYearMedian: 710000,
    yoyPct: 2.1,
    yoyDirection: 'up',
    currentMonthLabel: 'April',
    trendDescription: 'Prices climbed for the third straight month.',
    interpretation: 'The market is firming after a soft winter.',
  },

  scene3: {
    byPropertyType: [
      {
        propertySubType: 'Single Family Residence',
        medianPpsf: 387,
        sales: 188,
        priorYearMedianPpsf: 400,
        yoyPct: -3.25,
      },
      {
        propertySubType: 'Condominium',
        medianPpsf: 425,
        sales: 22,
        priorYearMedianPpsf: 410,
        yoyPct: 3.66,
      },
    ],
    sfrPpsf: 387,
    sfrPct: -3.25,
    sfrDirection: 'down',
    condoComparison: 'Condos held firm at $425 per square foot.',
    manufacturedComparison: 'Manufactured homes posted six sales in the period.',
  },

  scene4: {
    monthlySeries: [
      { month: '2024-05-01', sfrActive: 380, condoActive: 42, landActive: 110 },
      { month: '2026-04-01', sfrActive: 412, condoActive: 51, landActive: 124 },
    ],
    activeCount: 412,
    activeCountPriorYear: 380,
    inventoryPct: 8.4,
    inventoryDirection: 'up',
    closedLookback: 706,
    lookbackDays: 180,
    monthlyCloseRate: 117.67,
    monthsOfSupply: 4.2,
    marketCondition: verdict,
    marketConditionExplanation:
      'Inventory crossed back above prior year levels but the velocity holds.',
  },

  scene5: {
    byPriceBand: [
      { priceBand: 'Under $500K', sales: 24, medianDaysToPending: 7, dtpP25: 4, dtpP75: 14 },
      { priceBand: '$500K-$700K', sales: 71, medianDaysToPending: 11, dtpP25: 6, dtpP75: 22 },
      { priceBand: '$700K-$1M', sales: 58, medianDaysToPending: 18, dtpP25: 9, dtpP75: 38 },
      { priceBand: '$1M+', sales: 35, medianDaysToPending: 42, dtpP25: 21, dtpP75: 88 },
    ],
    absorptionRatePct: 31.4,
    sellThroughRate90d: 78.2,
    medianDaysToPending: 12,
    domUnder500k: 7,
    dom500to700k: 11,
    dom700kTo1m: 18,
    dom1mPlus: 42,
    absorptionInterpretation:
      'About a third of active homes are going under contract each month.',
  },

  scene6: {
    byZip: [
      {
        postalCode: '97703',
        areaName: 'West Side',
        centroid: { lat: 44.07, lng: -121.35 },
        sales: 41,
        medianPrice: 875000,
        medianPpsf: 462,
        medianDaysToPending: 14,
        yoyPct: 3.8,
      },
      {
        postalCode: '97701',
        areaName: 'East Side',
        centroid: { lat: 44.06, lng: -121.28 },
        sales: 62,
        medianPrice: 615000,
        medianPpsf: 351,
        medianDaysToPending: 9,
        yoyPct: 1.2,
      },
    ],
    hottestZip: '97703',
    hottestYoyPct: 3.8,
    highestPriceZip: '97703',
    highestPriceMedian: 875000,
    bestValueZip: '97701',
    bestValueMedian: 615000,
  },

  scene7: {
    medianSaleToListPct: 97.1,
    buyerTakeaways: [
      'Make offers below ask in the $1M+ band where days on market are widest.',
      'Look at the East Side for the best price per square foot in town.',
    ],
    sellerTakeaways: [
      'Price within 3 percent of comps. Buyers are walking from anything stretched.',
      'List in the first half of the month to capture the strongest activity.',
    ],
    bestValueZip: '97701',
    bestValueZipPpsf: 351,
  },

  scene8: {
    nextReportDate: 'May 24, 2026',
    url: 'ryan-realty.com',
    phone: '541.213.6706',
  },

  sceneDurations,

  voice: {
    voiceId: 'qSeXEcewz7tA0Q0qk9fH',
    modelId: 'eleven_turbo_v2_5',
    alignmentPath: 'audio/alignment.json',
    segments: [
      {
        sceneIndex: 0,
        audioPath: 'audio/scene0.mp3',
        durationSeconds: 28.5,
        text: 'April was a shifting month for Bend real estate...',
        words: sampleWords,
      },
    ],
    totalDurationSeconds: 540,
  },

  assets: {
    hookBackground: 'assets/hook/earth-zoom.mp4',
    scene2Broll: 'assets/broll/neighborhood-aerial.mp4',
    scene4Broll: 'assets/broll/for-sale-sign.mp4',
    scene6Aerial: 'assets/aerial/bend-3d-tiles.mp4',
    scene6ZipGeoJson: 'assets/geo/bend-zips.json',
    scene7Photo: 'assets/photo/bend-lifestyle.jpg',
    scene7DepthMap: 'assets/photo/bend-lifestyle.depth.png',
    endCardLogo: '../listing_video_v4/public/brand/stacked_logo_white.png',
    brandSting: '../brand-outro/sting.mp3',
    musicBed: 'audio/music_bed.mp3',
    thumbnailVariants: [
      'assets/thumb/v1.jpg',
      'assets/thumb/v2.jpg',
      'assets/thumb/v3.jpg',
      'assets/thumb/v4.jpg',
    ],
  },

  citations: sampleCitations,

  youtube: {
    title: 'Bend Oregon Housing: Median Hits $725K | April 2026 Market Data',
    titleVariants: [
      'Bend Real Estate Cooled in April? The Data Says Otherwise',
      'April 2026: 188 Bend Homes Closed, Here Is What Sold',
    ],
    description:
      'Bend Oregon market data for April 2026. Median sale price, days to pending, months of supply, and neighborhood breakdown for ZIP codes 97701, 97702, 97703, 97708.',
    tags: [
      'bend oregon real estate',
      'central oregon homes',
      'bend housing market',
      'oregon real estate',
      'monthly market report',
    ],
    categoryId: 25,
    hashtags: [
      '#BendOregonRealEstate',
      '#CentralOregonHomes',
      '#BendHousingMarket',
    ],
    publishAtIso: '2026-05-03T17:00:00-07:00',
  },
};

// Type-level proofs — these would fail to compile if the contract drifted.

const _totalFrames: number = computeTotalDurationFrames(sceneDurations);
const _landscapeDims: { width: number; height: number } = dimensionsFor('landscape');
const _portraitDims: { width: number; height: number } = dimensionsFor('portrait');
const _allMarkets: readonly Market[] = MARKETS;
const _fpsLocked: 30 = FPS;
const _landscapeWidth: 1920 = COMPOSITION_SIZE.landscape.width;
const _portraitHeight: 1920 = COMPOSITION_SIZE.portrait.height;

// Reference values to suppress unused-binding errors under strict mode.
export const _typeProofs = {
  _totalFrames,
  _landscapeDims,
  _portraitDims,
  _allMarkets,
  _fpsLocked,
  _landscapeWidth,
  _portraitHeight,
} as const;
