// ProgressIndicator — scene counter / progress bar pinned to the frame.
//
// Three styles:
//
//   - 'dots'      : small dots, one per scene, the active scene scaled up
//   - 'bar'       : horizontal bar that fills as the video progresses
//   - 'segmented' : segmented bar; each segment fills as its scene plays
//
// Designed to fit the safe zone in either portrait or landscape — pass
// `placement` to anchor it. Use sparingly; the indicator should orient
// viewers without becoming a focal element.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { clamp, applyEasing, EasingName } from './easing';

export type ProgressStyle = 'dots' | 'bar' | 'segmented';
export type ProgressPlacement = 'top' | 'bottom';

export type ProgressIndicatorProps = {
  /** Total number of scenes / segments. */
  totalScenes: number;
  /** 0-indexed currently-playing scene. */
  currentScene: number;
  /** Local progress within the current scene (0..1). */
  sceneProgress?: number;
  style?: ProgressStyle;
  placement?: ProgressPlacement;
  /** Active color (filled / current). Default brand gold. */
  activeColor?: string;
  /** Inactive color (track / pending). Default semi-translucent white. */
  inactiveColor?: string;
  /** Margin from edge of frame in px. Default 60. */
  margin?: number;
  /** For 'bar' style: width as % of frame. Default 78. */
  widthPct?: number;
  /** For 'bar': bar height in px. Default 4. */
  thickness?: number;
  /** Easing applied to the segmented fill. Default 'easeInOutCubic'. */
  easing?: EasingName;
  /** Optional label rendered next to the indicator (e.g. "02 of 06"). */
  label?: string;
};

const DEFAULT_GOLD = '#D4AF37';
const DEFAULT_TRACK = 'rgba(255,255,255,0.18)';

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalScenes,
  currentScene,
  sceneProgress = 0,
  style = 'segmented',
  placement = 'top',
  activeColor = DEFAULT_GOLD,
  inactiveColor = DEFAULT_TRACK,
  margin = 60,
  widthPct = 78,
  thickness = 4,
  easing = 'easeInOutCubic',
  label,
}) => {
  // useCurrentFrame is intentionally NOT used — caller provides currentScene
  // and sceneProgress, which keeps this component pure and easy to reason
  // about across staggered Sequences.
  useCurrentFrame();
  const { width: vw } = useVideoConfig();

  const safeProgress = clamp(sceneProgress, 0, 1);
  const overallRatio = clamp(
    (currentScene + safeProgress) / Math.max(1, totalScenes),
    0,
    1,
  );

  const wrapperBase: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    [placement]: margin,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'none',
  } as React.CSSProperties;

  const labelEl = label ? (
    <div
      style={{
        fontFamily: 'AzoSans, system-ui, sans-serif',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 4,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  ) : null;

  if (style === 'dots') {
    const dotSize = 10;
    const gap = 12;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={wrapperBase}>
          {labelEl}
          <div style={{ display: 'flex', gap, alignItems: 'center' }}>
            {Array.from({ length: totalScenes }).map((_, i) => {
              const isActive = i === currentScene;
              const isPast = i < currentScene;
              const sc = isActive ? 1 + 0.4 * applyEasing(safeProgress, easing) : 1;
              return (
                <div
                  key={i}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: isActive || isPast ? activeColor : inactiveColor,
                    transform: `scale(${sc.toFixed(3)})`,
                    transition: 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === 'bar') {
    const widthPx = (vw * widthPct) / 100;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={wrapperBase}>
          {labelEl}
          <div
            style={{
              width: widthPx,
              height: thickness,
              background: inactiveColor,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(overallRatio * 100).toFixed(2)}%`,
                height: '100%',
                background: activeColor,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // segmented
  const widthPx = (vw * widthPct) / 100;
  const segGap = 6;
  const segWidth = (widthPx - segGap * (totalScenes - 1)) / totalScenes;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={wrapperBase}>
        {labelEl}
        <div style={{ display: 'flex', gap: segGap }}>
          {Array.from({ length: totalScenes }).map((_, i) => {
            const fillRatio =
              i < currentScene ? 1 : i === currentScene ? safeProgress : 0;
            return (
              <div
                key={i}
                style={{
                  width: segWidth,
                  height: thickness,
                  background: inactiveColor,
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(applyEasing(fillRatio, easing) * 100).toFixed(2)}%`,
                    height: '100%',
                    background: activeColor,
                    borderRadius: 999,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
