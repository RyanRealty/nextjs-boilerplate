import { continueRender, delayRender, staticFile } from 'remotion'

// Font loader — mirrors video/market-report/src/fonts.ts exactly.
// Fonts live in public/fonts/ (commercial license — gitignored).
// tryLoad() silently falls back on missing asset; the FONT_HEAD / FONT_BODY
// fallback chains in brand.ts ensure a brand-acceptable render regardless.

let loaded = false
let loadingPromise: Promise<void> | null = null

async function tryLoad(family: string, urlPath: string, format: string): Promise<void> {
  try {
    const face = new FontFace(family, `url(${staticFile(urlPath)}) format('${format}')`)
    await face.load()
    document.fonts.add(face)
  } catch {
    // Asset missing — rely on fallback chain.
  }
}

export const loadFonts = (): Promise<void> => {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  const handle = delayRender('font-load')
  loadingPromise = (async () => {
    await Promise.all([
      tryLoad('Amboqia', 'fonts/Amboqia.otf', 'opentype'),
      tryLoad('AzoSans', 'fonts/AzoSans-Medium.ttf', 'truetype'),
    ])
    loaded = true
  })().finally(() => continueRender(handle))
  return loadingPromise
}
