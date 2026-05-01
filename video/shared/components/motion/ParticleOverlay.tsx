// ParticleOverlay — full-bleed deterministic particle system.
//
// Uses seeded random so the exact particle layout is identical on every
// render — required for Remotion frame-deterministic output.
//
// Presets:
//   confetti        — tumbling rectangles in brand-bright colors (party)
//   floating-lights — soft golden bokeh circles drifting up (elegant)
//   speed-lines     — horizontal streaks racing through frame (sports/action)
//   snow            — slow falling specks (winter/festive)
//   sparkle         — tiny twinkling stars (festive/holiday)
//   bubbles         — circles rising slowly (brewery/drinks)
//
// Lightweight implementation: pure SVG, no canvas, no external libs. Up to
// ~120 particles renders smoothly at 30fps in Chrome under Remotion.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { seededRandom, clamp } from './easing';

export type ParticlePreset =
  | 'confetti'
  | 'floating-lights'
  | 'speed-lines'
  | 'snow'
  | 'sparkle'
  | 'bubbles';

export type ParticleOverlayProps = {
  preset: ParticlePreset;
  /** Total scene duration in seconds — used to time the loop. */
  durationSec: number;
  /** Number of particles. Defaults to a preset-appropriate value. */
  count?: number;
  /** 0..1 multiplier on opacity / brightness. Default 1. */
  intensity?: number;
  /** Override of seed for the particle layout. Default 7. */
  seed?: number;
  /** Color overrides — preset defaults are used if absent. */
  colors?: string[];
};

const DEFAULT_COLORS: Record<ParticlePreset, string[]> = {
  confetti: ['#D4AF37', '#F2EBDD', '#7BD389', '#FF8B7E', '#9CC4FF'],
  'floating-lights': ['rgba(255,220,140,0.85)', 'rgba(255,200,120,0.7)', 'rgba(255,235,180,0.9)'],
  'speed-lines': ['rgba(255,255,255,0.85)', 'rgba(212,175,55,0.7)'],
  snow: ['rgba(255,255,255,0.95)', 'rgba(220,235,255,0.8)'],
  sparkle: ['#FFEB94', '#FFFFFF', '#FFF6CC'],
  bubbles: ['rgba(255,255,255,0.7)', 'rgba(220,240,255,0.55)'],
};

const DEFAULT_COUNT: Record<ParticlePreset, number> = {
  confetti: 90,
  'floating-lights': 30,
  'speed-lines': 24,
  snow: 70,
  sparkle: 60,
  bubbles: 40,
};

