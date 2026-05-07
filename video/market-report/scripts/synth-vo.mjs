#!/usr/bin/env node
// Synth ONE continuous ElevenLabs voiceover per city, then derive beat
// boundaries from the alignment by finding trigger phrases in the word stream.
//
// REWRITTEN 2026-05-07 (Matt directive — VO must flow continuously, not be
// stitched together from per-segment chunks). Old version made 11 separate
// /with-timestamps calls and ffmpeg-concat'd the mp3s — that's where the
// choppiness came from.
//
// New flow:
//   1. Read out/<slug>/script.json → { fullText, beatTriggers }.
//   2. POST fullText to ElevenLabs /with-timestamps in ONE call.
//      Returns { audio_base64, alignment } where alignment is character-level.
//   3. alignmentToWords() collapses chars → words with start/end seconds.
//      Whole stream is continuous — Victoria's natural pacing, no joins.
//   4. For each beat trigger, find the first word that starts the trigger
//      phrase. The diff between consecutive trigger word starts = beat duration.
//   5. Write voiceover.mp3 (single file), update props.json with captionWords
//      and beatDurations.
//
// Run: node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/synth-vo.mjs

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as dnsP } from 'node:dns'
import { Buffer } from 'node:buffer'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'out')
const PUB = resolve(ROOT, 'public')

const KEY = process.env.ELEVENLABS_API_KEY
const VOICE = 'qSeXEcewz7tA0Q0qk9fH' // Victoria — locked per Matt 2026-04-27.
if (VOICE !== 'qSeXEcewz7tA0Q0qk9fH') { console.error(`WRONG VOICE: ${VOICE}`); process.exit(1) }
if (!KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1) }

const HOST = 'api.elevenlabs.io'
const HOST_IPS = await dnsP.resolve4(HOST)
console.log(`Resolved ${HOST} → ${HOST_IPS.join(', ')}`)
let ipIdx = 0
const nextIP = () => HOST_IPS[ipIdx++ % HOST_IPS.length]

const ALL_CITIES = ['bend', 'redmond', 'sisters', 'la-pine', 'prineville', 'sunriver']
const CITY_FILTER = process.env.CITY ? process.env.CITY.split(',').map(s => s.trim()) : null
const CITIES = CITY_FILTER ? ALL_CITIES.filter(c => CITY_FILTER.includes(c)) : ALL_CITIES

// Conversational Victoria settings (Matt directive 2026-05-07).
// stability 0.40 → more expression. similarity 0.80 → stronger voice ID.
// style 0.50 → dynamic delivery. speaker_boost on.
async function elSynth(fullText) {
  const body = {
    text: fullText,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: { stability: 0.40, similarity_boost: 0.80, style: 0.50, use_speaker_boost: true },
  }
  const url = `https://${HOST}/v1/text-to-speech/${VOICE}/with-timestamps`
  const tmpFile = `/tmp/el_${Date.now()}_${Math.random().toString(36).slice(2)}.json`
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
      await rm(tmpFile, { force: true })
      return parsed
    } catch (e) {
      if (attempt === 4) { await rm(tmpFile, { force: true }); throw new Error(`elevenlabs synth fail: ${e.message}`) }
      await new Promise(r => setTimeout(r, 800 * attempt))
    }
  }
}

// Collapse char-level alignment → word-level. Strips trailing punctuation
// from word.text so caption rendering is clean.
function alignmentToWords(alignment) {
  const chars = alignment.characters
  const starts = alignment.character_start_times_seconds
  const ends = alignment.character_end_times_seconds
  const words = []
  let buf = ''
  let bufStart = null
  let bufEnd = null
  const flush = () => {
    if (buf.trim()) {
      words.push({
        text: buf.trim(),
        startSec: bufStart,
        endSec: bufEnd,
      })
    }
    buf = ''; bufStart = null; bufEnd = null
  }
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (/\s/.test(ch)) {
      flush()
    } else {
      if (bufStart === null) bufStart = starts[i]
      bufEnd = ends[i]
      buf += ch
    }
  }
  flush()
  return words
}

