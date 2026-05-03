import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_BODY, FONT_HEAD, GOLD, WHITE } from '../brand'

type Item = { headline: string; sub?: string }

type Props = {
  items: Item[]
  enterDelayFrames?: number
}

/**
 * StackedTaxList — three lines slide up with a stagger.
 * Used in Beat 4 (Tax Benefits) for the depreciation / interest / 1031 stack.
 */
export const StackedTaxList: React.FC<Props> = ({ items, enterDelayFrames = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - enterDelayFrames)
  const STAGGER = 14 // frames between each item entrance

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        alignItems: 'stretch',
        width: 820,
      }}
    >
      {items.map((item, i) => {
        const itemFrame = f - i * STAGGER
        const enter = spring({
          frame: itemFrame,
          fps,
          config: { damping: 14, stiffness: 110 },
        })
        const translateY = (1 - enter) * 30
        return (
          <div
            key={i}
            style={{
              opacity: enter,
              transform: `translateY(${translateY}px)`,
              background: 'rgba(10,26,46,0.70)',
              border: `2px solid ${GOLD}`,
              borderRadius: 20,
              padding: '20px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                color: GOLD,
                fontFamily: FONT_HEAD,
                fontSize: 44,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.headline}
            </div>
            {item.sub ? (
              <div
                style={{
                  color: WHITE,
                  fontFamily: FONT_BODY,
                  fontSize: 30,
                  opacity: 0.85,
                }}
              >
                {item.sub}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
