/**
 * Race a promise against a timeout. Unlike Promise.race, rejections resolve to `fallback`
 * so streaming home sections do not crash the Suspense boundary when a query fails.
 */
export function withTimeoutFallback<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
  logLabel?: string
): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(t)
        resolve(value)
      })
      .catch((err: unknown) => {
        clearTimeout(t)
        if (logLabel) console.error(`[withTimeoutFallback:${logLabel}]`, err)
        resolve(fallback)
      })
  })
}
