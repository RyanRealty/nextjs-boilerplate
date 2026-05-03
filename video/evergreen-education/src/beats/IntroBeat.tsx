import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { CREAM, FONT_HEAD, GOLD, NAVY_DEEP } from '../brand'

type Props = {
  /** path under public/, e.g. "4-pillars/illustrations/beat-0-hero.png" */
  illustrationPath: string
  /** title shown over the illustration */
  title: string
  durationInFrames: number
}

/**
 * IntroBeat — title card with hero illustration. Slow Remotion-deterministic push.
 */
export const IntroBeat: React.FC<Props> = ({ illustrationPath, title, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Slow push from scale 1.00 → 1.05 over the beat
  const pushScale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Title springs in over first 18 frames
  const titleEnter = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 14, stiffness: 90 },
  })
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      {/* Hero illustration */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.8,
          transform: `scale(${pushScale})`,
        }}
      >
        <Img
          src={staticFile(illustrationPath)}
          style={{
            width: 820,
            height: 820,
            objectFit: 'contain',
          }}
        />
      </AbsoluteFill>

      {/* Title overlay */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          paddingTop: 1280,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleEnter) * 30}px)`,
        }}
      >
        <div
          style={{
            color: CREAM,
            fontFamily: FONT_HEAD,
            fontSize: 78,
            textAlign: 'center',
            lineHeight: 1.05,
            letterSpacing: 1,
            padding: '0 80px',
            textShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          The 4 Pillars of
        </div>
        <div
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: 96,
            textAlign: 'center',
            lineHeight: 1.05,
            letterSpacing: 1,
            padding: '0 80px',
            textShadow: '0 8px 32px rgba(0,0,0,0.6)',
            marginTop: 8,
          }}
        >
          Real Estate Wealth
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
