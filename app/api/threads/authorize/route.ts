import { NextResponse } from 'next/server'
import { getThreadsAuthorizationUrl } from '@/lib/threads'
import crypto from 'crypto'

export async function GET() {
  try {
    const state = crypto.randomUUID()
    const authUrl = await getThreadsAuthorizationUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Threads authorize error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Threads authorization failed' },
      { status: 500 }
    )
  }
}
