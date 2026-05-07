// Per-event beat card.
// Full-bleed background image + top-down gradient scrim + event details.
// No Ryan Realty logo, no phone, no agent name.
//
// Layout zones (portrait 9x16 example):
//   - Full bleed image with Ken Burns pan
//   - Top-to-bottom scrim: rgba(0,0,0,0) → rgba(16,39,66,0.55)
//   - Event title (Amboqia) in content zone, above caption safe zone
//   - Date+time gold pill
//   - Venue line
//   - Photo attribution pill — bottom-left corner, outside caption band

import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, FONT_BODY, FONT_CAPTION, GOLD, NAVY, NAVY_DEEP, WHITE, WHITE_SOFT, WHITE_DIM } from './brand'
import { useSafeZone } from './SafeZones'
import type { EventData } from './VideoProps'

// Ken Burns pan directions (cycles across beats so no two consecutive match).
type Direction = 'left' | 'right' | 'up' | 'down' | 'center'
const DIRECTIONS: Direction[] = ['left', 'right', 'up', 'down', 'center']

function kenBurnsStyle(direction: Direction, progress: number): React.CSSProperties {
  const SCALE_START = 1.04
  const SCALE_END   = 1.0
  const scale = interpolate(progress, [0, 1], [SCALE_START, SCALE_END], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const PAN = 1.5 // percent
  let tx = 0, ty = 0
  if (direction === 'left')   tx = interpolate(progress, [0, 1], [PAN, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (direction === 'right')  tx = interpolate(progress, [0, 1], [-PAN, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (direction === 'up')     ty = interpolate(progress, [0, 1], [PAN, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (direction === 'down')   ty = interpolate(progress, [0, 1], [-PAN, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return {
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
    transformOrigin: 'center center',
  }
}

export const EventCard: React.FC<{
  event: EventData
  /** Beat index 1-5, used to pick Ken Burns direction. */
  beatIndex: number
  durationInFrames: number
}> = ({ event, beatIndex, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dims = useSafeZone()
  const progress = frame / Math.max(1, durationInFrames)

  // Pick Ken Burns direction based on beat index (deterministic, no repeats on adjacent).
  const direction = DIRECTIONS[beatIndex % DIRECTIONS.length]

  // Text reveal animations.
  const contentEnter = spring({ frame, fps, config: { damping: 18, stiffness: 100 } })
  const titleY  = interpolate(contentEnter, [0, 1], [32, 0])
  const titleOp = interpolate(contentEnter, [0, 1], [0, 1])
  const pillOp  = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: 'clamp' })
  const venueOp = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' })

  // Content zone sits above the caption safe zone with breathing room.
  const contentBottom = dims.captionYTop - 32
  const contentTop    = Math.round(dims.height * 0.30)

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: NAVY_DEEP }}>
      {/* Background image — Ken Burns */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <img
          src={staticFile(`images/${event.slug}.jpg`)}
          alt=""
          style={kenBurnsStyle(direction, progress)}
        />
      </AbsoluteFill>

      {/* Gradient scrim: top transparent → bottom navy */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(16,39,66,0.55) 60%, rgba(10,26,46,0.85) 100%)`,
        }}
      />

      {/* Content block — anchored above caption zone */}
      <div
        style={{
          position: 'absolute',
          left: dims.safeXMin,
          right: dims.width - dims.safeXMax,
          top: contentTop,
          bottom: dims.height - contentBottom,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 16,
        }}
      >
        {/* Event title */}
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: dims.titleFontSize,
            fontWeight: 700,
            color: WHITE,
            lineHeight: 1.05,
            textShadow: '0 4px 24px rgba(0,0,0,0.7)',
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            letterSpacing: -0.5,
          }}
        >
          {event.title}
        </div>

        {/* Date + time pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            opacity: pillOp,
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              background: GOLD,
              color: NAVY,
              fontFamily: FONT_BODY,
              fontSize: dims.pillFontSize,
              fontWeight: 700,
              padding: '8px 22px',
              borderRadius: 8,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {event.date_time}
          </div>
        </div>

        {/* Venue */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: Math.round(dims.pillFontSize * 0.82),
            fontWeight: 600,
            color: WHITE_SOFT,
            opacity: venueOp,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {event.venue}
        </div>
      </div>

      {/* Photo attribution pill — bottom-left, outside caption band */}
      <PhotoCreditPill credit={event.photo_credit} dims={dims} />
    </AbsoluteFill>
  )
}

const PhotoCreditPill: React.FC<{
  credit: string
  dims: ReturnType<typeof useSafeZone>
}> = ({ credit, dims }) => {
  // Position below caption band bottom, above frame edge.
  const pillBottom = dims.height - 28
  return (
    <div
      style={{
        position: 'absolute',
        left: dims.safeXMin,
        bottom: dims.height - pillBottom,
        background: `rgba(${parseInt(NAVY.slice(1,3),16)},${parseInt(NAVY.slice(3,5),16)},${parseInt(NAVY.slice(5,7),16)},0.60)`,
        borderTop: `1px solid ${GOLD}`,
        padding: '4px 12px',
        borderRadius: '0 4px 4px 0',
      }}
    >
      <span
        style={{
          fontFamily: FONT_CAPTION,
          fontSize: dims.creditFontSize,
          color: WHITE_DIM,
          letterSpacing: 0.3,
        }}
      >
        {credit}
      </span>
    </div>
  )
}