// Find the first word index where a trigger phrase begins (case-insensitive,
// punctuation-tolerant). Used to derive beat boundaries from the continuous
// word stream.
function findTriggerWordIdx(words, triggerPhrase, startIdx = 0) {
  if (!triggerPhrase) return startIdx
  const triggerWords = triggerPhrase.toLowerCase().split(/\s+/)
  const norm = (s) => s.toLowerCase().replace(/[.,;:!?"']/g, '')
  for (let i = startIdx; i <= words.length - triggerWords.length; i++) {
    let match = true
    for (let j = 0; j < triggerWords.length; j++) {
      if (norm(words[i + j].text) !== norm(triggerWords[j])) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

async function mp3Duration(path) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path])
  return parseFloat(stdout.trim())
}

await mkdir(PUB, { recursive: true })

for (const slug of CITIES) {
  console.log(`\n=== ${slug} ===`)
  const cityOut = resolve(OUT, slug)
  const cityPub = resolve(PUB, slug)
  await mkdir(cityPub, { recursive: true })

  const script = JSON.parse(await readFile(resolve(cityOut, 'script.json'), 'utf8'))
  const propsPath = resolve(cityOut, 'props.json')
  const props = JSON.parse(await readFile(propsPath, 'utf8'))

  process.stdout.write(`  Synthing ${script.fullText.length} chars in ONE continuous call... `)
  const r = await elSynth(script.fullText)
  const finalMp3 = resolve(cityPub, 'voiceover.mp3')
  await writeFile(finalMp3, Buffer.from(r.audio_base64, 'base64'))
  const finalDur = await mp3Duration(finalMp3)
  const words = alignmentToWords(r.alignment)
  console.log(`${finalDur.toFixed(2)}s, ${words.length} words`)

  // ─────────────────────────────────────────────────────────────────────────
  //  Beat boundaries from trigger phrases
  // ─────────────────────────────────────────────────────────────────────────
  // For each beat trigger, find its starting word in the continuous stream.
  // Beat duration = startSec(next trigger) - startSec(this trigger), with the
  // last beat running to the end of audio.
  const beatStartSecs = []
  let searchFrom = 0
  for (const beat of script.beatTriggers) {
    if (beat.triggerPhrase === null) {
      beatStartSecs.push(0)
      continue
    }
    const idx = findTriggerWordIdx(words, beat.triggerPhrase, searchFrom)
    if (idx === -1) {
      console.warn(`  WARNING: trigger "${beat.triggerPhrase}" not found in alignment for ${slug}`)
      beatStartSecs.push(beatStartSecs[beatStartSecs.length - 1] + 5.0) // fallback
    } else {
      beatStartSecs.push(words[idx].startSec)
      searchFrom = idx + 1
    }
  }

  // Compute per-beat durations. Add a small tail after the last word so the
  // outro doesn't cut on the final consonant.
  const VO_TAIL_PAD = 0.6
  const totalDuration = finalDur + VO_TAIL_PAD
  const beatDurations = []
  for (let i = 0; i < beatStartSecs.length; i++) {
    const start = beatStartSecs[i]
    const end = i + 1 < beatStartSecs.length ? beatStartSecs[i + 1] : totalDuration
    beatDurations.push(Math.max(2.0, end - start))
  }

  // Sanity check: render must not exceed 60s ceiling per CLAUDE.md.
  const total = beatDurations.reduce((s, x) => s + x, 0)
  console.log(`  Beat durations:`, beatDurations.map(d => d.toFixed(1)).join(', '), `→ ${total.toFixed(1)}s`)
  if (total > 62) console.warn(`  WARNING: ${slug} total ${total.toFixed(1)}s exceeds 62s ceiling`)
  if (total < 30) console.warn(`  WARNING: ${slug} total ${total.toFixed(1)}s under 30s minimum`)

  props.voPath = `${slug}/voiceover.mp3`
  props.captionWords = words
  props.beatDurations = beatDurations
  await writeFile(propsPath, JSON.stringify(props, null, 2))
  await writeFile(resolve(cityOut, 'alignment.json'), JSON.stringify({
    city: script.city,
    total_duration_sec: finalDur,
    fullText: script.fullText,
    words,
    beatStartSecs,
    beatDurations,
    beatTriggers: script.beatTriggers,
  }, null, 2))
  console.log(`  ${words.length} captionWords, VO ${finalDur.toFixed(2)}s, total beats ${total.toFixed(2)}s`)
}

console.log('\nAll cities synthed. Next: npm run render -- --city=<slug>')
