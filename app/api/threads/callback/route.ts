import { NextRequest, NextResponse } from 'next/server'
import { exchangeThreadsCode, upsertThreadsToken, validateThreadsState } from '@/lib/threads'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/social?threads=error&reason=${encodeURIComponent(error)}`,
        request.url
      )
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/admin/social?threads=error&reason=missing_params', request.url)
    )
  }

  try {
    const valid = await validateThreadsState(state)
    if (!valid) {
      return NextResponse.redirect(
        new URL('/admin/social?threads=error&reason=invalid_state', request.url)
      )
    }

    const token = await exchangeThreadsCode(code)
    await upsertThreadsToken(token)

    return NextResponse.redirect(new URL('/admin/social?threads=connected', request.url))
  } catch (err) {
    console.error('Threads callback error:', err)
    const reason = encodeURIComponent(err instanceof Error ? err.message : 'callback_failed')
    return NextResponse.redirect(
      new URL(`/admin/social?threads=error&reason=${reason}`, request.url)
    )
  }
}
