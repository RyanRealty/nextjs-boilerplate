import { continueRender, delayRender, staticFile } from 'remotion'

let loaded = false
let loadingPromise: Promise<void> | null = null

async function tryLoad(family: string, urlPath: string, format: string): Promise<void> {
  try {
    const face = new FontFace(family, `url(${staticFile(urlPath)}) format('${format}')`)
    await face.load()
    // Cast: TypeScript DOM lib omits FontFaceSet.add() but browsers have it.
    ;(document.fonts as unknown as { add: (f: FontFace) => void }).add(face)
  } catch {
    // Fallback chain kicks in (Playfair Display / Inter / system-ui).
  }
}

export const loadFonts = (): Promise<void> => {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  const handle = delayRender('font-load')
  loadingPromise = (async () => {
    await Promise.all([
      tryLoad('Amboqia', 'Amboqia.otf', 'opentype'),
      tryLoad('AzoSans', 'AzoSans-Medium.ttf', 'truetype'),
    ])
    loaded = true
  })().finally(() => continueRender(handle))
  return loadingPromise
}
