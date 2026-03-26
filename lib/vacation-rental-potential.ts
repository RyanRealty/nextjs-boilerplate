export type VacationRentalInput = {
  city: string | null
  state: string | null
  beds: number | null
  baths: number | null
  listPrice: number | null
  medianListPrice: number | null
  associationYn: boolean | null
}

export type VacationRentalPotential = {
  suitability: 'high' | 'medium' | 'low'
  score: number
  estimatedMonthlyRevenue: number | null
  confidence: 'provider' | 'heuristic'
  notes: string[]
}

type ProviderResponse = {
  estimatedMonthlyRevenue?: number | null
  confidence?: 'provider' | 'heuristic'
}

async function fetchProviderEstimate(input: VacationRentalInput): Promise<number | null> {
  const url = process.env.STR_PROVIDER_URL?.trim()
  const key = process.env.STR_PROVIDER_API_KEY?.trim()
  if (!url || !key || !input.city) return null

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        city: input.city,
        state: input.state,
        beds: input.beds,
        baths: input.baths,
        listPrice: input.listPrice,
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as ProviderResponse
    return typeof json.estimatedMonthlyRevenue === 'number' ? json.estimatedMonthlyRevenue : null
  } catch {
    return null
  }
}

function estimateHeuristicRevenue(input: VacationRentalInput): number | null {
  if (!input.listPrice || !input.city) return null
  const bedsFactor = Math.max(1, input.beds ?? 2)
  const bathsFactor = Math.max(1, input.baths ?? 2)
  const demandFactor = input.medianListPrice && input.listPrice <= input.medianListPrice * 1.15 ? 1.08 : 0.95
  const grossYield = 0.058
  const annual = input.listPrice * grossYield * demandFactor * (0.9 + bedsFactor * 0.06 + bathsFactor * 0.03)
  return Math.round(annual / 12)
}

export async function getVacationRentalPotential(input: VacationRentalInput): Promise<VacationRentalPotential> {
  const notes: string[] = []
  let score = 50

  if ((input.beds ?? 0) >= 3) {
    score += 14
    notes.push('Three or more bedrooms supports family and group demand.')
  } else {
    score -= 8
  }

  if ((input.baths ?? 0) >= 2) {
    score += 8
  }

  if (input.associationYn) {
    score -= 10
    notes.push('HOA or association rules can reduce short term rental flexibility.')
  }

  if (input.medianListPrice && input.listPrice) {
    const ratio = input.listPrice / input.medianListPrice
    if (ratio <= 1.1) score += 8
    if (ratio >= 1.6) score -= 10
  }

  const providerRevenue = await fetchProviderEstimate(input)
  const heuristicRevenue = estimateHeuristicRevenue(input)
  const estimatedMonthlyRevenue = providerRevenue ?? heuristicRevenue
  const confidence: 'provider' | 'heuristic' = providerRevenue != null ? 'provider' : 'heuristic'
  if (confidence === 'heuristic') {
    notes.push('Estimate uses local heuristic assumptions because provider data is not configured.')
  }

  const capped = Math.max(5, Math.min(95, score))
  const suitability: 'high' | 'medium' | 'low' = capped >= 70 ? 'high' : capped >= 45 ? 'medium' : 'low'

  return { suitability, score: capped, estimatedMonthlyRevenue, confidence, notes }
}
