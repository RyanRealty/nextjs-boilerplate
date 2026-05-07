#!/usr/bin/env node
// Synthesize ONE continuous ElevenLabs voiceover for the weekend-events video.
// Mirrors video/market-report/scripts/synth-vo.mjs exactly.
//
// Flow:
//   1. Read out/<SLUG>/script.json  → { fullText, beatSentences }
//   2. POST to ElevenLabs /with-timestamps in ONE call → { audio_base64, alignment }
//   3. alignmentToWords() collapses chars → words with start/end seconds.
//   4. Beat boundaries from cumulative word counts (beatSentences lengths).
//      Beat 0 (intro) and Beat 6 (outro) are silent — they are NOT in beatSentences.
//   5. Write public/voiceover.mp3, update out/<SLUG>/props.json.
//
// Voice: Victoria qSeXEcewz7tA0Q0qk9fH — LOCKED. Do not change.
// Model: eleven_turbo_v2_5
// Settings: stability 0.40, similarity_boost 0.80, style 0.50, use_speaker_boost true
//
// Usage:
//   node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/synth-vo.mjs
//   SLUG=weekend-events-2026-05 node --env-file=... scripts/synth-vo.mjs

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as dnsP } from 'node:dns'
import { Buffer } from 'node:buffer'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const KEY   = process.env.ELEVENLABS_API_KEY
const VOICE = 'qSeXEcewz7tA0Q0qk9fH' // Victoria — LOCKED per Matt 2026-04-27.
if (VOICE !== 'qSeXEcewz7tA0Q0qk9fH') { console.error(`WRONG VOICE: ${VOICE}`); process.exit(1) }
if (!KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1) }

const SLUG     = process.env.SLUG || 'weekend-events-2026-05'
const DATA_DIR = resolve(ROOT, 'data', SLUG)  // source-of-truth (committed)
const OUT_DIR  = resolve(ROOT, 'out', SLUG)   // working files (gitignored)
const PUB_DIR  = resolve(ROOT, 'public')

const HOST     = 'api.elevenlabs.io'
const HOST_IPS = await dnsP.resolve4(HOST)
console.log(`Resolved ${HOST} → ${HOST_IPS.join(', ')}`)
let ipIdx = 0
const nextIP = () => HOST_IPS[ipIdx++ % HOST_IPS.length]

async function elSynth(fullText) {
  const body = {
    text: fullText,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: { stability: 0.40, similarity_boost: 0.80, style: 0.50, use_speaker_boost: true },
  }
  const url = `https://${HOST}/v1/text-to-speech/${VOICE}/with-timestamps`
  const tmpFile = `/tmp/el_we_${Date.now()}.json`
  await writeFile(tmpFile, JSON.stringify(body))
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ip = nextIP()
    try {
      const { stdout } = await exec('curl', [
        '-sS', '-m', '180', '--connect-timeout', '15',
        '--resolve', `${HOST}:443:${ip}`,
        '-H', `xi-api-key: ${KEY}`,
        '-H', 'Content-Type: application/json',
        '-H', 'Accept: application/json',
        '-X', 'POST',
        '--data-binary', `@${tmpFile}`,
        url,
      ], { maxBuffer: 256 * 1024 * 1024 })
      const parsed = JSON.parse(stdout)
      if (parsed.detail) throw new Error(`elevenlabs: ${JSON.stringify(parsed.detail)}`)
      if (!parsed.audio_base64 || !parsed.alignment) throw new Error('missing audio_base64/alignment')
      try { const { rm } = await import('node:fs/promises'); await rm(tmpFile, { force: true }) } catch {}
      return parsed
    } catch (e) {
      if (attempt === 4) throw new Error(`elevenlabs synth fail: ${e.message}`)
      await new Promise(r => setTimeout(r, 800 * attempt))
    }
  }
}

function alignmentToWords(alignment) {
  const chars  = alignment.characters
  const starts = alignment.character_start_times_seconds
  const ends   = alignment.character_end_times_seconds
  const words  = []
  let buf = '', bufStart = null, bufEnd = null
  const flush = () => {
    if (buf.trim()) words.push({ text: buf.trim(), startSec: bufStart, endSec: bufEnd })
    buf = ''; bufStart = null; bufEnd = null
  }
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) { flush() }
    else {
      if (bufStart === null) bufStart = starts[i]
      bufEnd = ends[i]
      buf += chars[i]
    }
  }
  flush()
  return words
}

