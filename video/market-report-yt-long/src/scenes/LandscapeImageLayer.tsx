/**
 * Full-bleed image layer for 1920x1080 landscape compositions.
 * Ken Burns slow zoom + translate, navy scrim for text legibility.
 * Mirrors video/market-report/src/ImageLayer.tsx adapted for landscape.
 */

import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'

export const LandscapeImageLayer: React.FC<{
  src: string
  durationInFrames?: number
  direction?: 'right' | 'left' | 'up' | 'down'
}> = ({ src, durationInFrames = 900, direction = 'right' }) => {
  const frame = useCurrentFrame()
  const prog = Math.min(1, frame / Math.max(1, durationInFrames))
  const scale = interpolate(prog, [0, 1], [1.0, 1.07])
  const tx = direction === 'right' ? interpolate(prog, [0, 1], [0, -24])
    : direction === 'left' ? interpolate(prog, [0, 1], [0, 24])
    : 0
  const ty = direction === 'up' ? interpolate(prog, [0, 1], [0, -16])
    : direction === 'down' ? interpolate(prog, [0, 1], [0, 16])
    : 0

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
      </AbsoluteFill>

      {/* Light navy scrim — keeps text legible without blackening the photo */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(16,39,66,0.10) 0%, rgba(16,39,66,0.22) 35%, rgba(16,39,66,0.40) 70%, rgba(16,39,66,0.68) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
