/**
 * Structured PDF analysis for SkySlope Forms scripts (Node, ESM).
 *
 * Uses Mozilla pdf.js (legacy build) for per-page text, annotations, and
 * e-sign vendor markers, then **mandatory OCR** on image-heavy pages (and
 * on every page when the whole document text layer is thin) so scanned
 * contracts are read the same way as text-born PDFs.
 *
 * OCR engines (first that works per page): Poppler `pdftoppm` + Tesseract
 * CLI when on PATH; otherwise pdf.js canvas render + `tesseract.js` (ships
 * with the repo). See `.cursor/rules/skyslope-pdf-analysis.mdc`.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const DEFAULT_MAX_PAGES = Math.min(
  120,
  Math.max(1, Number.parseInt(String(process.env.SKYSLOPE_PDF_MAX_PAGES || '80'), 10) || 80)
)

/**
 * @typedef {{
 *   ok: boolean
 *   reason?: string | undefined
 *   text: string
 *   pageCount: number
 *   pagesAnalyzed: number
 *   charCount: number
 *   nonWhitespaceCharCount: number
 *   textDensity: 'empty' | 'thin' | 'moderate' | 'rich'
 *   lowTextPageRanges: string
 *   annotationSubtypeCounts: Record<string, number>
 *   widgetSignLikeCount: number
 *   widgetFieldSample: string[]
 *   esign: Record<string, number>
 *   ocrSnippet: string
 *   ocrPageCount: number
 *   ocrEngineNote: string
 *   flagsLine: string
 *   combinedForSa: string
 * }} PdfInsight
 */

/**
 * @param {Buffer} buf
 * @param {{ maxPages?: number }} [opts]
 * @returns {Promise<PdfInsight>}
 */
export async function analyzePdfBuffer(buf, opts = {}) {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES
  if (!buf || buf.length < 8 || buf.slice(0, 4).toString() !== '%PDF') {
    return emptyPdfInsight('not_pdf_bytes')
  }

  let pdfjs
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  } catch (e) {
    return emptyPdfInsight(`pdfjs_import:${e?.message || e}`)
  }

  /** @type {unknown} */
  let doc = null
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: true,
      verbosity: 0,
      isEvalSupported: false,
    })
    doc = await loadingTask.promise
  } catch (e) {
    return emptyPdfInsight(`pdfjs_open:${e?.message || e}`)
  }

  const pageCount = doc.numPages || 0
  const pagesToRead = Math.min(pageCount, maxPages)
  const perPageChars = []
  const annotationSubtypeCounts = /** @type {Record<string, number>} */ ({})
  const widgetFieldSample = /** @type {string[]} */ []
  let widgetSignLikeCount = 0

  const pageTexts = []
  for (let i = 1; i <= pagesToRead; i++) {
    let pageChars = 0
    let pageText = ''
    try {
      const page = await doc.getPage(i)
      const textContent = await page.getTextContent({ includeMarkedContent: false })
      for (const item of textContent.items) {
        if (!item || typeof item !== 'object' || !('str' in item)) continue
        const s = String(/** @type {{ str: string }} */ (item).str || '')
        pageText += (pageText && !pageText.endsWith(' ') ? ' ' : '') + s
        pageChars += s.replace(/\s/g, '').length
      }
      let annotations = []
      try {
        annotations = await page.getAnnotations({ intent: 'display' })
      } catch {
        annotations = []
      }
      for (const a of annotations) {
        const sub = String(a?.subtype || 'unknown')
        annotationSubtypeCounts[sub] = (annotationSubtypeCounts[sub] || 0) + 1
        if (sub === 'Widget') {
          const name = [a.fieldName, a.title].filter(Boolean).join(' ').trim()
          if (name && /sign|initial|buyer|seller|agent|broker|firm|company|notary|date/i.test(name)) {
            widgetSignLikeCount += 1
            if (widgetFieldSample.length < 28 && !widgetFieldSample.includes(name)) widgetFieldSample.push(name)
          }
        }
      }
    } catch {
      pageText = ''
      pageChars = 0
    }
    perPageChars.push(pageChars)
    pageTexts.push(pageText)
  }

  let mergedPageTexts = pageTexts
  let ocrPageCount = 0
  let ocrSnippet = ''
  let ocrEngineNote = ''
  try {
    const ocrOut = await runMandatoryPageOcr(buf, doc, perPageChars, pagesToRead, pageTexts)
    mergedPageTexts = ocrOut.mergedPageTexts
    ocrPageCount = ocrOut.ocrPageCount
    ocrSnippet = ocrOut.ocrSnippet
    ocrEngineNote = ocrOut.ocrEngineNote
  } catch (e) {
    console.error('[skyslope-pdf-insight] mandatory OCR phase failed', e)
    ocrEngineNote = `OCR failed: ${e?.message || String(e)}`
  }

  try {
    await doc.cleanup()
    await doc.destroy()
  } catch {
    /* ignore */
  }

  const text = mergedPageTexts.join('\n\n')
  const mergedPerPageChars = mergedPageTexts.map((s) => s.replace(/\s/g, '').length)
  const nonWhitespaceCharCount = text.replace(/\s/g, '').length
  const charCount = text.length
  const textDensity = densityLabel(nonWhitespaceCharCount, pageCount || pagesToRead)
  const lowTextPageRanges = formatLowTextPages(mergedPerPageChars)
  const esign = scanEsignMarkers(text)
  const combinedForSa = text

  const flagsLine = buildFlagsLine({
    pageCount,
    pagesAnalyzed: pagesToRead,
    textDensity,
    lowTextPageRanges,
    annotationSubtypeCounts,
    widgetSignLikeCount,
    esign,
    ocrPageCount,
    ocrEngineNote,
    hasOcrSnippet: Boolean(ocrSnippet),
  })

  return {
    ok: true,
    text,
    pageCount,
    pagesAnalyzed: pagesToRead,
    charCount,
    nonWhitespaceCharCount,
    textDensity,
    lowTextPageRanges,
    annotationSubtypeCounts,
    widgetSignLikeCount,
    widgetFieldSample,
    esign,
    ocrSnippet,
    ocrPageCount,
    ocrEngineNote,
    flagsLine,
    combinedForSa,
  }
}

