import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'
import { CaptionBand, CaptionWord as LegacyCaptionWord } from './CaptionBand'
import { KineticCaptions, CaptionWord } from './KineticCaptions'
import { IntroBeat } from './IntroBeat'
import { OutroBeat } from './OutroBeat'
import { StatBeat, StatBeatProps } from './StatBeat'
import { FPS, INTRO_SEC, OUTRO_SEC, STAT_SEC } from './brand'
import { loadFonts } from './fonts'

// Re-export for callers (Root.tsx etc.)
export type { CaptionWord } from './KineticCaptions'

export type MarketReportInput = {
  city: string
  period: string
  subhead: string
  /** Optional eyebrow text for the intro card. If absent, falls back to "Central Oregon" (legacy). */
  eyebrow?: string
  /** slug used for image paths e.g. "bend" → public/bend/img_N.jpg */
  citySlug?: string
  /**
   * Stat beats that play BEFORE the intro/title card. Used for a "Hook" scene that
   * needs to land in the first 0-3s window. Optional — most reports leave this empty.
   */
  preIntroStats?: Array<Omit<StatBeatProps, 'index' | 'total' | 'imageSrc' | 'durationInFrames'> & {
    image_idx?: number
  }>
  stats: Array<Omit<StatBeatProps, 'index' | 'total' | 'imageSrc' | 'durationInFrames'> & {
    /** Optional 1-based image index override (1..7). If absent, cycles. */
    image_idx?: number
  }>
  voPath: string
  captionWords: CaptionWord[]
  /**
   * Per-beat durations in seconds.
   * Length = preIntroStats.length + 1 (intro) + stats.length + 1 (outro).
   * If absent, falls back to fixed INTRO_SEC / STAT_SEC / OUTRO_SEC constants.
   */
  beatDurations?: number[]
  /** How many distinct images live in public/<citySlug>/ — defaults to 7 */
  imageCount?: number
  /** Use the legacy CaptionBand instead of KineticCaptions (for back-compat shorts) */
  useLegacyCaptions?: boolean
}

const toFrames = (sec: number) => Math.max(1, Math.round(sec * FPS))

export const computeDurationFrames = (input: MarketReportInput): number => {
  const beats = computeBeatFrames(input)
  return beats.reduce((s, x) => s + x, 0)
}

export const computeBeatFrames = (input: MarketReportInput): number[] => {
  const preCount = input.preIntroStats?.length ?? 0
  const expected = preCount + 1 + input.stats.length + 1
  if (input.beatDurations && input.beatDurations.length === expected) {
    return input.beatDurations.map(toFrames)
  }
  // Fallback constants
  return [
    ...Array(preCount).fill(0).map(() => toFrames(STAT_SEC)),
    toFrames(INTRO_SEC),
    ...input.stats.map(() => toFrames(STAT_SEC)),
    toFrames(OUTRO_SEC),
  ]
}

/**
 * Map beat index → image filename.
 * Beat 0 = intro → img_2 (or override via image_idx in props)
 * Beats 1..N (stats) → cycle through img_1..img_<imageCount>
 * Outro → img_1
 */
function beatImageSrc(
  citySlug: string,
  beatIndex: number,
  totalBeats: number,
  imageCount: number,
  explicitIdx?: number,
): string {
  if (explicitIdx && explicitIdx >= 1 && explicitIdx <= imageCount) {
    return `${citySlug}/img_${explicitIdx}.jpg`
  }
  if (beatIndex === 0) return `${citySlug}/img_2.jpg`
  if (beatIndex === totalBeats - 1) return `${citySlug}/img_1.jpg`
  // stat beats 1..N cycle through img_1..img_<imageCount>
  const imgIdx = ((beatIndex - 1) % imageCount) + 1
  return `${citySlug}/img_${imgIdx}.jpg`
}

