export type QueryParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function shouldNoIndexSearchVariant(searchParams: QueryParams | undefined): boolean {
  if (!searchParams) return false
  const page = Number(firstParam(searchParams.page) ?? '1')
  if (Number.isFinite(page) && page > 1) return true

  const blockedKeys = [
    'minPrice',
    'maxPrice',
    'beds',
    'baths',
    'minSqFt',
    'maxSqFt',
    'maxBeds',
    'maxBaths',
    'yearBuiltMin',
    'yearBuiltMax',
    'lotAcresMin',
    'lotAcresMax',
    'postalCode',
    'propertyType',
    'propertySubType',
    'statusFilter',
    'keywords',
    'hasOpenHouse',
    'garageMin',
    'hasPool',
    'hasView',
    'hasWaterfront',
    'newListingsDays',
    'sort',
    'includeClosed',
    'view',
    'perPage',
  ]
  return blockedKeys.some((key) => {
    const raw = firstParam(searchParams[key])
    return raw != null && raw !== ''
  })
}

export function shouldNoIndexBlogIndex(params: { category?: string; page?: string } | undefined): boolean {
  if (!params) return false
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const hasCategory = Boolean(params.category && params.category !== 'All')
  return page > 1 || hasCategory
}
