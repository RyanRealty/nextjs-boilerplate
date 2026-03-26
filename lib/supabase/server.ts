import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Missing Supabase env')
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Promise.resolve(
          cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        )
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignore in Server Components
        }
      },
    },
  })
}