export const MarketReport: React.FC<MarketReportInput> = (input) => {
  const {
    city, period, subhead, eyebrow, citySlug, stats, voPath, captionWords,
    imageCount = 7, useLegacyCaptions = false,
    preIntroStats = [],
  } = input
  void loadFonts()

  const { durationInFrames: totalFrames } = useVideoConfig()
  const beats = computeBeatFrames(input)
  const totalBeats = beats.length
  const totalStatCount = preIntroStats.length + stats.length

  // Derive slug from city name if not provided
  const slug = citySlug || city.toLowerCase().replace(/\s+/g, '-')

  let cursor = 0
  const preFrames = beats.slice(0, preIntroStats.length)
  const intro = beats[preIntroStats.length]
  const outro = beats[beats.length - 1]
  const statFrames = beats.slice(preIntroStats.length + 1, preIntroStats.length + 1 + stats.length)

  // Music volume retained for back-compat (currently dead — Audio is commented out)
  const outroStartFrame = totalFrames - outro
  const swellStartFrame = outroStartFrame + 15
  const _musicVolume = (f: number) => interpolate(
    f,
    [swellStartFrame, swellStartFrame + 45],
    [0.18, 0.30],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Caption suppression: invisible during the entire outro to keep the CTA clean.
  const outroSuppressRange: [number, number] = [outroStartFrame, totalFrames]

  // Helper to render a stat at given beat index (for image cycling)
  let runningIdx = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A1A2E' }}>
      {/* VO */}
      {voPath ? <Audio src={staticFile(voPath)} /> : null}

      {/* MUSIC DISABLED — Matt rule: VO only, no background music ever */}
      {/*
      <Audio
        src={staticFile('audio/music_bed.mp3')}
        volume={_musicVolume}
        loop
      />
      */}

      {/* Pre-intro stats (Scene 0 HOOK lives here) */}
      {preIntroStats.map((s, i) => {
        const f = preFrames[i]
        const beatIdx = i + 1 // skip slot 0 reserved for backwards-compat (intro at slot 0 in old comps)
        const imgSrc = beatImageSrc(slug, beatIdx, totalBeats, imageCount, s.image_idx)
        runningIdx += 1
        const seq = (
          <Sequence key={`pre-${i}`} from={cursor} durationInFrames={f}>
            <StatBeat
              {...s}
              index={runningIdx}
              total={totalStatCount}
              imageSrc={imgSrc}
              durationInFrames={f}
            />
          </Sequence>
        )
        cursor += f
        return seq
      })}

      {/* Intro beat */}
      <Sequence from={cursor} durationInFrames={intro}>
        <IntroBeat
          city={city}
          period={period}
          subhead={subhead}
          eyebrow={eyebrow}
          citySlug={slug}
          durationInFrames={intro}
        />
      </Sequence>
      {(cursor += intro, null)}

      {/* Stat sub-beats */}
      {stats.map((s, i) => {
        const f = statFrames[i]
        const beatIdx = preIntroStats.length + i + 2 // intro takes one slot
        const imgSrc = beatImageSrc(slug, beatIdx, totalBeats, imageCount, s.image_idx)
        runningIdx += 1
        const seq = (
          <Sequence key={`stat-${i}`} from={cursor} durationInFrames={f}>
            <StatBeat
              {...s}
              index={runningIdx}
              total={totalStatCount}
              imageSrc={imgSrc}
              durationInFrames={f}
            />
          </Sequence>
        )
        cursor += f
        return seq
      })}

      {/* Outro */}
      <Sequence from={cursor} durationInFrames={outro}>
        <OutroBeat
          city={city}
          imageSrc={beatImageSrc(slug, totalBeats - 1, totalBeats, imageCount)}
          durationInFrames={outro}
        />
      </Sequence>

      {/* Caption band — always on top; KineticCaptions by default, legacy CaptionBand if asked */}
      {useLegacyCaptions ? (
        <CaptionBand words={captionWords as unknown as LegacyCaptionWord[]} />
      ) : (
        <KineticCaptions
          words={captionWords}
          suppressFrames={[outroSuppressRange]}
        />
      )}
    </AbsoluteFill>
  )
}
