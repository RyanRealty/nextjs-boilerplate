import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { CREAM, FONT_BODY, FONT_HEAD, GOLD, NAVY_DEEP, WHITE } from '../brand'

/**
 * ChapterBeat — generic chapter container for the masterclass.
 * Layout:
 *   y    50 – 220   chapter header (CHAPTER N + headline)
 *   y   240 – 1020  content zone (chart OR photo OR illustration)
 *   y  1480 – 1720  caption safe zone (CaptionBand renders here)
 */
type Props = {
  chapterNumber: number
  headline: string
  /** Optional photo path under public/. If present, renders as backing scrim. */
  photoPath?: string | null
  /** Optional illustration path under public/. Renders in cream panel if no photo. */
  illustrationPath?: string | null
  /** React node to render in the content zone. Charts go here. */
  children?: React.ReactNode
  /** Chapter total length in frames (for the slow zoom on photo backgrounds) */
  durationInFrames: number
}

export const ChapterBeat: React.FC<Props> = ({
  chapterNumber,
  headline,
  photoPath,
  illustrationPath,
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headerEnter = spring({ frame, fps, config: { damping: 14, stiffness: 110 } })
  const headerOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const photoScale = interpolate(frame, [0, durationInFrames], [1.0, 1.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      {/* Optional background photo with heavy navy scrim (lets chart breathe on top) */}
      {photoPath ? (
        <>
          <Img
            src={staticFile(photoPath)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.45,
              transform: `scale(${photoScale})`,
              transformOrigin: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, ${NAVY_DEEP}d0 0%, ${NAVY_DEEP}90 30%, ${NAVY_DEEP}d0 100%)`,
            }}
          />
        </>
      ) : null}

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: headerOpacity,
          transform: `translateY(${(1 - headerEnter) * 18}px)`,
          padding: '0 60px',
        }}
      >
        <div
          style={{
            color: WHITE,
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          CHAPTER {chapterNumber}
        </div>
        <div
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: 56,
            letterSpacing: 2,
            marginTop: 6,
            lineHeight: 1.1,
            textShadow: '0 6px 20px rgba(0,0,0,0.55)',
          }}
        >
          {headline}
        </div>
      </div>

      {/* Content zone (chart, illustration, etc.) — explicit pixel bounds */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 60,
          right: 60,
          height: 1180, // y 240 → 1420, well above caption safe zone (1480-1720)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
        {/* Fallback: if no children but illustration provided, render in cream panel */}
        {!children && illustrationPath && !photoPath ? (
          <div
            style={{
              width: 700,
              height: 700,
              background: CREAM,
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 16px 60px rgba(0,0,0,0.45)',
              border: `2px solid ${GOLD}`,
              overflow: 'hidden',
            }}
          >
            <Img src={staticFile(illustrationPath)} style={{ width: 660, height: 660, objectFit: 'contain' }} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
