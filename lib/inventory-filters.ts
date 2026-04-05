export type InventoryPropertyBucket =
  | 'single_family'
  | 'condo_townhome'
  | 'manufactured_mobile'
  | 'land_lot'
  | 'other'

export function isActiveForSaleStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').toLowerCase()
  if (!s) return true
  return s.includes('active') || s.includes('for sale') || s.includes('coming soon')
}

export function classifyInventoryPropertyType(propertyType: string | null | undefined): InventoryPropertyBucket {
  const raw = (propertyType ?? '').trim().toLowerCase()
  if (!raw) return 'other'
  if (
    raw.includes('single family') ||
    raw.includes('single-family') ||
    raw.includes('detached') ||
    raw === 'residential'
  ) {
    return 'single_family'
  }
  if (raw.includes('condo') || raw.includes('townhome') || raw.includes('town house') || raw.includes('townhouse')) {
    return 'condo_townhome'
  }
  if (raw.includes('manufactured') || raw.includes('mobile')) {
    return 'manufactured_mobile'
  }
  if (raw.includes('land') || raw.includes('lot') || raw.includes('acreage') || raw.includes('vacant')) {
    return 'land_lot'
  }
  return 'other'
}

export function isResidentialInventoryType(propertyType: string | null | undefined): boolean {
  const bucket = classifyInventoryPropertyType(propertyType)
  return bucket === 'single_family' || bucket === 'condo_townhome' || bucket === 'manufactured_mobile' || bucket === 'other'
}
