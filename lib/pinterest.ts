import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const PINTEREST_OAUTH_AUTH_URL = 'https://www.pinterest.com/oauth/'
const PINTEREST_OAUTH_TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token'
const PINTEREST_PINS_URL = 'https://api.pinterest.com/v5/pins'
const PINTEREST_BOARDS_URL = 'https://api.pinterest.com/v5/boards'
const PINTEREST_MEDIA_URL = 'https://api.pinterest.com/v5/media'
const PINTEREST_OAUTH_SCOPES = 'boards:read pins:write'

interface StoredPinterestToken {
  access_token: string
  refresh_token: string | null
  expires_at: string
}

interface PinterestTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

interface PinterestMediaResponse {
  media_id?: string
  status?: string
}

interface PinterestPinResponse {
  id?: string
}

interface PinterestBoardsResponse {
  items?: Array<{ id: string; name: string }>
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value?.trim()) throw new Error(`${name} is not configured`)
  return value
}

function getSupabase() {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
}

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Upstash Redis not configured')
  return new Redis({ url, token })
}

export function getPinterestOAuthEnv() {
  const clientId = requireEnv('PINTEREST_CLIENT_ID')
  const clientSecret = requireEnv('PINTEREST_CLIENT_SECRET')
  const redirectUri = requireEnv('PINTEREST_REDIRECT_URI')
  return { clientId, clientSecret, redirectUri }
}

export async function getPinterestAuthorizationUrl(state: string): Promise<string> {
  const { clientId, redirectUri } = getPinterestOAuthEnv()
  const redis = getRedis()

  await redis.setex(`pinterest:state:${state}`, 600, '1')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: PINTEREST_OAUTH_SCOPES,
    state,
  })

  return `${PINTEREST_OAUTH_AUTH_URL}?${params.toString()}`
}

export async function validatePinterestState(state: string): Promise<boolean> {
  const redis = getRedis()
  const stored = await redis.get(`pinterest:state:${state}`)
  if (stored) {
    await redis.del(`pinterest:state:${state}`)
    return true
  }
  return false
}

export async function exchangePinterestCode(code: string): Promise<StoredPinterestToken> {
  const { clientId, clientSecret, redirectUri } = getPinterestOAuthEnv()
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch(PINTEREST_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Pinterest token exchange failed: ${response.status} ${response.statusText} — ${text}`
    )
  }

  const json = (await response.json()) as PinterestTokenResponse
  if (!json.access_token) throw new Error('Pinterest token exchange missing access_token')

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? null,
    expires_at: new Date(Date.now() + (json.expires_in ?? 2592000) * 1000).toISOString(),
  }
}

export async function upsertPinterestToken(token: StoredPinterestToken): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('pinterest_auth').upsert(
    {
      id: 'default',
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(`Failed to store Pinterest token: ${error.message}`)
}

async function refreshPinterestToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getPinterestOAuthEnv()
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch(PINTEREST_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  })

  if (!response.ok) {
    throw new Error(`Pinterest token refresh failed: ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as PinterestTokenResponse
  if (!json.access_token) throw new Error('Pinterest token refresh missing access_token')

  const supabase = getSupabase()
  await supabase
    .from('pinterest_auth')
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? refreshToken,
      expires_at: new Date(Date.now() + (json.expires_in ?? 2592000) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')

  return json.access_token
}

export async function getPinterestAccessToken(): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pinterest_auth')
    .select('access_token, refresh_token, expires_at')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) {
    throw new Error('Pinterest not connected — visit /api/pinterest/authorize to connect')
  }

  const token = data as StoredPinterestToken
  const expiresAtMs = new Date(token.expires_at).getTime()
  const refreshWindowMs = 5 * 60 * 1000

  if (Date.now() < expiresAtMs - refreshWindowMs) {
    return token.access_token
  }

  if (!token.refresh_token) {
    throw new Error(
      'Pinterest access token expired and no refresh token — reconnect via /api/pinterest/authorize'
    )
  }

  return refreshPinterestToken(token.refresh_token)
}

export async function getDefaultPinterestBoardId(accessToken: string): Promise<string> {
  const boardId = process.env.PINTEREST_DEFAULT_BOARD_ID
  if (boardId?.trim()) return boardId

  const response = await fetch(`${PINTEREST_BOARDS_URL}?page_size=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Pinterest boards fetch failed: ${response.status}`)
  }

  const json = (await response.json()) as PinterestBoardsResponse
  const firstBoard = json.items?.[0]
  if (!firstBoard?.id) throw new Error('No Pinterest boards found — set PINTEREST_DEFAULT_BOARD_ID')
  return firstBoard.id
}

export async function createPinterestVideoPin(
  accessToken: string,
  videoUrl: string,
  title: string,
  description: string,
  boardId: string
): Promise<string> {
  // Register video media upload
  const mediaResponse = await fetch(PINTEREST_MEDIA_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: 'video',
    }),
  })

  if (!mediaResponse.ok) {
    throw new Error(`Pinterest media register failed: ${mediaResponse.status}`)
  }

  const mediaJson = (await mediaResponse.json()) as PinterestMediaResponse & {
    upload_url?: string
    upload_parameters?: Record<string, string>
  }

  if (!mediaJson.media_id) throw new Error('Pinterest media register returned no media_id')
  const mediaId = mediaJson.media_id

  // Fetch video bytes and upload to Pinterest's S3 presigned URL
  if (mediaJson.upload_url) {
    const sourceResponse = await fetch(videoUrl)
    if (!sourceResponse.ok) {
      throw new Error(`Failed to fetch video for Pinterest: ${sourceResponse.status}`)
    }

    const bytes = await sourceResponse.arrayBuffer()
    const uploadParams = mediaJson.upload_parameters ?? {}

    const formData = new FormData()
    for (const [key, value] of Object.entries(uploadParams)) {
      formData.append(key, value)
    }
    formData.append('file', new Blob([bytes], { type: 'video/mp4' }))

    const uploadResponse = await fetch(mediaJson.upload_url, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Pinterest video upload failed: ${uploadResponse.status}`)
    }
  }

  // Poll until media is processed
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10000))

    const statusResponse = await fetch(`${PINTEREST_MEDIA_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (statusResponse.ok) {
      const statusJson = (await statusResponse.json()) as PinterestMediaResponse
      if (statusJson.status === 'succeeded') break
      if (statusJson.status === 'failed') {
        throw new Error('Pinterest video processing failed')
      }
    }
  }

  // Create pin
  const pinResponse = await fetch(PINTEREST_PINS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title,
      description,
      media_source: {
        source_type: 'video_id',
        media_id: mediaId,
      },
    }),
  })

  if (!pinResponse.ok) {
    const text = await pinResponse.text()
    throw new Error(`Pinterest pin creation failed: ${pinResponse.status} — ${text}`)
  }

  const pinJson = (await pinResponse.json()) as PinterestPinResponse
  if (!pinJson.id) throw new Error('Pinterest pin created but no id returned')
  return pinJson.id
}
