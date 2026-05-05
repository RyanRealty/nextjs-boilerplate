import { NextRequest, NextResponse } from 'next/server'
import { exchangePinterestCode, upsertPinterestToken, validatePinterestState } from '@/lib/pinterest'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/social?pinterest=error&reason=${encodeURIComponent(error)}`,
        request.url
      )
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/admin/social?pinterest=error&reason=missing_params', request.url)
    )
  }

  try {
    const valid = await validatePinterestState(state)
    if (!valid) {
      return NextResponse.redirect(
        new URL('/admin/social?pinterest=error&reason=invalid_state', request.url)
      )
    }

    const token = await exchangePinterestCode(code)
    await upsertPinterestToken(token)

    return NextResponse.redirect(new URL('/admin/social?pinterest=connected', request.url))
  } catch (err) {
    console.error('Pinterest callback error:', err)
    const reason = encodeURIComponent(err instanceof Error ? err.message : 'callback_failed')
    return NextResponse.redirect(
      new URL(`/admin/social?pinterest=error&reason=${reason}`, request.url)
    )
  }
}
