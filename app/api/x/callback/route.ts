import { NextRequest, NextResponse } from 'next/server'
import { exchangeXCode, upsertXToken, getXCodeVerifier } from '@/lib/x'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/social?x=error&reason=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/admin/social?x=error&reason=missing_params', request.url))
  }

  try {
    const codeVerifier = await getXCodeVerifier(state)
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/admin/social?x=error&reason=invalid_state', request.url)
      )
    }

    const token = await exchangeXCode(code, codeVerifier)
    await upsertXToken(token)

    return NextResponse.redirect(new URL('/admin/social?x=connected', request.url))
  } catch (err) {
    console.error('X callback error:', err)
    const reason = encodeURIComponent(err instanceof Error ? err.message : 'callback_failed')
    return NextResponse.redirect(new URL(`/admin/social?x=error&reason=${reason}`, request.url))
  }
}
