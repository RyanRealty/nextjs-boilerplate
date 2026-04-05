import { NextResponse } from 'next/server'
import { getSearchSuggestions } from '@/app/actions/listings'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json(
      {
        addresses: [],
        cities: [],
        subdivisions: [],
        neighborhoods: [],
        zips: [],
        brokers: [],
        reports: [],
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    )
  }

  try {
    const suggestions = await getSearchSuggestions(q)
    return NextResponse.json(suggestions, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[api/search/suggestions]', err)
    return NextResponse.json(
      {
        addresses: [],
        cities: [],
        subdivisions: [],
        neighborhoods: [],
        zips: [],
        brokers: [],
        reports: [],
      },
      { status: 200 }
    )
  }
}