export const ParticleOverlay: React.FC<ParticleOverlayProps> = ({
  preset,
  durationSec,
  count,
  intensity = 1,
  seed = 7,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vw, height: vh } = useVideoConfig();

  const N = count ?? DEFAULT_COUNT[preset];
  const palette = colors ?? DEFAULT_COLORS[preset];
  const totalFrames = Math.max(1, durationSec * fps);
  const t = frame / totalFrames; // 0..1, may exceed 1 — components handle wrap

  const particles: React.ReactNode[] = [];

  for (let i = 0; i < N; i++) {
    const baseSeed = seed * 1000 + i * 17;
    const r1 = seededRandom(baseSeed);
    const r2 = seededRandom(baseSeed + 1);
    const r3 = seededRandom(baseSeed + 2);
    const r4 = seededRandom(baseSeed + 3);

    const color = palette[i % palette.length];

    switch (preset) {
      case 'confetti': {
        // Falling rectangles with rotation.
        const x0 = r1 * vw;
        const y0 = -50 - r2 * 200;
        const fallSpeed = (vh + 200) / totalFrames;
        const y = y0 + frame * fallSpeed * (0.6 + r3 * 0.6);
        const x = x0 + Math.sin(frame / (15 + r4 * 10)) * 80;
        const rot = frame * (3 + r4 * 4);
        const w = 12 + r3 * 16;
        const h = 4 + r4 * 6;
        particles.push(
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={color}
            opacity={0.9 * intensity}
            transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}
          />,
        );
        break;
      }

      case 'floating-lights': {
        // Soft glowing circles drifting up.
        const x0 = r1 * vw;
        const y0 = vh + r2 * 200;
        const riseSpeed = (vh + 400) / totalFrames;
        const y = y0 - frame * riseSpeed * (0.4 + r3 * 0.5);
        const x = x0 + Math.sin(frame / (40 + r4 * 30)) * 40;
        const rad = 18 + r3 * 36;
        const op = (0.45 + r4 * 0.4) * intensity;
        particles.push(
          <circle
            key={i}
            cx={x}
            cy={y}
            r={rad}
            fill={color}
            opacity={op}
            filter="url(#motion-blur)"
          />,
        );
        break;
      }

      case 'speed-lines': {
        // Horizontal streaks crossing left → right.
        const y = r1 * vh;
        const period = 0.4 + r2 * 0.4; // each streak lasts a fraction of duration
        const cycle = (t + r3) % period;
        const xt = cycle / period; // 0..1
        const xCenter = -200 + xt * (vw + 400);
        const length = 220 + r4 * 220;
        const op = clamp(1 - Math.abs(xt - 0.5) * 2, 0, 1) * 0.85 * intensity;
        particles.push(
          <line
            key={i}
            x1={xCenter - length / 2}
            y1={y}
            x2={xCenter + length / 2}
            y2={y}
            stroke={color}
            strokeWidth={2 + r4 * 2}
            opacity={op}
            strokeLinecap="round"
          />,
        );
        break;
      }

      case 'snow': {
        const x0 = r1 * vw;
        const y0 = -20 - r2 * 200;
        const fallSpeed = (vh + 200) / totalFrames;
        const y = y0 + frame * fallSpeed * (0.5 + r3 * 0.5);
        const x = x0 + Math.sin(frame / (28 + r4 * 24)) * 30;
        const rad = 1.5 + r3 * 3;
        particles.push(
          <circle
            key={i}
            cx={x}
            cy={y}
            r={rad}
            fill={color}
            opacity={0.85 * intensity}
          />,
        );
        break;
      }

      case 'sparkle': {
        // Tiny stars that twinkle on/off.
        const x = r1 * vw;
        const y = r2 * vh;
        const period = 0.18 + r3 * 0.22;
        const phase = (t + r4) % period;
        const op = Math.sin((phase / period) * Math.PI) * intensity;
        const size = 2 + r3 * 3;
        if (op > 0.05) {
          particles.push(
            <g key={i} transform={`translate(${x},${y}) rotate(45)`}>
              <rect
                x={-size}
                y={-0.5}
                width={size * 2}
                height={1}
                fill={color}
                opacity={op}
              />
              <rect
                x={-0.5}
                y={-size}
                width={1}
                height={size * 2}
                fill={color}
                opacity={op}
              />
            </g>,
          );
        }
        break;
      }

      case 'bubbles': {
        const x0 = r1 * vw;
        const y0 = vh + r2 * 100;
        const riseSpeed = (vh + 200) / totalFrames;
        const y = y0 - frame * riseSpeed * (0.3 + r3 * 0.4);
        const x = x0 + Math.sin(frame / (24 + r4 * 24)) * 18;
        const rad = 8 + r3 * 22;
        particles.push(
          <g key={i} opacity={0.75 * intensity}>
            <circle cx={x} cy={y} r={rad} fill="none" stroke={color} strokeWidth={1.5} />
            <circle cx={x - rad * 0.35} cy={y - rad * 0.35} r={rad * 0.18} fill={color} opacity={0.6} />
          </g>,
        );
        break;
      }
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg
        width={vw}
        height={vh}
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ display: 'block', mixBlendMode: preset === 'speed-lines' ? 'screen' : undefined }}
      >
        <defs>
          <filter id="motion-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {particles}
      </svg>
    </AbsoluteFill>
  );
};
