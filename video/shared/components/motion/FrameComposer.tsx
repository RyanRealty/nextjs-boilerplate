// FrameComposer — enforce the "minimum 3 visual layers per frame" rule.
//
// Every frame of a Ryan Realty video must have at least three distinct
// visual layers stacked: a background, content (photo or graphic), and an
// overlay (text, scrim, particles, branding). Single-layer frames read as
// static and kill retention.
//
// FrameComposer takes named slot props for each layer and renders them in
// the correct order. If any required slot is missing, FrameComposer renders
// a developer warning ribbon at the top of the frame so the missing layer
// is obvious during preview.
//
// Slots (from back to front):
//   1. `background` — required. GradientOverlay, ParallaxPhoto, KenBurns, etc.
//   2. `content`    — required. Headline + photo cluster, stat block, scene focus.
//   3. `overlay`    — required. Text, scrim, captions, particles, anything UI.
//
// Optional extras render on top of overlay in declared order:
//   - `chrome`   — branding, progress indicator, presenter PIP
//   - `effects`  — particles, light leaks, transition wrappers
//
// Usage:
//
//   <FrameComposer
//     background={<GradientOverlay mode="drift" colors={[NAVY, NAVY_DEEP]} />}
//     content={<ParallaxPhoto src={hero} durationSec={4} />}
//     overlay={
//       <>
//         <ScrimLayer direction="bottom" />
//         <AnimatedInfoCard headline={…} />
//       </>
//     }
//     effects={<ParticleOverlay preset="floating-lights" durationSec={4} />}
//     chrome={<ProgressIndicator totalScenes={6} currentScene={2} />}
//   />

import React from 'react';
import { AbsoluteFill } from 'remotion';

export type FrameComposerProps = {
  background: React.ReactNode;
  content: React.ReactNode;
  overlay: React.ReactNode;
  effects?: React.ReactNode;
  chrome?: React.ReactNode;
  /**
   * Suppress the developer warning ribbon when slots are empty. Default false.
   * Only set true if you intentionally want a 1- or 2-layer frame and have
   * justified the choice in a code comment.
   */
  allowMinimal?: boolean;
};

const isPresent = (slot: React.ReactNode): boolean => {
  if (slot === null || slot === undefined || slot === false) return false;
  if (Array.isArray(slot) && slot.length === 0) return false;
  return true;
};

export const FrameComposer: React.FC<FrameComposerProps> = ({
  background,
  content,
  overlay,
  effects,
  chrome,
  allowMinimal = false,
}) => {
  const missing: string[] = [];
  if (!isPresent(background)) missing.push('background');
  if (!isPresent(content)) missing.push('content');
  if (!isPresent(overlay)) missing.push('overlay');

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 0 }}>{background}</AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 1 }}>{content}</AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 2 }}>{overlay}</AbsoluteFill>
      {effects ? <AbsoluteFill style={{ zIndex: 3 }}>{effects}</AbsoluteFill> : null}
      {chrome ? <AbsoluteFill style={{ zIndex: 4 }}>{chrome}</AbsoluteFill> : null}

      {!allowMinimal && missing.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'rgba(220,38,38,0.92)',
            color: '#fff',
            padding: '8px 18px',
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          [FrameComposer] Missing required slots: {missing.join(', ')} —
          every frame must have ≥3 visual layers (background, content, overlay).
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Helper: assert that a built scene clears the 3-layer rule. Use in tests
 * or in pre-render checks. Throws when allowMinimal is false and any slot
 * is missing.
 */
export function assertFrameComposition(props: FrameComposerProps): void {
  if (props.allowMinimal) return;
  const missing: string[] = [];
  if (!isPresent(props.background)) missing.push('background');
  if (!isPresent(props.content)) missing.push('content');
  if (!isPresent(props.overlay)) missing.push('overlay');
  if (missing.length > 0) {
    throw new Error(
      `FrameComposer: missing required slots: ${missing.join(', ')}`,
    );
  }
}