function countWords(sentence) {
  return sentence.trim().split(/\s+/).filter(Boolean).length
}

async function mp3Duration(path) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path])
  return parseFloat(stdout.trim())
}

await mkdir(OUT_DIR, { recursive: true })
await mkdir(PUB_DIR, { recursive: true })

// script.json lives in data/ (source of truth, committed).
// props.json lives in out/ (built by build-props.mjs, extended by fetch-images.mjs and this script).
const script = JSON.parse(await readFile(resolve(DATA_DIR, 'script.json'), 'utf8'))
const propsPath = resolve(OUT_DIR, 'props.json')
let props
try {
  props = JSON.parse(await readFile(propsPath, 'utf8'))
} catch {
  console.error(`Missing ${propsPath} — run 'node scripts/build-props.mjs && node scripts/fetch-images.mjs' first.`)
  process.exit(1)
}

// Beat 0 (intro) and Beat 6 (outro) are silent — not in beatSentences.
// beatSentences has 5 entries (one per event beat).
if (script.beatSentences.length !== 5) {
  console.warn(`WARNING: expected 5 beatSentences, got ${script.beatSentences.length}`)
}

process.stdout.write(`Synthing ${script.fullText.length} chars in ONE continuous call... `)
const r = await elSynth(script.fullText)
const finalMp3 = resolve(PUB_DIR, 'voiceover.mp3')
await writeFile(finalMp3, Buffer.from(r.audio_base64, 'base64'))
const finalDur = await mp3Duration(finalMp3)
const words = alignmentToWords(r.alignment)
console.log(`${finalDur.toFixed(2)}s, ${words.length} words`)

// Derive beat boundaries from cumulative word counts.
// beatSentences covers beats 1-5 only.
const beatStartSecs = []
let cumWordIdx = 0
for (let i = 0; i < script.beatSentences.length; i++) {
  beatStartSecs.push(cumWordIdx < words.length ? words[cumWordIdx].startSec : (beatStartSecs[beatStartSecs.length - 1] ?? 0) + 5.0)
  cumWordIdx += countWords(script.beatSentences[i].sentence)
}

const VO_TAIL_PAD = 0.6
const totalDuration = finalDur + VO_TAIL_PAD

// Compute durations for beats 1-5.
const voBeatDurations = []
for (let i = 0; i < beatStartSecs.length; i++) {
  const start = beatStartSecs[i]
  const end   = i + 1 < beatStartSecs.length ? beatStartSecs[i + 1] : totalDuration
  voBeatDurations.push(Math.max(2.0, end - start))
}

// Full beatDurations = [intro_sec, ...voBeatDurations, outro_sec]
const INTRO_SEC = 3.0
const OUTRO_SEC = 2.5
const beatDurations = [INTRO_SEC, ...voBeatDurations, OUTRO_SEC]

const total = beatDurations.reduce((s, x) => s + x, 0)
console.log('Beat durations:', beatDurations.map(d => d.toFixed(1)).join(', '), `→ ${total.toFixed(1)}s`)
if (total > 62) console.warn(`WARNING: total ${total.toFixed(1)}s exceeds 62s ceiling`)
if (total < 26) console.warn(`WARNING: total ${total.toFixed(1)}s under 26s minimum`)

// voPath is relative to public/
props.voPath = 'voiceover.mp3'
props.captionWords = words
props.beatDurations = beatDurations
await writeFile(propsPath, JSON.stringify(props, null, 2))
await writeFile(resolve(OUT_DIR, 'alignment.json'), JSON.stringify({
  slug: SLUG,
  total_duration_sec: finalDur,
  fullText: script.fullText,
  words,
  beatStartSecs,
  beatDurations,
  beatSentences: script.beatSentences,
}, null, 2))

console.log(`\n${words.length} captionWords, VO ${finalDur.toFixed(2)}s, total beats ${total.toFixed(2)}s`)
console.log('Next: node scripts/render-all.mjs')
