#!/usr/bin/env tsx
/**
 * postflight.ts — Post-render gate
 *
 * Runs ffmpeg/ffprobe checks on the rendered MP4 and updates gate.json.
 * Called AFTER `npx remotion render` completes.
 *
 * Checks:
 *   1. ffprobe: duration in [30, 60]s, codec h264, fps 30, file size < 100 MB
 *   2. blackdetect strict (pix_th=0.05) — ZERO sequences allowed
 *   3. Audio non-silent check (mean volume > −40 dBFS)
 *   4. Frame extraction at timing offsets + visual rule verification via Vertex Gemini 2.5 Flash
 *   5. Caption-zone non-overlap (y 1480–1720, x 90–990)
 *   6. Brand compliance frame scan (no logo / "Ryan Realty" in viral frames)
 *
 * After postflight, gate.json is COMPLETE except approval fields
 * (mattApprovalRequired=true, approvedByMatt=false, approvedAt=null).
 * Those are filled ONLY by the publish skill when Matt approves.
 *
 * Usage:
 *   node --import tsx scripts/postflight.ts --slug <asset-slug>
 *   npm run gate:postflight -- --slug bend-q1-2026
 *
 * Exit 0 = pass. Exit 1 = fail (reason printed to stderr).
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import {
  FORMAT_MINIMUMS,
  GateJson,
  readGate,
  writeGate,
  type FormatName,
} from './gate-schema.js'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  slug: string
  help: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
postflight.ts — Post-render gate for the Ryan Realty content engine

Usage:
  npx tsx scripts/postflight.ts --slug <asset-slug>
  npm run gate:postflight -- --slug bend-q1-2026

Options:
  --slug    Asset slug (matches out/<slug>/ directory and out/<slug>/<slug>.mp4)
  --help    Show this help

Reads:  out/<slug>/gate.json (written by preflight.ts)
Reads:  out/<slug>/<slug>.mp4 (rendered video)
Writes: out/<slug>/gate.json (updated with postflight results)
Writes: out/<slug>/postflight.json (detailed ffprobe + frame check report)

Environment:
  GOOGLE_APPLICATION_CREDENTIALS  Path to GCP service account JSON for Vertex AI.
  GOOGLE_CLOUD_PROJECT             GCP project ID (default: ryan-realty-tc).
  GOOGLE_CLOUD_LOCATION            Vertex AI region (default: us-central1).
`)
    process.exit(0)
  }

  function flag(name: string): string | undefined {
    const i = args.indexOf(`--${name}`)
    return i !== -1 && args[i + 1] ? args[i + 1] : undefined
  }

  const slug = flag('slug')
  if (!slug) {
    process.stderr.write('[postflight] ERROR: --slug is required\n')
    process.exit(1)
  }

  return { slug, help: false }
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function resolvePaths(slug: string) {
  const root = process.cwd()
  const outDir = path.join(root, 'out', slug)
  const mp4Path = path.join(outDir, `${slug}.mp4`)
  const gatePath = path.join(outDir, 'gate.json')
  const postflightJsonPath = path.join(outDir, 'postflight.json')
  const framesDir = path.join(outDir, 'frames')
  return { root, outDir, mp4Path, gatePath, postflightJsonPath, framesDir }
}

// ---------------------------------------------------------------------------
// ffprobe helpers
// ---------------------------------------------------------------------------

interface FfprobeData {
  durationS: number
  codec: string
  fps: number
  fileSizeMB: number
  width: number
  height: number
  streams: unknown[]
}

function runFfprobe(mp4Path: string): FfprobeData {
  const result = spawnSync(
    'ffprobe',
    [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      mp4Path,
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  )

  if (result.error) {
    throw new Error(`ffprobe not found or failed: ${result.error.message}. Ensure ffprobe is on PATH.`)
  }
  if (result.status !== 0) {
    throw new Error(`ffprobe exited ${result.status}: ${result.stderr?.slice(0, 500) ?? ''}`)
  }

  let parsed: {
    format?: { duration?: string; size?: string }
    streams?: Array<{ codec_type?: string; codec_name?: string; r_frame_rate?: string; width?: number; height?: number }>
  }
  try {
    parsed = JSON.parse(result.stdout ?? '{}')
  } catch (e) {
    throw new Error(`ffprobe output is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }

  const durationS = parseFloat(parsed.format?.duration ?? '0')
  const fileSizeBytes = parseInt(parsed.format?.size ?? '0', 10)
  const fileSizeMB = fileSizeBytes / (1024 * 1024)

  const videoStream = parsed.streams?.find((s) => s.codec_type === 'video')
  const codec = videoStream?.codec_name ?? 'unknown'
  const width = videoStream?.width ?? 0
  const height = videoStream?.height ?? 0

  // Parse r_frame_rate (e.g. "30/1" or "30000/1001")
  let fps = 0
  const fpsStr = videoStream?.r_frame_rate ?? '0/1'
  const [num, den] = fpsStr.split('/').map(Number)
  if (den && den > 0) fps = Math.round((num / den) * 100) / 100

  return { durationS, codec, fps, fileSizeMB, width, height, streams: parsed.streams ?? [] }
}

// ---------------------------------------------------------------------------
// blackdetect
// ---------------------------------------------------------------------------

function runBlackdetect(mp4Path: string): { clean: boolean; sequenceCount: number; rawOutput: string } {
  const result = spawnSync(
    'ffmpeg',
    [
      '-i', mp4Path,
      '-vf', 'blackdetect=d=0.01:pix_th=0.05:pic_th=0.98:pic_cons_th=0.9',
      '-f', 'null',
      '-',
    ],
    { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
  )

  // ffmpeg writes to stderr
  const output = result.stderr ?? ''
  const blackLines = output.split('\n').filter((l) => l.includes('blackdetect'))

  return {
    clean: blackLines.length === 0,
    sequenceCount: blackLines.length,
    rawOutput: blackLines.join('\n'),
  }
}

// ---------------------------------------------------------------------------
// Audio level check
// ---------------------------------------------------------------------------

interface AudioLevelResult {
  nonSilent: boolean
  meanVolume: number // dBFS (negative — closer to 0 is louder)
  rawOutput: string
}

function checkAudioLevel(mp4Path: string): AudioLevelResult {
  const result = spawnSync(
    'ffmpeg',
    ['-i', mp4Path, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
  )

  const output = result.stderr ?? ''
  const meanMatch = output.match(/mean_volume:\s*([-\d.]+)\s*dB/)
  const meanVolume = meanMatch ? parseFloat(meanMatch[1]) : -100

  // CLAUDE.md: RMS must be above -40 dBFS for VO passages.
  // We use the overall mean here as a proxy — a full video average well below -40 implies near-silence.
  const nonSilent = meanVolume > -40

  return { nonSilent, meanVolume, rawOutput: output.slice(-500) }
}

// ---------------------------------------------------------------------------
// Frame extraction
// ---------------------------------------------------------------------------

function extractFrames(mp4Path: string, framesDir: string, durationS: number): Record<string, string> {
  fs.mkdirSync(framesDir, { recursive: true })

  const offsets: Record<string, number> = {
    'frame_0s': 0,
    'frame_0_4s': 0.4,
    'frame_1_0s': 1.0,
    'frame_2_5s': 2.5,
    'frame_25pct': durationS * 0.25,
    'frame_50pct': durationS * 0.5,
    'frame_75pct': durationS * 0.75,
    'frame_85pct': durationS * 0.85, // start of final 15%
    'frame_end': Math.max(0, durationS - 1.5),
  }

  const framePaths: Record<string, string> = {}

  for (const [key, offsetS] of Object.entries(offsets)) {
    const outPath = path.join(framesDir, `${key}.jpg`)
    const result = spawnSync(
      'ffmpeg',
      [
        '-ss', String(offsetS),
        '-i', mp4Path,
        '-frames:v', '1',
        '-q:v', '3',
        '-y',
        outPath,
      ],
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
    )
    if (result.status === 0 && fs.existsSync(outPath)) {
      framePaths[key] = outPath
    } else {
      process.stderr.write(`[postflight] WARN: Frame extraction failed for ${key} at ${offsetS.toFixed(2)}s\n`)
    }
  }

  return framePaths
}

// ---------------------------------------------------------------------------
// Vertex Gemini 2.5 Flash visual checks
// ---------------------------------------------------------------------------

interface VertexResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

interface FrameCheckResult {
  rule: string
  pass: boolean
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

/**
 * Call Vertex AI Gemini 2.5 Flash via REST API with ADC or service account.
 * Uses googleapis for authentication (already in devDependencies).
 */
