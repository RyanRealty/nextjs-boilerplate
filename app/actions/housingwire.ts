'use server'

import type { HousingWireMarketContext } from '@/lib/housingwire-types'

const ENV_KEY = 'HOUSINGWIRE_API_KEY'
const ENV_BASE_URL = 'HOUSINGWIRE_API_BASE_URL'

/**
 * Fetch national market context from HousingWire Data (formerly Altos Research).
 * Returns null when HOUSINGWIRE_API_KEY is not set or the request fails.
 * When the API is configured, set HOUSINGWIRE_API_BASE_URL to the endpoint
 * HousingWire provides (e.g. trends or summary); this action expects a JSON
 * response that can be mapped to HousingWireMarketContext.
 */
export async function getHousingWireMarketContext(): Promise<{
  data: HousingWireMarketContext | null
  error?: string
}> {
  const apiKey = process.env[ENV_KEY]?.trim()
  if (!apiKey) {
    return { data: null }
  }

  const baseUrl = process.env[ENV_BASE_URL]?.trim()
  if (!baseUrl) {
    return {
      data: null,
      error: 'HOUSINGWIRE_API_BASE_URL is not set. Set it to the endpoint URL provided by HousingWire Data.',
    }
  }

  try {
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return {
        data: null,
        error: `HousingWire API returned ${res.status}. Check credentials and endpoint.`,
      }
    }

    const raw = (await res.json()) as Record<string, unknown>
    const asOf =
      typeof raw.asOf === 'string'
        ? raw.asOf
        : typeof raw.date === 'string'
          ? raw.date
          : new Date().toISOString().slice(0, 10)

    const data: HousingWireMarketContext = {
      asOf,
      nationalInventory:
        typeof raw.nationalInventory === 'number'
          ? raw.nationalInventory
          : typeof raw.inventory === 'number'
            ? raw.inventory
            : null,
      mortgageRate30Yr:
        typeof raw.mortgageRate30Yr === 'number'
          ? raw.mortgageRate30Yr
          : typeof raw.mortgage_rate_30yr === 'number'
            ? raw.mortgage_rate_30yr
            : typeof raw.rate30yr === 'number'
              ? raw.rate30yr
              : null,
      treasury10Y:
        typeof raw.treasury10Y === 'number'
          ? raw.treasury10Y
          : typeof raw.treasury_10y === 'number'
            ? raw.treasury_10y
            : typeof raw.treasury10y === 'number'
              ? raw.treasury10y
              : null,
      nationalMedianListPrice:
        typeof raw.nationalMedianListPrice === 'number'
          ? raw.nationalMedianListPrice
          : typeof raw.median_list_price === 'number'
            ? raw.median_list_price
            : null,
      sourceLabel: 'HousingWire Data',
    }

    return { data }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { data: null, error: `HousingWire fetch failed: ${message}` }
  }
}
