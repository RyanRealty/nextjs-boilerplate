import { NextResponse } from 'next/server'
import { getXAuthorizationUrl } from '@/lib/x'
import crypto from 'crypto'

export async function GET() {
  try {
    const state = crypto.randomUUID()
    const authUrl = await getXAuthorizationUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('X authorize error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'X authorization failed' },
      { status: 500 }
    )
  }
}