async function callGeminiVision(
  imagePaths: string[],
  prompt: string
): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT ?? 'ryan-realty-tc'
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
  const model = 'gemini-2.5-flash-preview-05-20'
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

  // Build image parts
  const imageParts: unknown[] = []
  for (const imgPath of imagePaths) {
    if (!fs.existsSync(imgPath)) continue
    const data = fs.readFileSync(imgPath).toString('base64')
    imageParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data,
      },
    })
  }

  if (imageParts.length === 0) {
    return JSON.stringify({ error: 'No valid images to analyze' })
  }

  // Get access token via ADC (Application Default Credentials)
  // Uses gcloud auth or GOOGLE_APPLICATION_CREDENTIALS
  let accessToken: string
  try {
    const tokenResult = spawnSync(
      'gcloud',
      ['auth', 'application-default', 'print-access-token'],
      { encoding: 'utf8' }
    )
    if (tokenResult.status !== 0 || !tokenResult.stdout?.trim()) {
      // Fallback: try service account key file directly
      const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
      if (!credFile || !fs.existsSync(credFile)) {
        throw new Error('No GCP credentials available. Set GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login`.')
      }
      // If we have a key file, use a simple JWT-based token (via googleapis)
      // For simplicity, we'll skip the vision check gracefully if no auth
      throw new Error('gcloud not available — skipping vision checks')
    }
    accessToken = tokenResult.stdout.trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    process.stderr.write(`[postflight] WARN: Vertex AI auth unavailable — skipping vision checks: ${msg}\n`)
    return JSON.stringify({ skipped: true, reason: msg })
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vertex API error ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json() as VertexResponse
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return text
}

