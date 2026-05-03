import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT_HEAD, GOLD, NAVY_DEEP, WHITE } from '../brand'
import { BarFillViz } from '../components/BarFillViz'
import { BarShrinkViz } from '../components/BarShrinkViz'
import { CountUpPill } from '../components/CountUpPill'
import { StackedTaxList } from '../components/StackedTaxList'

export type PillarKind = 'cashFlow' | 'appreciation' | 'loanPaydown' | 'taxBenefits'

type Props = {
  kind: PillarKind
  /** "1" / "2" / "3" / "4" — pillar number */
  pillarNumber: 1 | 2 | 3 | 4
  /** headline label, e.g. "CASH FLOW" */
  headline: string
  /** illustration under public/ */
  illustrationPath: string
  /** OPTIONAL Grok Video clip path under public/ — if present, overlays cinemagraph-style on top of the still */
  videoOverlayPath?: string | null
  /** present in props for parity with other beats — not used directly inside this comp */
  durationInFrames?: number
  /** kind-specific params */
  params: PillarParams
}

export type PillarParams =
  | { kind: 'cashFlow'; cashFlowMonthly: number }
  | { kind: 'appreciation'; ratePercent: number; firstYearGain: number }
  | { kind: 'loanPaydown'; initialLoan: number; year1Paydown: number }
  | {
      kind: 'taxBenefits'
      depreciationYearly: number
      taxBracket: number
      taxSavingsYearly: number
    }

/**
 * PillarBeat — generic per-pillar layout: hero illustration top half, data viz bottom half,
 * headline ribbon in between. The data-viz component is selected by `kind`.
 *
 * If videoOverlayPath is provided (Grok Video opt-in scout for beats 1+6), it renders
 * via OffthreadVideo IN the same coordinates as the still — cinemagraph technique.
 */
export const PillarBeat: React.FC<Props> = ({
  kind,
  pillarNumber,
  headline,
  illustrationPath,
  videoOverlayPath,
  params,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Headline ribbon springs in over 16 frames
  const ribbonEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  })
  const ribbonOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Data viz starts ~0.4s into the beat (12 frames)
  const VIZ_DELAY = 12

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      {/* Hero illustration — TOP zone (y 100..820) */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        {videoOverlayPath ? (
          <OffthreadVideo
            src={staticFile(videoOverlayPath)}
            style={{
              width: 700,
              height: 700,
              objectFit: 'contain',
            }}
            muted
          />
        ) : (
          <Img
            src={staticFile(illustrationPath)}
            style={{
              width: 700,
              height: 700,
              objectFit: 'contain',
            }}
          />
        )}
      </AbsoluteFill>

      {/* Headline ribbon (between illustration and data viz) */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 850,
          opacity: ribbonOpacity,
          transform: `translateY(${(1 - ribbonEnter) * 20}px)`,
        }}
      >
        <div
          style={{
            color: WHITE,
            fontFamily: FONT_HEAD,
            fontSize: 36,
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          PILLAR {pillarNumber}
        </div>
        <div
          style={{
            color: GOLD,
            fontFamily: FONT_HEAD,
            fontSize: 72,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginTop: 4,
            textShadow: '0 6px 20px rgba(0,0,0,0.5)',
          }}
        >
          {headline}
        </div>
      </AbsoluteFill>

      {/* Data viz — BOTTOM zone (y 1060..1380) — well above caption safe zone (1480) */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 1060,
        }}
      >
        {kind === 'cashFlow' && params.kind === 'cashFlow' ? (
          <CountUpPill
            target={params.cashFlowMonthly}
            prefix="+$"
            suffix="/mo"
            label="Net cash flow"
            variant="medium"
            enterDelayFrames={VIZ_DELAY}
          />
        ) : null}

        {kind === 'appreciation' && params.kind === 'appreciation' ? (
          <BarFillViz
            percent={Math.min(100, params.ratePercent * 20)} // 3% → 60% bar fill (visual scaling)
            primaryLabel={`${params.ratePercent}% / yr`}
            subLabel={`first-year gain: $${params.firstYearGain.toLocaleString('en-US')}`}
            enterDelayFrames={VIZ_DELAY}
          />
        ) : null}

        {kind === 'loanPaydown' && params.kind === 'loanPaydown' ? (
          <BarShrinkViz
            initialValue={params.initialLoan}
            finalValue={params.initialLoan - params.year1Paydown}
            subLabel={`year 1: $${params.year1Paydown.toLocaleString('en-US')} paid down`}
            enterDelayFrames={VIZ_DELAY}
          />
        ) : null}

        {kind === 'taxBenefits' && params.kind === 'taxBenefits' ? (
          <StackedTaxList
            items={[
              {
                headline: `$${params.depreciationYearly.toLocaleString('en-US')} / yr depreciation`,
                sub: `≈ $${params.taxSavingsYearly.toLocaleString('en-US')} / yr saved at ${params.taxBracket}% bracket`,
              },
              {
                headline: 'Mortgage interest deductible',
                sub: 'Reduces taxable rental income',
              },
              {
                headline: '1031 exchange',
                sub: 'Defer capital gains by rolling into the next property',
              },
            ]}
            enterDelayFrames={VIZ_DELAY}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

