import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { searchListingsSemantic } from '@/app/actions/semantic-search'

export async function GET(request: Request) {
  const rl = await checkRateLimit(request, 'general')
  if (rl.limited) return rl.response

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const city = searchParams.get('city')?.trim() ?? null
  const rawLimit = Number(searchParams.get('limit') ?? '20')
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  const result = await searchListingsSemantic({ query, city, limit })
  return NextResponse.json(result)
}