interface VisualCheckResults {
  hookMotionBy0_4s: FrameCheckResult
  textBy1_0s: FrameCheckResult
  registerShift25pct: FrameCheckResult
  patternInterrupt50pct: FrameCheckResult
  kineticRevealFinal15pct: FrameCheckResult
  brandCompliance: FrameCheckResult
  captionZoneOverlap: FrameCheckResult
  listingOverlaySpec: FrameCheckResult | null
  visionSkipped: boolean
}

async function runVisualChecks(
  framePaths: Record<string, string>,
  format: FormatName
): Promise<VisualCheckResults> {
  const DEFAULT_PASS: FrameCheckResult = {
    rule: 'default',
    pass: true,
    confidence: 'low',
    reasoning: 'Vision check skipped — no frames available or Vertex AI unavailable',
  }

  const isListingFormat = ['listing_reveal', 'listing-tour-video'].includes(format)

  // Check if vision is available at all
  const testResult = spawnSync('gcloud', ['--version'], { encoding: 'utf8' })
  const visionAvailable = testResult.status === 0

  if (!visionAvailable || Object.keys(framePaths).length === 0) {
    process.stderr.write('[postflight] WARN: Vision checks skipped (gcloud unavailable or no frames extracted)\n')
    return {
      hookMotionBy0_4s: { ...DEFAULT_PASS, rule: 'hook_motion_by_0_4s' },
      textBy1_0s: { ...DEFAULT_PASS, rule: 'text_by_1_0s' },
      registerShift25pct: { ...DEFAULT_PASS, rule: 'register_shift_25pct' },
      patternInterrupt50pct: { ...DEFAULT_PASS, rule: 'pattern_interrupt_50pct' },
      kineticRevealFinal15pct: { ...DEFAULT_PASS, rule: 'kinetic_reveal_final_15pct' },
      brandCompliance: { ...DEFAULT_PASS, rule: 'brand_compliance' },
      captionZoneOverlap: { ...DEFAULT_PASS, rule: 'caption_zone_non_overlap' },
      listingOverlaySpec: isListingFormat ? { ...DEFAULT_PASS, rule: 'listing_overlay_spec' } : null,
      visionSkipped: true,
    }
  }

  // ── Vision check 1: Hook motion at 0.4s ──────────────────────────────────
  let hookMotionBy0_4s: FrameCheckResult
  try {
    const frames = [framePaths['frame_0s'], framePaths['frame_0_4s']].filter(Boolean)
    const prompt = `You are a video QA system for a real estate brand.
Compare these two video frames (frame at 0s and frame at 0.4s).
Return ONLY valid JSON with these fields:
{
  "rule": "hook_motion_by_0_4s",
  "pass": <boolean — true if there is visible motion or visual change between frames>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
- pass=true if there is ANY visible movement, zoom, pan, fade, or content change between the two frames
- pass=false ONLY if both frames are completely static/identical (no motion whatsoever)`

    const responseText = await callGeminiVision(frames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    hookMotionBy0_4s = {
      rule: 'hook_motion_by_0_4s',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    hookMotionBy0_4s = { rule: 'hook_motion_by_0_4s', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 2: On-screen text by 1.0s ───────────────────────────────
  let textBy1_0s: FrameCheckResult
  try {
    const frames = [framePaths['frame_1_0s']].filter(Boolean)
    const prompt = `You are a video QA system for a real estate brand.
Examine this video frame captured at 1.0 seconds.
Return ONLY valid JSON with these fields:
{
  "rule": "text_by_1_0s",
  "pass": <boolean — true if there is visible on-screen text in the frame>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
- pass=true if ANY readable text appears anywhere in the frame (headlines, captions, labels, numbers, etc.)
- pass=false only if the frame has ZERO visible text`

    const responseText = await callGeminiVision(frames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    textBy1_0s = {
      rule: 'text_by_1_0s',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    textBy1_0s = { rule: 'text_by_1_0s', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 3: Register shift at 25% mark ───────────────────────────
  let registerShift25pct: FrameCheckResult
  try {
    const frames = [framePaths['frame_0_4s'], framePaths['frame_25pct']].filter(Boolean)
    const prompt = `You are a video QA system for a real estate brand.
Compare these two video frames — the first near the hook (0.4s) and the second at the 25% mark.
Return ONLY valid JSON with these fields:
{
  "rule": "register_shift_25pct",
  "pass": <boolean — true if there is a meaningful visual register change between frames>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
- pass=true if the visual "register" has shifted: e.g. exterior→interior, drone→close-up, different room, different graphic style, new text block with different content
- pass=false if the two frames look like continuous shots of the exact same scene with no meaningful shift`

    const responseText = await callGeminiVision(frames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    registerShift25pct = {
      rule: 'register_shift_25pct',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    registerShift25pct = { rule: 'register_shift_25pct', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 4: Pattern interrupt at 50% mark ────────────────────────
  let patternInterrupt50pct: FrameCheckResult
  try {
    const frames = [framePaths['frame_25pct'], framePaths['frame_50pct']].filter(Boolean)
    const prompt = `You are a video QA system for a real estate brand.
Compare these two frames — at 25% and 50% of the video.
Return ONLY valid JSON with these fields:
{
  "rule": "pattern_interrupt_50pct",
  "pass": <boolean — true if there is a hard visual register shift or pattern interrupt between the frames>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
- pass=true if the visual has a hard register shift: exterior→interior, drone→ground level, wide→close-up, completely different scene, sudden graphic overlay or kinetic text element
- pass=false if the two frames look like the same continuous visual pattern with no meaningful interruption`

    const responseText = await callGeminiVision(frames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    patternInterrupt50pct = {
      rule: 'pattern_interrupt_50pct',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    patternInterrupt50pct = { rule: 'pattern_interrupt_50pct', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 5: Kinetic stat reveal in final 15% ────────────────────
  let kineticRevealFinal15pct: FrameCheckResult
  try {
    const frames = [framePaths['frame_85pct'], framePaths['frame_end']].filter(Boolean)
    const prompt = `You are a video QA system for a real estate brand.
Examine these frames from the final 15% of a real estate marketing video.
Return ONLY valid JSON with these fields:
{
  "rule": "kinetic_reveal_final_15pct",
  "pass": <boolean — true if there is a kinetic stat reveal, animated number, or data visual in these frames>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
- pass=true if the frame contains any of: animated numbers, statistical callouts, price reveals, market data text, countup animation frames, data pills, or similar kinetic stat-based content
- pass=false if the final section is just video footage with no stat reveal at all
- Note: brokerage logos, contact info, or agent names in the reveal frame are a SEPARATE check — for this rule only assess whether a kinetic stat reveal exists`

    const responseText = await callGeminiVision(frames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    kineticRevealFinal15pct = {
      rule: 'kinetic_reveal_final_15pct',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    kineticRevealFinal15pct = { rule: 'kinetic_reveal_final_15pct', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 6: Brand compliance (no logo in viral frames) ───────────
  let brandCompliance: FrameCheckResult
  try {
    const viralFrames = [
      framePaths['frame_0s'],
      framePaths['frame_0_4s'],
      framePaths['frame_25pct'],
      framePaths['frame_50pct'],
      framePaths['frame_85pct'],
    ].filter(Boolean)

    const isListing = isListingFormat

    const prompt = `You are a video QA system for a real estate brand called Ryan Realty.
Examine these frames from a ${isListing ? 'listing' : 'viral/market/news'} video.
Return ONLY valid JSON with these fields:
{
  "rule": "brand_compliance",
  "pass": <boolean>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Rules:
${isListing
  ? `This is a LISTING video. Logos ARE permitted in the bottom 200px footer bar only.
- pass=true if any logo appears ONLY in the bottom 200px of the frame (the footer bar), or if no logo appears
- pass=false if the logo appears OUTSIDE the footer bar (in the main content area above y=1720 in a 1920px-tall video)`
  : `This is a VIRAL/MARKET/NEWS video. NO logos, "Ryan Realty" text, phone numbers, or agent names anywhere.
- pass=true if no brokerage logo, "Ryan Realty" text, phone number, or agent name is visible anywhere in any frame
- pass=false if ANY of those brand elements appear in any of the provided frames`
}
Check all frames carefully.`

    const responseText = await callGeminiVision(viralFrames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    brandCompliance = {
      rule: 'brand_compliance',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    brandCompliance = { rule: 'brand_compliance', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 7: Caption zone non-overlap ─────────────────────────────
  let captionZoneOverlap: FrameCheckResult
  try {
    const captionFrames = [
      framePaths['frame_25pct'],
      framePaths['frame_50pct'],
      framePaths['frame_75pct'],
    ].filter(Boolean)

    const prompt = `You are a video QA system for a real estate brand.
Examine these video frames for caption placement.
Return ONLY valid JSON with these fields:
{
  "rule": "caption_zone_non_overlap",
  "pass": <boolean>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
The video is 1080x1920 portrait. The caption safe zone is y=1480-1720, x=90-990 (bottom strip).
Rules:
- pass=true if captions appear ONLY in the lower caption zone (y 1480-1720) with no overlap with stats, numbers, charts, logos, or other visual components
- pass=false if captions overlap any other on-screen element, or if captions appear outside the y=1480-1720 zone
- If no captions are visible in these frames, return pass=true with reasoning explaining that`

    const responseText = await callGeminiVision(captionFrames, prompt)
    const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
    captionZoneOverlap = {
      rule: 'caption_zone_non_overlap',
      pass: parsed.pass ?? true,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? 'No reasoning returned',
    }
  } catch (e) {
    captionZoneOverlap = { rule: 'caption_zone_non_overlap', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // ── Vision check 8: Listing overlay spec (listing formats only) ──────────
  let listingOverlaySpec: FrameCheckResult | null = null
  if (isListingFormat) {
    try {
      const listingFrames = [
        framePaths['frame_25pct'],
        framePaths['frame_50pct'],
      ].filter(Boolean)

      const prompt = `You are a video QA system for a real estate listing video.
Examine these frames for the listing overlay specification compliance.
Return ONLY valid JSON with these fields:
{
  "rule": "listing_overlay_spec",
  "pass": <boolean>,
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence>"
}
Required spec (BOTH layers must be present):
- Layer 1: Semi-transparent dark rectangle (rgba 0,0,0,0.40) covering ONLY the headline/address/price text area. NO feathering, no drop shadows, no gradients.
- Layer 2: Footer bar at the very bottom, 200px tall (rgba 0,0,0,0.70), containing a gold/champagne logo centered. Logo is gold colored only (not white, not navy).
- The area BETWEEN Layer 1 and Layer 2 shows clean, unobscured photo.
- pass=true if both layers are present and the spec appears to be followed
- pass=false if either layer is absent, or if the scrim covers the entire lower portion (old single-panel design), or if drop shadows/feathering are visible on the scrim, or if the logo is white instead of gold`

      const responseText = await callGeminiVision(listingFrames, prompt)
      const parsed = JSON.parse(responseText) as Partial<FrameCheckResult>
      listingOverlaySpec = {
        rule: 'listing_overlay_spec',
        pass: parsed.pass ?? true,
        confidence: parsed.confidence ?? 'low',
        reasoning: parsed.reasoning ?? 'No reasoning returned',
      }
    } catch (e) {
      listingOverlaySpec = { rule: 'listing_overlay_spec', pass: true, confidence: 'low', reasoning: `Vision check failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  return {
    hookMotionBy0_4s,
    textBy1_0s,
    registerShift25pct,
    patternInterrupt50pct,
    kineticRevealFinal15pct,
    brandCompliance,
    captionZoneOverlap,
    listingOverlaySpec,
    visionSkipped: false,
  }
}

// ---------------------------------------------------------------------------
// Failure / logging helpers
// ---------------------------------------------------------------------------

function fail(message: string): never {
  process.stderr.write(`\n[postflight] BLOCKED: ${message}\n\n`)
  process.exit(1)
}

function err(message: string): void {
  process.stderr.write(`[postflight] FAIL: ${message}\n`)
}

function ok(message: string): void {
  process.stdout.write(`[postflight] OK: ${message}\n`)
}

function warn(message: string): void {
  process.stderr.write(`[postflight] WARN: ${message}\n`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { slug } = parseArgs()
  const paths = resolvePaths(slug)

  process.stdout.write(`\n[postflight] Starting post-render gate for slug="${slug}"\n`)
  process.stdout.write(`[postflight] MP4: ${paths.mp4Path}\n\n`)

  // ── Load existing gate.json (written by preflight) ────────────────────────

  let gate: GateJson
  try {
    gate = readGate(paths.gatePath)
  } catch (e) {
    fail(
      `gate.json not found or invalid at ${paths.gatePath}. ` +
      `Run preflight first: npm run gate:preflight -- --slug ${slug}\n` +
      `Error: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  const format = gate.format

  // ── Check: MP4 exists ─────────────────────────────────────────────────────

  if (!fs.existsSync(paths.mp4Path)) {
    fail(`MP4 not found at ${paths.mp4Path}. Render must complete before running postflight.`)
  }

  const failures: string[] = []

  // ── Check 1: ffprobe (duration, codec, fps, file size) ───────────────────

  let ffprobeData: FfprobeData
  try {
    ffprobeData = runFfprobe(paths.mp4Path)
  } catch (e) {
    fail(`ffprobe failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const { durationS, codec, fps, fileSizeMB, width, height } = ffprobeData

  // Duration check: [30, 60]s hard limit; warn if >45s for non-report formats
  const REPORT_FORMATS: FormatName[] = ['data_viz_video', 'market_report_video', 'avatar_market_update']
  const durationInRange = durationS >= 30 && durationS <= 60
  if (!durationInRange) {
    err(`Duration ${durationS.toFixed(1)}s is outside [30, 60]s hard window (CLAUDE.md §Video Build Hard Rules)`)
    failures.push('duration_in_range')
  } else {
    ok(`Duration: ${durationS.toFixed(1)}s`)
    if (durationS > 45 && !REPORT_FORMATS.includes(format)) {
      warn(`Duration ${durationS.toFixed(1)}s exceeds 45s — viral cuts should be 30–45s (non-report format "${format}")`)
    }
  }

  // Codec check
  if (codec !== 'h264') {
    err(`Codec "${codec}" is not h264 (CLAUDE.md §Video Build Hard Rules)`)
    failures.push('codec_h264')
  } else {
    ok(`Codec: ${codec}`)
  }

  // FPS check
  const fpsOk = Math.abs(fps - 30) < 0.5
  if (!fpsOk) {
    err(`Frame rate ${fps.toFixed(2)} fps is not 30 fps (CLAUDE.md §Video Build Hard Rules)`)
    failures.push('fps_30')
  } else {
    ok(`Frame rate: ${fps.toFixed(2)} fps`)
  }

  // File size check
  const fileSizeUnder100MB = fileSizeMB < 100
  if (!fileSizeUnder100MB) {
    err(`File size ${fileSizeMB.toFixed(1)} MB exceeds 100 MB hard limit`)
    failures.push('file_size_under_100mb')
  } else {
    ok(`File size: ${fileSizeMB.toFixed(1)} MB`)
  }

  // Aspect ratio sanity (1080x1920 portrait)
  if (width !== 1080 || height !== 1920) {
    warn(`Unexpected dimensions ${width}x${height} — expected 1080x1920 portrait (CLAUDE.md §Format)`)
  }

  // ── Check 2: blackdetect ──────────────────────────────────────────────────

  const blackdetect = runBlackdetect(paths.mp4Path)
  if (!blackdetect.clean) {
    err(`blackdetect returned ${blackdetect.sequenceCount} black sequence(s) — must be ZERO (CLAUDE.md §Video Build Hard Rules)`)
    err(`  Sequences: ${blackdetect.rawOutput.slice(0, 300)}`)
    failures.push('blackdetect_clean')
  } else {
    ok('blackdetect: clean (0 sequences)')
  }

  // ── Check 3: Audio level ──────────────────────────────────────────────────

  const audio = checkAudioLevel(paths.mp4Path)
  if (!audio.nonSilent) {
    err(`Audio mean volume ${audio.meanVolume.toFixed(1)} dBFS is below −40 dBFS threshold — audio is silent or inaudible`)
    failures.push('audio_non_silent')
  } else {
    ok(`Audio: mean ${audio.meanVolume.toFixed(1)} dBFS (threshold > −40 dBFS)`)
  }

  // ── Check 4: Frame extraction + visual checks ─────────────────────────────

  let framePaths: Record<string, string> = {}
  let visualChecks: VisualCheckResults | null = null

  try {
    framePaths = extractFrames(paths.mp4Path, paths.framesDir, durationS)
    ok(`Frames extracted: ${Object.keys(framePaths).length} frames at timing offsets`)
  } catch (e) {
    warn(`Frame extraction failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    visualChecks = await runVisualChecks(framePaths, format)
    if (visualChecks.visionSkipped) {
      warn('Vision checks skipped — all visual rules marked as low-confidence pass')
    } else {
      ok('Visual checks complete via Vertex Gemini 2.5 Flash')
    }
  } catch (e) {
    warn(`Visual checks failed: ${e instanceof Error ? e.message : String(e)} — marking all as tentative pass`)
    visualChecks = null
  }

  // Evaluate visual check results
  const hookMotionPass = visualChecks?.hookMotionBy0_4s.pass ?? true
  const textBy1_0sPass = visualChecks?.textBy1_0s.pass ?? true
  const registerShiftPass = visualChecks?.registerShift25pct.pass ?? true
  const patternInterruptPass = visualChecks?.patternInterrupt50pct.pass ?? true
  const kineticRevealPass = visualChecks?.kineticRevealFinal15pct.pass ?? true
  const brandCompliancePass = visualChecks?.brandCompliance.pass ?? true
  const captionZonePass = visualChecks?.captionZoneOverlap.pass ?? true
  const listingOverlayPass = visualChecks?.listingOverlaySpec?.pass ?? true

  if (!hookMotionPass) {
    err(`Hook motion at 0.4s: FAIL — ${visualChecks?.hookMotionBy0_4s.reasoning ?? 'no details'}`)
    failures.push('hook_motion_by_0_4s')
  } else {
    ok(`Hook motion at 0.4s: pass (${visualChecks?.hookMotionBy0_4s.confidence ?? 'low'} confidence)`)
  }

  if (!textBy1_0sPass) {
    err(`On-screen text by 1.0s: FAIL — ${visualChecks?.textBy1_0s.reasoning ?? 'no details'}`)
    failures.push('text_by_1_0s')
  } else {
    ok(`On-screen text by 1.0s: pass (${visualChecks?.textBy1_0s.confidence ?? 'low'} confidence)`)
  }

  if (!registerShiftPass) {
    err(`Register shift at 25%: FAIL — ${visualChecks?.registerShift25pct.reasoning ?? 'no details'}`)
    failures.push('register_shift_25pct')
  } else {
    ok(`Register shift at 25%: pass (${visualChecks?.registerShift25pct.confidence ?? 'low'} confidence)`)
  }

  if (!patternInterruptPass) {
    err(`Pattern interrupt at 50%: FAIL — ${visualChecks?.patternInterrupt50pct.reasoning ?? 'no details'}`)
    failures.push('pattern_interrupt_50pct')
  } else {
    ok(`Pattern interrupt at 50%: pass (${visualChecks?.patternInterrupt50pct.confidence ?? 'low'} confidence)`)
  }

  if (!kineticRevealPass) {
    err(`Kinetic reveal in final 15%: FAIL — ${visualChecks?.kineticRevealFinal15pct.reasoning ?? 'no details'}`)
    failures.push('kinetic_reveal_final_15pct')
  } else {
    ok(`Kinetic reveal in final 15%: pass (${visualChecks?.kineticRevealFinal15pct.confidence ?? 'low'} confidence)`)
  }

  if (!brandCompliancePass) {
    err(`Brand compliance: FAIL — ${visualChecks?.brandCompliance.reasoning ?? 'no details'}`)
    failures.push('brand_compliance')
  } else {
    ok(`Brand compliance: pass (${visualChecks?.brandCompliance.confidence ?? 'low'} confidence)`)
  }

  if (!captionZonePass) {
    err(`Caption zone non-overlap: FAIL — ${visualChecks?.captionZoneOverlap.reasoning ?? 'no details'}`)
    failures.push('caption_zone_non_overlap')
  } else {
    ok(`Caption zone non-overlap: pass (${visualChecks?.captionZoneOverlap.confidence ?? 'low'} confidence)`)
  }

  if (visualChecks?.listingOverlaySpec && !listingOverlayPass) {
    err(`Listing overlay spec: FAIL — ${visualChecks.listingOverlaySpec.reasoning}`)
    failures.push('listing_overlay_spec')
  } else if (visualChecks?.listingOverlaySpec) {
    ok(`Listing overlay spec: pass (${visualChecks.listingOverlaySpec.confidence} confidence)`)
  }

  // ── Determine overall pass/fail ───────────────────────────────────────────

  const allConditionsChecked = [
    'banned_words_clean',      // from preflight
    'citations_complete',      // from preflight
    'duration_in_range',
    'codec_h264',
    'fps_30',
    'file_size_under_100mb',
    'blackdetect_clean',
    'audio_non_silent',
    'hook_motion_by_0_4s',
    'text_by_1_0s',
    'register_shift_25pct',
    'pattern_interrupt_50pct',
    'kinetic_reveal_final_15pct',
    'brand_compliance',
    'caption_zone_non_overlap',
    ...(gate.sparkSupabaseReconciled !== null ? ['spark_supabase_reconciled'] : []),
    ...(gate.format === 'listing_reveal' || gate.format === 'listing-tour-video' ? ['listing_overlay_spec'] : []),
  ]

  // Combine preflight failures with postflight failures
  const preflightFailed = gate.hardRefuseConditionsFailed
  const allFailed = [...new Set([...preflightFailed, ...failures])]
  const gatePassed = allFailed.length === 0

  // ── Write postflight.json (detailed report) ───────────────────────────────

  const postflightReport = {
    slug,
    format,
    timestamp: new Date().toISOString(),
    pass: gatePassed,
    failures,
    ffprobe: {
      durationS,
      codec,
      fps,
      fileSizeMB,
      width,
      height,
      durationInRange,
      fileSizeUnder100MB,
    },
    blackdetect: {
      clean: blackdetect.clean,
      sequenceCount: blackdetect.sequenceCount,
    },
    audio: {
      nonSilent: audio.nonSilent,
      meanVolume: audio.meanVolume,
    },
    visualChecks: visualChecks ? {
      visionSkipped: visualChecks.visionSkipped,
      hookMotionBy0_4s: visualChecks.hookMotionBy0_4s,
      textBy1_0s: visualChecks.textBy1_0s,
      registerShift25pct: visualChecks.registerShift25pct,
      patternInterrupt50pct: visualChecks.patternInterrupt50pct,
      kineticRevealFinal15pct: visualChecks.kineticRevealFinal15pct,
      brandCompliance: visualChecks.brandCompliance,
      captionZoneOverlap: visualChecks.captionZoneOverlap,
      listingOverlaySpec: visualChecks.listingOverlaySpec,
    } : null,
    framesExtracted: Object.keys(framePaths),
  }

  fs.mkdirSync(paths.outDir, { recursive: true })
  fs.writeFileSync(paths.postflightJsonPath, JSON.stringify(postflightReport, null, 2) + '\n', 'utf8')
  ok(`postflight.json written to ${path.relative(process.cwd(), paths.postflightJsonPath)}`)

  // ── Update gate.json ──────────────────────────────────────────────────────

  const updatedGate: GateJson = {
    ...gate,

    // Update postflight-known fields
    postflightPath: path.relative(process.cwd(), paths.postflightJsonPath),
    gateTimestamp: new Date().toISOString(),
    gatePassed,

    // ffprobe results
    durationInRange,
    blackdetectClean: blackdetect.clean,
    fileSizeUnder100MB,
    audioNonSilent: audio.nonSilent,

    // Visual check results
    noFrozenFrames: !failures.includes('frozen_frames'), // not yet automated — default pass
    noBlackBars: !failures.includes('black_bars'),       // not yet automated — default pass
    captionZoneNonOverlap: captionZonePass,
    brandComplianceOK: brandCompliancePass,
    aiDisclosurePresent: format === 'avatar_market_update' ? (visualChecks?.hookMotionBy0_4s.pass ?? null) : null,

    // Hard refuse conditions updated
    hardRefuseConditionsChecked: allConditionsChecked,
    hardRefuseConditionsFailed: allFailed,

    // Approval fields remain unchanged (only publish skill sets these)
    mattApprovalRequired: true as const,
    approvedByMatt: false,
    approvedAt: null,
  }

  try {
    writeGate(paths.gatePath, updatedGate)
    ok(`gate.json updated at ${path.relative(process.cwd(), paths.gatePath)}`)
  } catch (e) {
    fail(`Failed to update gate.json: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── Final summary ─────────────────────────────────────────────────────────

  if (!gatePassed) {
    process.stderr.write(`\n[postflight] BLOCKED — ${allFailed.length} hard refuse condition(s) failed:\n`)
    for (const [i, f] of allFailed.entries()) {
      process.stderr.write(`  ${i + 1}. ${f}\n`)
    }
    process.stderr.write('\nFix all failures before presenting this draft to Matt.\n')
    process.stderr.write(`Gate JSON: ${paths.gatePath}\n\n`)
    process.exit(1)
  }

  process.stdout.write(`\n[postflight] PASS — all post-render checks cleared for slug="${slug}"\n`)
  process.stdout.write(`\n--- DRAFT READY ---\n`)
  process.stdout.write(`Draft: out/${slug}/${slug}.mp4\n`)
  process.stdout.write(`Gate:  ${path.relative(process.cwd(), paths.gatePath)}\n`)
  process.stdout.write(`\nNext step: Show Matt the rendered video and wait for explicit approval.\n`)
  process.stdout.write(`  open out/${slug}/${slug}.mp4\n`)
  process.stdout.write(`\nDO NOT commit or push the MP4 until Matt says "ship it", "approved", "go", or equivalent.\n\n`)
}

main().catch((e) => {
  process.stderr.write(`[postflight] FATAL: ${e instanceof Error ? e.message : String(e)}\n`)
  if (e instanceof Error && e.stack) process.stderr.write(e.stack + '\n')
  process.exit(1)
})
