import { NextResponse } from 'next/server'
import { getPinterestAuthorizationUrl } from '@/lib/pinterest'
import crypto from 'crypto'

export async function GET() {
  try {
    const state = crypto.randomUUID()
    const authUrl = await getPinterestAuthorizationUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Pinterest authorize error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pinterest authorization failed' },
      { status: 500 }
    )
  }
}
