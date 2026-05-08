import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS, FONTS, ALPHAS, sec } from './colors'

/**
 * Earnest. episode title card. 3.3 seconds. Lives at the 50% mark of every episode.
 *
 * 0.0–0.3s   Cross-dissolve from previous beat to Ink. (Parent scene handles the dissolve in.)
 * 0.3–0.7s   Pull-quote fades in. Editorial New Italic, 72pt, Bone, centered.
 * 0.7–2.2s   Hold pull-quote. 1.5s.
 * 2.2–2.6s   Pull-quote dissolves out. Episode tag (e.g. "E01") fades in
 *             top-right corner, Inter Display Medium 32pt, Bone-soft.
 * 2.6–3.0s   Hold tag.
 * 3.0–3.3s   Cross-dissolve to next content beat. (Parent scene handles the dissolve out.)
 *
 * Pull-quote max 12 words, single sentence. Pre-written per episode in
 * video_production_skills/earnest/SEASON_1_TREATMENTS.md.
 */
export const TitleCard: React.FC<{
  pullQuote: string
  episodeTag: string
}> = ({ pullQuote, episodeTag }) => {
  const frame = useCurrentFrame()

  const quoteIn = sec(0.3) // 9
  const quoteFull = sec(0.7) // 21
  const quoteOut = sec(2.2) // 66
  const tagIn = sec(2.2) // 66
  const tagFull = sec(2.6) // 78

  const quoteOpacity =
    frame < quoteOut
      ? interpolate(frame, [quoteIn, quoteFull], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.cubic),
        })
      : interpolate(frame, [quoteOut, quoteOut + sec(0.3)], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        })

  const tagOpacity = interpolate(frame, [tagIn, tagFull], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      {/* Pull-quote, centered */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 90px',
          opacity: quoteOpacity,
        }}
      >
        <p
          style={{
            fontFamily: FONTS.pullQuote,
            fontStyle: 'italic',
            fontSize: 72,
            lineHeight: 1.15,
            color: COLORS.bone,
            textAlign: 'center',
            margin: 0,
            maxWidth: 900,
          }}
        >
          {`"${pullQuote}"`}
        </p>
      </div>

      {/* Episode tag, top-right */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          right: 90,
          opacity: tagOpacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 32,
            color: ALPHAS.boneSoft,
            letterSpacing: 1,
          }}
        >
          {episodeTag}
        </span>
      </div>
    </AbsoluteFill>
  )
}
