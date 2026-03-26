declare module '@supabase/ssr' {
  export function createBrowserClient(
    url: string,
    key: string,
    options?: { cookies?: { getAll?(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]>; setAll?(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void } }
  ): any

  export function createServerClient(
    url: string,
    key: string,
    options: { cookies: { getAll(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]>; setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void } }
  ): any
}
