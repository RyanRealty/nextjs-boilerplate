import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { CREAM, FONT_HEAD, GOLD, NAVY_DEEP } from '../brand'

type Props = {
  illustrationPath: string
  videoOverlayPath?: string | null
  /** italic tagline shown below illustration */
  tagline: string
  durationInFrames: number
}

/**
 * OutroBeat — closing tagline over hero bookend.
 */
export const OutroBeat: React.FC<Props> = ({
  illustrationPath,
  videoOverlayPath,
  tagline,
  durationInFrames,
}) => {
  const frame = useCurrentFrame()

  const taglineOpacity = interpolate(
    frame,
    [0, 14, durationInFrames - 6, durationInFrames],
    [0, 1, 1, 0.92],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.85,
        }}
      >
        {videoOverlayPath ? (
          <OffthreadVideo
            src={staticFile(videoOverlayPath)}
            style={{
              width: 820,
              height: 820,
              objectFit: 'contain',
            }}
            muted
          />
        ) : (
          <Img
            src={staticFile(illustrationPath)}
            style={{
              width: 820,
              height: 820,
              objectFit: 'contain',
            }}
          />
        )}
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          bottom: 600,
          left: 80,
          right: 80,
          textAlign: 'center',
          color: CREAM,
          fontFamily: FONT_HEAD,
          fontStyle: 'italic',
          fontSize: 56,
          lineHeight: 1.2,
          opacity: taglineOpacity,
          textShadow: '0 6px 20px rgba(0,0,0,0.6)',
        }}
      >
        {tagline}
      </div>

      {/* Subtle gold accent bar at bottom for closure */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 3,
          background: GOLD,
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  )
}
