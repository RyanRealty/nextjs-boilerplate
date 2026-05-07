/**
 * YouTubeMarketReport — 1920x1080 long-form market report composition.
 *
 * 10-chapter structure per youtube-long-form-market-report/SKILL.md §3:
 *   Ch 1  0:00-0:45   Cold open + hook
 *   Ch 2  0:45-2:00   Median sale price + 4-year history
 *   Ch 3  2:00-3:15   Price segments histogram
 *   Ch 4  3:15-4:15   Months of supply + market verdict
 *   Ch 5  4:15-5:30   Days on market distribution
 *   Ch 6  5:30-6:30   Sale-to-list + concessions
 *   Ch 7  6:30-7:45   Cash buyers + affordability
 *   Ch 8  7:45-9:00   Top neighborhoods leaderboard
 *   Ch 9  9:00-10:30  Agent commentary / takeaway
 *   Ch 10 10:30-11:15 CTA + closing card
 *
 * Caption zone: y 920-1040 (landscape). Suppressed during Ch 10 outro.
 * Hero number scale: 320px. Chart widths: 1620px.
 * Voice: Victoria. Brand: NAVY #102742 / GOLD #D4AF37 / Amboqia / Geist.
 */

import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion'
import { KineticCaptions, CaptionWord } from './KineticCaptions'
import { IntroScene } from './scenes/IntroScene'
import { StatScene, StatSceneProps } from './scenes/StatScene'
import { OutroScene } from './scenes/OutroScene'
import { FPS } from './brand'
import { loadFonts } from './fonts'

// Re-export for callers
export type { CaptionWord }
export type { StatSceneProps }

export type ChapterDef = {
  /** Duration of this chapter in seconds */
  durationSec: number
  /** Chapter title shown in transition tag */
  title: string
}

export type YouTubeMarketReportInput = {
  city: string
  period: string
  subhead: string
  eyebrow?: string
  citySlug?: string
  marketHealthLabel?: string
  medianPriceDisplay?: string

  /** Path to the single continuous voiceover MP3 (relative to public/) */
  voPath: string
  /** Word-level caption data from ElevenLabs forced alignment */
  captionWords: CaptionWord[]

  /**
   * Chapter durations in seconds. Length must be 10 (one per chapter).
   * Computed from synth-vo-long.mjs using VO word timings.
   * Default: [45, 75, 75, 60, 75, 60, 75, 75, 90, 45] = 675s = 11:15.
   */
  chapterDurations?: number[]

  /**
   * Chapter stat beats — one entry per chapter 2-9 (8 chapters).
   * Ch 1 (intro) and Ch 10 (outro) are fixed scenes.
   * Index 0 = Ch 2, index 7 = Ch 9.
   */
  chapters: Array<Omit<StatSceneProps, 'chapterNumber' | 'chapterTitle' | 'imageSrc' | 'durationInFrames'> & {
    /** Optional explicit image index (1-based) from public/<citySlug>/ */
    image_idx?: number
    /** Override chapter title in the transition tag */
    chapterTitle?: string
  }>

  /** How many distinct images live in public/<citySlug>/ — defaults to 15 */
  imageCount?: number
}

const DEFAULT_CHAPTER_TITLES = [
  'Cold Open',                        // Ch 1 (intro)
  'Median Sale Price',                // Ch 2
  'Price Segments',                   // Ch 3
  'Months of Supply',                 // Ch 4
  'Days on Market',                   // Ch 5
  'Sale-to-List + Concessions',       // Ch 6
  'Cash Buyers + Affordability',      // Ch 7
  'Top Neighborhoods',                // Ch 8
  'What This Means',                  // Ch 9
  'Get the Full Report',              // Ch 10 (outro)
]

const DEFAULT_CHAPTER_DURATIONS = [45, 75, 75, 60, 75, 60, 75, 75, 90, 45] // 675s = 11:15

const toFrames = (sec: number) => Math.max(1, Math.round(sec * FPS))

export function computeTotalFrames(input: YouTubeMarketReportInput): number {
  const durations = input.chapterDurations?.length === 10
    ? input.chapterDurations
    : DEFAULT_CHAPTER_DURATIONS
  return durations.reduce((s, d) => s + toFrames(d), 0)
}

function beatImageSrc(citySlug: string, imageCount: number, beatIndex: number, explicitIdx?: number): string {
  if (explicitIdx && explicitIdx >= 1 && explicitIdx <= imageCount) {
    return `${citySlug}/img_${explicitIdx}.jpg`
  }
  const idx = (beatIndex % imageCount) + 1
  return `${citySlug}/img_${idx}.jpg`
}

export const YouTubeMarketReport: React.FC<YouTubeMarketReportInput> = (input) => {
  const {
    city, period, subhead, eyebrow, citySlug, marketHealthLabel, medianPriceDisplay,
    voPath, captionWords, chapters, imageCount = 15,
  } = input
  void loadFonts()

  const { durationInFrames: totalFrames } = useVideoConfig()
  const chapterDurations = input.chapterDurations?.length === 10
    ? input.chapterDurations
    : DEFAULT_CHAPTER_DURATIONS

  const chapterFrames = chapterDurations.map(toFrames)
  const slug = citySlug || city.toLowerCase().replace(/\s+/g, '-')

  // Compute chapter start frames
  const chapterStarts: number[] = []
  let cursor = 0
  for (const f of chapterFrames) {
    chapterStarts.push(cursor)
    cursor += f
  }

  const outroStart = chapterStarts[9]
  const outroSuppressRange: [number, number] = [outroStart, totalFrames]

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A1A2E' }}>
      {/* Continuous voiceover */}
      {voPath ? <Audio src={staticFile(voPath)} /> : null}

      {/* Ch 1 — Cold open + hook */}
      <Sequence from={chapterStarts[0]} durationInFrames={chapterFrames[0]}>
        <IntroScene
          city={city}
          period={period}
          subhead={subhead}
          eyebrow={eyebrow}
          citySlug={slug}
          marketHealthLabel={marketHealthLabel}
          medianPriceDisplay={medianPriceDisplay}
          durationInFrames={chapterFrames[0]}
        />
      </Sequence>

      {/* Ch 2-9 — stat chapters */}
      {chapters.map((ch, i) => {
        const chapterIndex = i + 2  // Ch 2..9
        const frameStart = chapterStarts[chapterIndex - 1]
        const frameDur = chapterFrames[chapterIndex - 1]
        const title = ch.chapterTitle || DEFAULT_CHAPTER_TITLES[chapterIndex - 1]
        const imgSrc = beatImageSrc(slug, imageCount, chapterIndex, ch.image_idx)

        return (
          <Sequence key={`ch-${chapterIndex}`} from={frameStart} durationInFrames={frameDur}>
            <StatScene
              {...ch}
              chapterNumber={chapterIndex}
              chapterTitle={title}
              imageSrc={imgSrc}
              durationInFrames={frameDur}
            />
          </Sequence>
        )
      })}

      {/* Ch 10 — CTA + closing card */}
      <Sequence from={chapterStarts[9]} durationInFrames={chapterFrames[9]}>
        <OutroScene
          city={city}
          period={period}
          durationInFrames={chapterFrames[9]}
        />
      </Sequence>

      {/* Caption band — landscape y 920-1040. Suppressed during outro. */}
      <KineticCaptions
        words={captionWords}
        suppressFrames={[outroSuppressRange]}
      />
    </AbsoluteFill>
  )
}
