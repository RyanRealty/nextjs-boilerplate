import type { InventoryBreakdown } from '@/app/actions/inventory-breakdown'

/**
 * Stable Unsplash assets for property-type browse tiles (allowed in next.config remotePatterns).
 * Each image is chosen to read clearly at card aspect ratio.
 */
export type InventoryTileKey = keyof InventoryBreakdown

export const INVENTORY_TILE_ASSETS: Record<
  InventoryTileKey,
  { src: string; alt: string; propertyTypeSearch: string }
> = {
  singleFamily: {
    src: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop',
    alt: 'Detached single family home exterior',
    propertyTypeSearch: 'Single Family',
  },
  condoTownhome: {
    src: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80&auto=format&fit=crop',
    alt: 'Multi-story condo and townhome buildings',
    propertyTypeSearch: 'Condo',
  },
  landLot: {
    src: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&auto=format&fit=crop',
    alt: 'Open land and rural lot',
    propertyTypeSearch: 'Land',
  },
  manufacturedMobile: {
    src: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80&auto=format&fit=crop',
    alt: 'Manufactured home community',
    propertyTypeSearch: 'Manufactured',
  },
}
