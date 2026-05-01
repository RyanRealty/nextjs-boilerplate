import { continueRender, delayRender, staticFile } from 'remotion'

// Per brand-system.md §3:
//   - Amboqia Boriango: hero H1, title cards, end-card headlines, pull quotes.
//   - Geist: body, data, captions, UI, metric displays. Fallback: Inter / system-ui.
//   - AzoSans: arched ribbon sub-labels under the wordmark (rare). Kept loaded
//     for legacy components and ribbon use; new components should default to Geist.
//
// Geist is not yet bundled at video/market-report/public/fonts. Until a local
// .woff/.otf lands, components rely on the FONT_BODY fallback chain
// (Geist -> Inter -> system-ui). Stills + previews still render with a
// reasonable sans-serif. Pixel-perfect Geist is a follow-up.

let loaded = false
let loadingPromise: Promise<void> | null = null

async function tryLoad(family: string, urlPath: string, format: string): Promise<void> {
  try {
    const face = new FontFace(family, `url(${staticFile(urlPath)}) format('${format}')`)
    await face.load()
    document.fonts.add(face)
  } catch {
    // Asset missing — components rely on the FONT_HEAD / FONT_BODY fallback
    // chain (Playfair Display / Inter / system-ui). Stills + previews still
    // render with a brand-acceptable substitute.
  }
}

export const loadFonts = (): Promise<void> => {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  const handle = delayRender('font-load')
  loadingPromise = (async () => {
    // Filenames match the canonical assets in video/market-report/public/.
    // The .otf / .ttf are gitignored (commercial license); keep local copies
    // in sync with public/fonts/ at the repo root.
    await Promise.all([
      tryLoad('Amboqia', 'Amboqia_Boriango.otf', 'opentype'),
      tryLoad('AzoSans', 'AzoSans-Medium.ttf', 'truetype'),
    ])
    loaded = true
  })().finally(() => continueRender(handle))
  return loadingPromise
}