/** Budgeted scripts skip some PDFs; keep table rows honest. */
export function notSampledPdfInsight() {
  return emptyPdfInsight('not_in_pdf_sample_for_this_run')
}

/**
 * @param {string} reason
 * @returns {PdfInsight}
 */
export function emptyPdfInsight(reason) {
  return {
    ok: false,
    reason,
    text: '',
    pageCount: 0,
    pagesAnalyzed: 0,
    charCount: 0,
    nonWhitespaceCharCount: 0,
    textDensity: 'empty',
    lowTextPageRanges: '',
    annotationSubtypeCounts: {},
    widgetSignLikeCount: 0,
    widgetFieldSample: [],
    esign: {},
    ocrSnippet: '',
    ocrPageCount: 0,
    ocrEngineNote: '',
    flagsLine:
      reason === 'not_in_pdf_sample_for_this_run'
        ? 'PDF not analyzed this run. Raise SKYSLOPE_BRIEF_MAX_PDFS to include more files.'
        : reason === 'no_download_url'
          ? 'No download URL on the document row'
          : reason === 'not_pdf'
            ? 'Not a PDF'
            : reason
              ? `Unreadable PDF (${reason})`
              : 'Unreadable PDF',
    combinedForSa: '',
  }
}

/**
 * @param {number} chars
 * @param {number} pages
 */
function densityLabel(chars, pages) {
  const p = Math.max(1, pages)
  const per = chars / p
  if (chars < 20) return 'empty'
  if (per < 120) return 'thin'
  if (per < 900) return 'moderate'
  return 'rich'
}

/**
 * @param {number[]} perPageChars
 */
function formatLowTextPages(perPageChars) {
  const thinIdx = []
  for (let i = 0; i < perPageChars.length; i++) {
    if (perPageChars[i] < 45) thinIdx.push(i + 1)
  }
  if (!thinIdx.length) return ''
  return collapseRanges(thinIdx)
}

/**
 * @param {number[]} sortedUnique
 */
