import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Background } from './Background'
import { ImageLayer } from './ImageLayer'
import { FONT_BODY, GOLD } from './brand'

export const OutroBeat: React.FC<{
  city: string
  imageSrc?: string
  durationInFrames?: number
}> = ({ city: _city, imageSrc, durationInFrames = 180 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logoIn = spring({ frame, fps, config: { damping: 20, stiffness: 110 } })
  const logoOp = interpolate(logoIn, [0, 1], [0, 1])
  const logoScale = interpolate(logoIn, [0, 1], [0.8, 1])
  const lineOp = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      {/* Image background — fallback to radial gradient */}
      {imageSrc ? (
        <ImageLayer src={imageSrc} durationInFrames={durationInFrames} direction="up" />
      ) : (
        <Background variant="navy-radial" accentSide="left" />
      )}

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
          transform: 'translateY(-100px)',
        }}>
          {/* White stacked logo — staticFile path resolves from public/ */}
          <div style={{ opacity: logoOp, transform: `scale(${logoScale})` }}>
            <Img
              src={staticFile('stacked_logo_white.png')}
              style={{ width: 280, height: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
            />
          </div>
          <div style={{ width: 220, height: 3, background: GOLD, opacity: lineOp, marginTop: 4 }} />
          {/* Logo-only sign-off by policy. */}
        </div>

        {/* Photo credit — bottom-right, small */}
        {imageSrc ? (
          <div style={{
            position: 'absolute', bottom: 130, right: 90,
            color: 'rgba(255,255,255,0.45)', fontFamily: FONT_BODY, fontSize: 18,
            letterSpacing: 1,
          }}>
            Photos: Unsplash
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
