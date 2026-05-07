import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

type ImageLayerProps = {
  /** Path relative to public/ — e.g. "bend/img_1.jpg" */
  src: string
  /** Duration of this beat in frames (for Ken Burns end scale) */
  durationInFrames?: number
  /** Direction of Ken Burns translate (default 'right') */
  direction?: 'right' | 'left' | 'up'
}

/**
 * Full-bleed image with Ken Burns slow zoom + translate, plus a navy scrim
 * that ensures white text is always legible regardless of image content.
 *
 * If the image file doesn't exist, falls back to transparent (Background
 * gradient will show through from the parent component).
 */
export const ImageLayer: React.FC<ImageLayerProps> = ({
  src,
  durationInFrames = 120,
  direction = 'right',
}) => {
  const frame = useCurrentFrame()

  // Ken Burns: gentle zoom from 1.0 → 1.08 over the beat duration
  const prog = Math.min(1, frame / Math.max(1, durationInFrames))
  const scale = interpolate(prog, [0, 1], [1.0, 1.08])

  // Translate direction — slow drift (max 20px at full zoom)
  const tx = direction === 'right' ? interpolate(prog, [0, 1], [0, -20])
    : direction === 'left' ? interpolate(prog, [0, 1], [0, 20])
    : 0
  const ty = direction === 'up' ? interpolate(prog, [0, 1], [0, -15]) : 0

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* The image itself */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </AbsoluteFill>

      {/* Navy scrim — LIGHT (Matt directive 2026-05-07).
       *
       * The previous scrim was 0.25 → 0.50 → 0.80 → 0.92 which blacked out
       * the bottom 65% of every photo. We rely on the caption pill (its own
       * 78% navy bg + 2px gold border, defined in KineticCaptions) for
       * caption legibility — the photo itself doesn't need to be muted.
       *
       * New ramp: light wash top→middle so HERO numbers stay legible at
       * scale 200, soft fade at the very bottom so the caption pill still
       * has a clean edge to sit on. Top stays nearly clear so social-tile
       * previews show the actual photo, not a navy wall. */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(16,39,66,0.08) 0%, rgba(16,39,66,0.18) 35%, rgba(16,39,66,0.32) 65%, rgba(16,39,66,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