function collapseRanges(sortedUnique) {
  const parts = []
  let start = sortedUnique[0]
  let prev = sortedUnique[0]
  for (let i = 1; i <= sortedUnique.length; i++) {
    const cur = sortedUnique[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = cur
    prev = cur
  }
  return `Low extractable text on page(s) ${parts.join(', ')} (often signatures, stamps, or scans)`
}

/**
 * @param {string} t
 */
function scanEsignMarkers(t) {
  const s = String(t || '')
  const counts = {
    digiSign: (s.match(/\bDigiSign\b/gi) || []).length,
    docusign: (s.match(/\bDocuSign\b|\bDOCUSIGN\b|Completed with DocuSign|Envelope ID\s*:/gi) || []).length,
    adobe: (s.match(/\bAdobe\s+Sign\b|\bAcrobat\s+Sign\b/gi) || []).length,
    oneSpan: (s.match(/OneSpan|SILANIS|eSignLive/gi) || []).length,
    rightSignature: (s.match(/RightSignature/gi) || []).length,
    proof: (s.match(/\bNotarize\b|\bProof\.com\b/gi) || []).length,
    genericSignedBy: (s.match(/Signed\s+by\s*:/gi) || []).length,
    digitalCert: (s.match(/Digitally\s+signed\s+by|Reason:\s|Location:\s/gi) || []).length,
  }
  return counts
}

/**
 * @param {object} p
 */
function buildFlagsLine(p) {
  const parts = []
  parts.push(`${p.pageCount} pg`)
  if (p.pagesAnalyzed < p.pageCount) parts.push(`read ${p.pagesAnalyzed}`)
  parts.push(p.textDensity)
  if (p.lowTextPageRanges) parts.push(shorten(p.lowTextPageRanges, 120))
  if (p.widgetSignLikeCount > 0) parts.push(`${p.widgetSignLikeCount} sign-like fields`)
  const e = p.esign || {}
  const hits = []
  if (e.digiSign) hits.push(`Digi×${e.digiSign}`)
  if (e.docusign) hits.push(`Docu×${e.docusign}`)
  if (e.adobe) hits.push(`Adobe×${e.adobe}`)
  if (e.oneSpan) hits.push(`OneSpan×${e.oneSpan}`)
  if (e.rightSignature) hits.push(`RS×${e.rightSignature}`)
  if (e.proof) hits.push(`Notary×${e.proof}`)
  if (e.genericSignedBy) hits.push(`SignedBy×${e.genericSignedBy}`)
  if (e.digitalCert) hits.push(`DigCert×${e.digitalCert}`)
  if (hits.length) parts.push(hits.join(' '))
  if (p.ocrPageCount > 0) parts.push(`OCR ${p.ocrPageCount} pg`)
  if (p.ocrEngineNote) parts.push(shorten(p.ocrEngineNote, 100))
  else if (p.hasOcrSnippet) parts.push('OCR text merged')
  const line = parts.join(' · ')
  return shorten(line, 380)
}

/**
 * @param {string} s
 * @param {number} n
 */
function shorten(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return t.slice(0, n - 1) + '…'
}

function commandOnPath(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' })
  return r.status === 0
}

/**
 * Mandatory OCR: all pages when the document text layer is globally thin;
 * otherwise every page whose extractable text falls below the threshold.
 * @param {Buffer} buf
 * @param {unknown} doc pdf.js document
 * @param {number[]} perPageChars non-whitespace char count per page from text layer
 * @param {number} pagesToRead
 * @param {string[]} pageTexts
 */
async function runMandatoryPageOcr(buf, doc, perPageChars, pagesToRead, pageTexts) {
  const thinTh = Math.max(
    20,
    Number.parseInt(String(process.env.SKYSLOPE_PDF_THIN_PAGE_CHARS || '45'), 10) || 45
  )
  const ocrMax = Math.min(
    pagesToRead,
    Math.max(1, Number.parseInt(String(process.env.SKYSLOPE_PDF_OCR_MAX_PAGES || '60'), 10) || 60)
  )
  const docTotal = perPageChars.reduce((a, b) => a + b, 0)
  const allThin = perPageChars.length > 0 && perPageChars.every((c) => c < thinTh)
  const docWideThin = docTotal < 220 || allThin

  /** @type {number[]} */
  let pagesToOcr = []
  if (docWideThin) {
    for (let p = 1; p <= ocrMax; p++) pagesToOcr.push(p)
  } else {
    for (let i = 0; i < perPageChars.length; i++) {
      if (perPageChars[i] < thinTh) pagesToOcr.push(i + 1)
    }
    if (pagesToOcr.length > ocrMax) pagesToOcr = pagesToOcr.slice(0, ocrMax)
  }

  const merged = [...pageTexts]
  if (pagesToOcr.length === 0) {
    return {
      mergedPageTexts: merged,
      ocrPageCount: 0,
      ocrSnippet: '',
      ocrEngineNote: 'no OCR pages (text layer dense on every page)',
    }
  }

  const useCli = commandOnPath('pdftoppm') && commandOnPath('tesseract')
  /** @type {import('tesseract.js').Worker | null} */
  let worker = null
  const ensureWorker = async () => {
    if (worker) return worker
    try {
      const Tesseract = await import('tesseract.js')
      worker = await Tesseract.createWorker('eng', 1, { logger: () => {} })
      return worker
    } catch (e) {
      console.error('[skyslope-pdf-insight] tesseract.js worker failed', e)
      return null
    }
  }

  if (!useCli) {
    await ensureWorker()
  }
  if (!useCli && !worker) {
    return {
      mergedPageTexts: merged,
      ocrPageCount: 0,
      ocrSnippet: '',
      ocrEngineNote: 'OCR unavailable (install Poppler + Tesseract CLI, or reinstall node deps for tesseract.js)',
    }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-pdf-ocr-'))
  const pdfPath = path.join(tmp, 'in.pdf')
  fs.writeFileSync(pdfPath, buf)

  const ocrChunks = []
  let ocrPageCount = 0
  let usedCli = 0
  let usedRender = 0

  try {
    for (const pageNum of pagesToOcr) {
      let ocrText = ''
      if (useCli) {
        ocrText = ocrOnePageWithCli(pdfPath, tmp, pageNum)
        if (ocrText.trim()) usedCli += 1
      }
      if (!ocrText.trim()) {
        const w = await ensureWorker()
        if (w) {
          ocrText = await ocrOnePageWithRender(doc, pageNum, w)
          if (ocrText.trim()) usedRender += 1
        }
      }
      if (!ocrText.trim()) continue

      const idx = pageNum - 1
      const wasThin = perPageChars[idx] < thinTh
      const prev = merged[idx] || ''
      merged[idx] = wasThin ? ocrText.trim() : `${prev}\n\n[OCR]\n${ocrText.trim()}`
      ocrChunks.push(`[p${pageNum}] ${ocrText.replace(/\s+/g, ' ').trim().slice(0, 1500)}`)
      ocrPageCount += 1
    }
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    if (worker) {
      try {
        await worker.terminate()
      } catch {
        /* ignore */
      }
    }
  }

  const ocrSnippet = ocrChunks.join('\n')
  const trimmedSnippet = ocrSnippet.length > 4000 ? ocrSnippet.slice(0, 4000) + '…' : ocrSnippet
  const engine =
    usedCli > 0 && usedRender > 0
      ? 'Poppler+Tesseract CLI and tesseract.js render'
      : usedCli > 0
        ? 'Poppler + Tesseract CLI'
        : usedRender > 0
          ? 'tesseract.js (pdf.js render)'
          : 'OCR ran but no text returned'

  return {
    mergedPageTexts: merged,
    ocrPageCount,
    ocrSnippet: trimmedSnippet,
    ocrEngineNote: `${engine} · ${ocrPageCount} page(s)`,
  }
}

/**
 * @param {string} pdfPath
 * @param {string} tmpDir
 * @param {number} pageNum 1-based
 */
function ocrOnePageWithCli(pdfPath, tmpDir, pageNum) {
  const stem = path.join(tmpDir, `pg${pageNum}`)
  const r1 = spawnSync(
    'pdftoppm',
    ['-f', String(pageNum), '-l', String(pageNum), '-png', '-r', '200', pdfPath, stem],
    { encoding: 'utf8' }
  )
  if (r1.status !== 0) return ''
  const hits = fs
    .readdirSync(tmpDir)
    .filter((f) => f.startsWith(`pg${pageNum}-`) && f.endsWith('.png'))
    .sort()
  const fname = hits[0]
  if (!fname) return ''
  const pngPath = path.join(tmpDir, fname)
  try {
    const r2 = spawnSync('tesseract', [pngPath, 'stdout', '-l', 'eng'], { encoding: 'utf8', maxBuffer: 6_000_000 })
    return r2.status === 0 && r2.stdout ? String(r2.stdout) : ''
  } finally {
    try {
      fs.unlinkSync(pngPath)
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {unknown} doc
 * @param {number} pageNum
 * @param {import('tesseract.js').Worker} worker
 */
async function ocrOnePageWithRender(doc, pageNum, worker) {
  try {
    const { createCanvas } = await import('@napi-rs/canvas')
    const dpi = Math.min(300, Math.max(144, Number.parseInt(String(process.env.SKYSLOPE_PDF_OCR_DPI || '200'), 10) || 200))
    const scale = dpi / 72
    const page = await /** @type {{ getPage: (n: number) => Promise<unknown> }} */ (doc).getPage(pageNum)
    const p = /** @type {{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } }} */ (
      page
    )
    const viewport = p.getViewport({ scale })
    const w = Math.max(1, Math.ceil(viewport.width))
    const h = Math.max(1, Math.ceil(viewport.height))
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    await p.render({ canvasContext: ctx, viewport }).promise
    const png = canvas.toBuffer('image/png')
    const {
      data: { text },
    } = await worker.recognize(png)
    return String(text || '')
  } catch (e) {
    console.error(`[skyslope-pdf-insight] render OCR failed page ${pageNum}`, e?.message || e)
    return ''
  }
}

/**
 * @param {string} text
 * @param {number} [max]
 */
export function extractSignatoryHints(text, max = 10) {
  const raw = String(text || '').replace(/\s+/g, ' ')
  const t = redactContacts(raw)
  const names = new Set()

  const patterns = [
    /\bDigiSign Verified[^\n]{0,100}?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    /\bSigned\s+by\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /\bDigitally\s+signed\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /\(c\)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*Signature/gi,
    /\bDocuSigned\s+by\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(t)) !== null) {
      const n = m[1]?.trim()
      if (n && n.length < 60 && !/Verified|DigiSign|DocuSigned|Signature/i.test(n)) names.add(n)
      if (names.size >= max) return [...names]
    }
  }
  return [...names].slice(0, max)
}

/**
 * @param {string} s
 */
function redactContacts(s) {
  if (!s || typeof s !== 'string') return s
  return s
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email redacted]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone redacted]')
}

/**
 * @param {string} text
 */
export function extractSaleAgreementNumber(text) {
  const t = String(text || '').replace(/\s+/g, ' ')
  const patterns = [
    /SALE\s+AGREEMENT\s*#\s*([A-Za-z0-9\-._/]+)/i,
    /Sale\s+Agreement\s*#\s*([A-Za-z0-9\-._/]+)/i,
    /RSA\s*#\s*([A-Za-z0-9\-._/]+)/i,
    /Transaction\s*ID\s*[:#]?\s*([A-Za-z0-9\-._]+)/i,
    /\bSA\s*#\s*([A-Za-z0-9\-._/]+)/i,
    /\bContract\s*#\s*([A-Za-z0-9\-._/]+)/i,
    /Agreement\s+(?:No\.?|Number|#)\s*[:#]?\s*([A-Za-z0-9\-._/]+)/i,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) return m[1].slice(0, 120).trim()
  }
  return ''
}

/**
 * @param {string} kind
 * @param {PdfInsight} insight
 * @param {string} fileName
 */
export function buildExecutionAssessment(kind, insight, fileName) {
  if (insight.reason === 'not_in_pdf_sample_for_this_run') {
    return {
      label: 'PDF not in this run sample',
      detail: insight.flagsLine || 'Raise SKYSLOPE_BRIEF_MAX_PDFS and re-run to analyze this file.',
    }
  }
  if (insight.reason === 'no_download_url') {
    return {
      label: 'No SkySlope download URL',
      detail: 'Open this document from the folder in SkySlope. The API row had no URL for automated read.',
    }
  }

  const fn = String(fileName || '')
  const t = `${insight.text || ''}\n${insight.ocrSnippet || ''}\n${fn}`
  const es = insight.esign || {}
  const vendorHits =
    (es.digiSign || 0) +
    (es.docusign || 0) +
    (es.adobe || 0) +
    (es.oneSpan || 0) +
    (es.rightSignature || 0) +
    (es.proof || 0) +
    (es.genericSignedBy || 0) +
    (es.digitalCert || 0)
  const hasSigLabels = /Seller Initial|Buyer Initial|Signature|By:|Initial here|Sign here/i.test(t)
  const thin = insight.textDensity === 'empty' || insight.textDensity === 'thin'
  const widgets = insight.widgetSignLikeCount || 0

  const detailParts = []
  if (insight.pageCount) detailParts.push(`${insight.pageCount} page PDF, ${insight.textDensity} extractable text`)
  if (insight.lowTextPageRanges) detailParts.push(insight.lowTextPageRanges)
  if (widgets > 0) detailParts.push(`${widgets} form field(s) look signature or party related in the PDF structure`)
  if (vendorHits > 0) detailParts.push('E-sign or certificate language appeared in text or OCR')
  detailParts.push('Confirm every required line in SkySlope. Automated read is advisory only')

  const baseDetail = detailParts.join('. ') + '.'

  if (kind === 'listing_agreement' || kind === 'agency_disclosure_pamphlet') {
    if (!insight.ok) return { label: 'PDF could not be analyzed', detail: insight.flagsLine || 'Open in SkySlope.' }
    if (thin && vendorHits === 0 && !widgets)
      return {
        label: 'Little machine readable text',
        detail:
          'Per-page text extraction is thin and no e-sign markers or signature widgets stood out. The file may be mostly scans or images. ' + baseDetail,
      }
    if (vendorHits >= 2 || widgets >= 2 || (vendorHits >= 1 && hasSigLabels))
      return {
        label: 'Strong clues of seller side activity',
        detail:
          'Multiple e-sign markers, certificate language, or signature-like form fields suggest activity on seller or firm lines. ' + baseDetail,
      }
    if (vendorHits >= 1 || hasSigLabels || widgets >= 1)
      return {
        label: 'Some execution clues in text or fields',
        detail: 'At least one vendor stamp, signature wording, or structured field suggests partial progress. ' + baseDetail,
      }
    return { label: 'No strong automated signal', detail: 'Use your checklist on the PDF. ' + baseDetail }
  }

  if (kind === 'buyer_representation_agreement') {
    if (!insight.ok) return { label: 'PDF could not be analyzed', detail: insight.flagsLine || 'Open in SkySlope.' }
    if (thin && vendorHits === 0 && !widgets)
      return {
        label: 'Little machine readable text',
        detail:
          'Thin text layer on this buyer-side form. Treat as needs eye review if scans. ' + baseDetail,
      }
    if (vendorHits >= 1 || widgets >= 1)
      return {
        label: 'Buyer side activity plausible',
        detail: 'E-sign text or buyer-related widgets appeared. Confirm buyer and firm signatures. ' + baseDetail,
      }
    return { label: 'No strong automated signal', detail: 'Open the PDF for buyer and firm execution. ' + baseDetail }
  }

  if (
    kind === 'buyer_offer_or_package' ||
    kind === 'sale_agreement_or_rsa' ||
    kind === 'numbered_counter' ||
    kind === 'counter_or_counteroffer' ||
    kind === 'addendum'
  ) {
    if (!insight.ok) return { label: 'PDF could not be analyzed', detail: insight.flagsLine || 'Open in SkySlope.' }
    if (thin && vendorHits < 2 && widgets < 2)
      return {
        label: 'Offer stack may be scan heavy',
        detail:
          'Low extractable text per page on this contract-class PDF. Mutual acceptance still requires you to open the file. ' + baseDetail,
      }
    if (vendorHits >= 5 || (vendorHits >= 3 && hasSigLabels) || widgets >= 4)
      return {
        label: 'Heavy e-sign or field activity',
        detail:
          'Many vendor markers or signature-class widgets suggest multiple parties touched the file. Map stamps to buyer, seller, and firm blocks. ' +
          baseDetail,
      }
    if (vendorHits >= 2 || widgets >= 2)
      return {
        label: 'Moderate e-sign or field activity',
        detail: 'Several markers or widgets. Check initials and counter pages. ' + baseDetail,
      }
    if (vendorHits >= 1 || widgets >= 1 || hasSigLabels)
      return { label: 'Light execution clues', detail: 'Some markers only. Treat as partial signal. ' + baseDetail }
    return { label: 'No strong automated signal', detail: 'Open the PDF for all required initials and signatures. ' + baseDetail }
  }

  if (kind === 'lender_financing') {
    return {
      label: 'Lender or buyer form',
      detail: 'Usually buyer or lender signs. ' + (insight.flagsLine || ''),
    }
  }
  return { label: 'Review in SkySlope', detail: insight.flagsLine || 'Classify using the form title and office checklist.' }
}
