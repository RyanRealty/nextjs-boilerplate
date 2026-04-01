/**
 * Hero image URLs for content pages.
 * Curated to match page intent with Central Oregon lifestyle imagery.
 * Uses high-quality Unsplash images; no text, no logos.
 */

export const CONTENT_HERO_IMAGES = {
  /** Buy: Cascade Mountains — the aspiration of living in Central Oregon */
  buy: 'https://images.unsplash.com/photo-1750045850708-8e650d8ab71d?w=1920&q=80',
  /** Sell: beautiful Central Oregon home with mountain backdrop */
  sell: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1920&q=80',
  /** About: team partnership with outdoor Central Oregon backdrop */
  about: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80',
  /** Contact: welcoming, warm connection */
  contact: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1920&q=80',
  /** Open houses: beautiful home in Central Oregon setting */
  openHouses: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
  /** Team: scenic Central Oregon backdrop (mountain/river) */
  team: 'https://images.unsplash.com/photo-1653930796811-84d446f9e221?w=1920&q=80',
  /** Listings: mountain biking — active Central Oregon lifestyle */
  listings: 'https://images.unsplash.com/photo-1645520719499-6856445fe4ad?w=1920&q=80',
  /** Join: hiking trail through ponderosa pines */
  join: 'https://images.unsplash.com/photo-1652972756751-4de8e9ef9e77?w=1920&q=80',
  /** Reports: Cascade mountain panorama — authority and data */
  reports: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  /** Area guides: Three Sisters mountain sunset */
  areaGuides: 'https://images.unsplash.com/photo-1724533687925-aa205b97e60e?w=1920&q=80',
  /** Videos: Smith Rock — dramatic landscape */
  videos: 'https://images.unsplash.com/photo-1693719205045-dc0f15254790?w=1920&q=80',
  /** Reviews: stargazing/camping — peaceful lifestyle */
  reviews: 'https://images.unsplash.com/photo-1698270446024-d84db27837d2?w=1920&q=80',
} as const

export type ContentHeroKey = keyof typeof CONTENT_HERO_IMAGES
