# Shared motion library

Reusable Remotion motion + animation primitives shared across every video
pipeline in this repo (`video/market-report`, `video/listing-tour`,
`video/cascade-peaks`, future `video/weekend-events`, etc.).

The goal: stop defaulting every scene to a slow Ken Burns zoom. Pick a richer
motion technique that matches scene energy.

> **Ken Burns is the FALLBACK only.** If a build agent reaches `KenBurns` or
> the `default` preset, that means no richer motion fit the scene. The presets
> below pick richer options first; agents should pass a real `SceneEnergy` tag
> whenever possible.

## Files

```
motion/
├── README.md             — this file
├── index.ts              — barrel exports (import everything from here)
├── easing.ts             — shared easing curves, spring presets, seeded rand
├── motionPresets.ts      — energy-tag → motion-combo configs
│
│  ── PRIMARY MOTION ──
├── KenBurns.tsx          — FALLBACK
├── ParallaxPhoto.tsx     — 2.5D depth-parallax, layer mode + fake mode
├── MaskReveal.tsx        — clip-path animated reveals
├── SplitComposition.tsx  — photo + info-panel layouts
├── PhotoCollage.tsx      — 2-4 photos in animated grid or flip carousel
│
│  ── TEXT ──
├── KineticText.tsx       — single-line text entrance variants
├── TextReveal.tsx        — multi-line stagger wrapper around KineticText
├── AnimatedInfoCard.tsx  — eyebrow + headline + details + pills card
├── CounterAnimation.tsx  — animated number counters with bar fill
│
│  ── OVERLAYS ──
├── GradientOverlay.tsx   — animated gradient backgrounds (never solid)
├── ScrimLayer.tsx        — configurable dark overlay for legibility
├── ParticleOverlay.tsx   — confetti / lights / speed-lines / snow / sparkle / bubbles
├── EmojiReaction.tsx     — emoji pop on extreme data points
├── PIPPresenter.tsx      — picture-in-picture presenter cutout
├── ProgressIndicator.tsx — scene counter / progress bar
│
│  ── TRANSITIONS ──
├── SceneTransition.tsx   — master transition component (9 variants)
├── transitions.tsx       — Crossfade/Wipe/Slide/Iris/ZoomThrough/Diagonal wrappers
│
│  ── COMPOSITION + QA ──
├── FrameComposer.tsx     — enforce ≥3-layer rule per frame
└── MotionValidator.ts    — pixel-diff QA (Node-only, not a component)
```

## Importing

```ts
import {
  // primary motion
  ParallaxPhoto, MaskReveal, SplitComposition, PhotoCollage, KenBurns,
  // text
  KineticText, TextReveal, AnimatedInfoCard, CounterAnimation,
  // overlays
  GradientOverlay, ScrimLayer, ParticleOverlay, EmojiReaction,
  PIPPresenter, ProgressIndicator,
  // transitions
  SceneTransition, CrossfadeTransition, WipeTransition, SlideTransition,
  IrisTransition, ZoomThroughTransition, DiagonalWipeTransition,
  // composition
  FrameComposer, assertFrameComposition,
  // routing
  getMotionPreset, motionPresets,
  // utilities
  applyEasing, clamp, SPRING_PRESETS,
} from '../../shared/components/motion';
```

The library has zero project-specific dependencies — it imports only from
`react` and `remotion`, both of which are already in every Remotion pipeline's
`package.json`. `MotionValidator` is a Node-only module; import it directly
from `motion/MotionValidator` (it isn't re-exported through the barrel).

## Engagement guardrails the toolkit enforces

Pulled from the project rules in `CLAUDE.md` and the engagement research
behind the listing/market video pipelines:

| Rule | Toolkit support |
|---|---|
| **No solid color backgrounds.** Every frame must have visible motion. | `GradientOverlay` (drift / sweep / pulse) |
| **All text must animate in.** No static title cards. | `KineticText` (8 variants), `TextReveal` (multi-line stagger), `AnimatedInfoCard` (built-in stagger) |
| **Min 3 visual layers per frame.** Background + content + overlay. | `FrameComposer` (slot-validated layout) |
| **Hard cuts are banned.** Every scene boundary uses a transition. | `SceneTransition` + 6 standalone wrappers |
| **Stats must build, never appear.** Bar-by-bar synced to VO. | `CounterAnimation` (counter + bar fill) |
| **Captions sit in their own safe zone, no overlap.** | (Caller responsibility — components do not occupy y 1480–1720 by default) |
| **Pattern interrupts at 25%/50%/final-15%.** | `MaskReveal`, `IrisTransition`, `EmojiReaction` |
| **Presenter on screen ≥60% of video.** | `PIPPresenter` |
| **Pixel-diff sanity check before publish.** | `MotionValidator.validateRender()` |
| **Ken Burns is the fallback, not the default.** | `motionPresets` routes around KenBurns until everything else is exhausted |

## TL;DR for build agents

```ts
import { getMotionPreset } from '../../shared/components/motion';

const preset = getMotionPreset(scene.energy); // SceneEnergy or string
// preset.primary    → which photo motion + config
// preset.text       → KineticText variant + spring + duration
// preset.transition → SceneTransition variant + duration
// preset.particles  → optional ParticleOverlay preset
// preset.accent     → optional accent color
```

If `scene.energy` doesn't match a known tag, the lookup returns the
`default` preset (KenBurns) — so the worst case is a graceful fallback,
never a broken scene.

## Components

### Primary motion

#### `ParallaxPhoto`

2.5D parallax pop on a still photo.

- **Layer mode**: pass `depthDir` pointing at a directory containing
  `bg.png` / `mid.png` / `fg.png` cut from a MiDaS depth pass (see
  `video_production_skills/depth_parallax/`). Genuine 3D depth pop.
- **Fake mode**: pass only `src`. Two copies of the same photo (blurred
  bg + sharp fg). No preprocessing required, looks great on most photos.

```tsx
<ParallaxPhoto
  src={staticFile('bend/img_3.jpg')}
  durationSec={4}
  direction="push-in"  // 'push-in' | 'pull-out' | 'pan-left' | 'pan-right' | 'rise'
  intensity={0.9}
/>
```

#### `MaskReveal`

Clip-path-driven reveal of children. Children render full-bleed.

Shapes: `circle-from-center`, `circle-from-corner`, `curtain-wipe-left`,
`curtain-wipe-right`, `curtain-wipe-up`, `curtain-wipe-down`,
`diagonal-slash`, `iris-open`, `split-vertical`, `split-horizontal`.

```tsx
<MaskReveal shape="iris-open" durationSec={0.8}>
  <ParallaxPhoto src={hero} durationSec={4} />
</MaskReveal>
```

#### `SplitComposition`

Photo + info panel side-by-side. Animated split divider.

Modes: `left-right`, `right-left`, `vertical-split`,
`vertical-split-reverse`, `diagonal-split`.

```tsx
<SplitComposition
  mode="left-right"
  photoRatio={0.6}
  photo={<ParallaxPhoto src={hero} durationSec={4} />}
  panel={<AnimatedInfoCard headline="…" details={[…]} />}
/>
```

#### `PhotoCollage`

2 to 4 photos either in a static grid (sequential scale-in) or a flip
carousel (3D `rotateY` reveal one tile at a time).

```tsx
<PhotoCollage
  photos={[
    { src: photo1, caption: 'Friday' },
    { src: photo2, caption: 'Saturday' },
    { src: photo3, caption: 'Sunday' },
  ]}
  layout="grid"  // or 'carousel'
  durationSec={4}
/>
```

#### `KenBurns` (fallback)

Slow zoom + drift on a still image. **Use only as a fallback.**

```tsx
<KenBurns src={staticFile('bend/img_2.jpg')} durationSec={4} direction="zoom-in-center" />
```

### Text

#### `KineticText`

Single-line text entrance variants:

- `slide-up`, `slide-left`, `slide-right`
- `scale-from-center`
- `typewriter` (with blinking caret)
- `spring-bounce`
- `split-chars` (every character animates independently)
- `fade-slide-up` (default — subtle, elegant)

All variants accept `durationSec`, `delaySec`, `easing`, and `spring` preset.

```tsx
<KineticText
  text="Bend Spring Festival"
  variant="split-chars"
  spring="bouncy"
  delaySec={0.2}
  style={{ fontSize: 88, fontFamily: 'Amboqia' }}
/>
```

#### `TextReveal`

Multi-line stagger wrapper around `KineticText`. Use this any time you'd
otherwise render an array of lines statically.

```tsx
<TextReveal
  lines={[
    'Q2 wrap-up',
    { text: 'Bend, OR', variant: 'fade-slide-up' },
    { text: 'Median sale price up 7.3%', delaySec: 0.6 },
  ]}
  variant="fade-slide-up"
  staggerSec={0.18}
  style={{ textAlign: 'center', fontFamily: 'Amboqia' }}
  lineStyle={{ fontSize: 64, color: '#fff', marginBottom: 16 }}
/>
```

#### `AnimatedInfoCard`

Styled info panel for events / listings / market details. Eyebrow + headline
+ subhead + details + pills, with built-in dark scrim + backdrop blur and
staggered child entrance.

```tsx
<AnimatedInfoCard
  eyebrow="FRIDAY · 7 PM"
  headline="Bend Spring Festival"
  subhead="Live music, food trucks, over 40 local makers."
  details={[
    { label: 'WHERE', value: 'Drake Park, Bend' },
    { label: 'PRICE', value: 'Free' },
  ]}
  pills={[{ text: 'Free entry' }, { text: 'Family friendly' }]}
  placement="bottom"
/>
```

#### `CounterAnimation`

Animated number counter for stat reveals. Counts from `from` → `to` over
`durationSec`. Optional bar fill renders alongside.

```tsx
<CounterAnimation
  to={475_000}
  durationSec={2.5}
  prefix="$"
  curve="spring"
  spring="snappy"
  style={{ fontFamily: 'Amboqia', fontSize: 220, color: '#fff' }}
  bar={{ height: 12, fill: '#D4AF37' }}
/>
```

The displayed number is guaranteed to land exactly on `to` at the final
frame — no off-by-one rounding artefacts when stitched into multi-stat
scenes.

### Overlays

#### `GradientOverlay`

Animated gradient background. Solid colors are banned; drop this anywhere
you'd otherwise pass a single hex.

Modes: `drift` (linear, default), `sweep` (conic rotation), `pulse`
(radial wobble).

```tsx
<GradientOverlay mode="drift" colors={['#0A1A2E', '#102742', '#173356']} cycleSec={14} />
```

#### `ScrimLayer`

Dark overlay for text legibility. Six directional gradients +
`autoContrast` mode that ramps opacity over the scene.

```tsx
<ScrimLayer direction="bottom" opacity={0.78} autoContrast durationSec={4} />
```

#### `ParticleOverlay`

Configurable particles, pure SVG, deterministic.

Presets: `confetti`, `floating-lights`, `speed-lines`, `snow`, `sparkle`,
`bubbles`.

```tsx
<ParticleOverlay preset="confetti" durationSec={5} intensity={1} />
```

#### `EmojiReaction`

Emoji pops anchored to a point on the frame. Use on extreme data points.

```tsx
<EmojiReaction
  emoji="🔥"
  delaySec={1.2}
  count={3}
  spread={120}
  anchorXPct={70}
  anchorYPct={40}
  spring="bouncy"
/>
```

#### `PIPPresenter`

Picture-in-picture presenter cutout. Pinned to a corner with circle / rounded
/ square shape and animated entrance.

```tsx
<PIPPresenter
  imageSrc={staticFile('matt_headshot.png')}
  corner="bottom-right"
  shape="circle"
  sizePct={28}
  entrance="scale-pop"
  durationSec={45}  // gentle pulse over the whole VO
/>
```

Use a pre-keyed PNG / WebM with alpha — chroma-key is not applied on the fly.

#### `ProgressIndicator`

Scene counter / progress bar pinned to the frame.

Styles: `dots`, `bar`, `segmented`. Placement: `top` / `bottom`.

```tsx
<ProgressIndicator
  totalScenes={6}
  currentScene={2}
  sceneProgress={0.4}   // 0..1 within the current scene
  style="segmented"
  placement="top"
  label="03 OF 06"
/>
```

### Transitions

#### `SceneTransition` (master)

Wrap an outgoing or incoming scene. Pairs with Remotion's `<Sequence>`
overlap pattern.

Variants: `crossfade`, `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down`,
`diagonal-wipe`, `circle-iris`, `zoom-through`, `slide-push`.

```tsx
<Sequence from={lastBeatStart} durationInFrames={lastBeatLen + overlap}>
  <SceneTransition mode="out" variant="zoom-through" durationSec={0.5}>
    <PreviousBeat />
  </SceneTransition>
</Sequence>
<Sequence from={lastBeatStart + lastBeatLen} durationInFrames={nextBeatLen}>
  <SceneTransition mode="in" variant="zoom-through" durationSec={0.5}>
    <NextBeat />
  </SceneTransition>
</Sequence>
```

#### Standalone wrappers

For ergonomics, `transitions.tsx` exports pre-bound variants:

- `CrossfadeTransition`
- `WipeTransition` (requires `direction`)
- `SlideTransition`
- `IrisTransition`
- `ZoomThroughTransition`
- `DiagonalWipeTransition`

```tsx
<WipeTransition mode="out" direction="left" durationSec={0.4}>
  <Beat />
</WipeTransition>
```

### Composition

#### `FrameComposer`

Enforces the **min 3 visual layers per frame** rule. Slot-based layout:

```tsx
<FrameComposer
  background={<GradientOverlay mode="drift" colors={[NAVY, NAVY_DEEP]} />}
  content={<ParallaxPhoto src={hero} durationSec={4} />}
  overlay={
    <>
      <ScrimLayer direction="bottom" />
      <AnimatedInfoCard headline="…" />
    </>
  }
  effects={<ParticleOverlay preset="floating-lights" durationSec={4} />}
  chrome={<ProgressIndicator totalScenes={6} currentScene={2} />}
/>
```

If any required slot (background / content / overlay) is missing, FrameComposer
renders a red developer warning ribbon at the top of the frame so you spot
the problem during preview. Use `allowMinimal` only with a code comment
justifying the choice.

`assertFrameComposition(props)` is a programmatic version for use in unit
tests / pre-render checks.

### QA

#### `MotionValidator` (Node-only)

Pixel-diff QA on a rendered MP4. Use in a pre-publish gate.

```ts
import { validateRender, formatReport } from '.../shared/components/motion/MotionValidator';

const report = await validateRender('out/render.mp4', {
  staticThreshold: 0.005,
  stride: 15, // sample 2 frames/sec at 30fps
});

console.log(formatReport(report));
if (!report.passed) {
  process.exit(1);
}
```

Returns a list of windows where consecutive sampled frames differ by less
than `staticThreshold` (mean per-channel diff 0..1). Tight default for
clean Remotion renders; raise for noisy live footage.

This module is intentionally pure-Node — no `react`, no `remotion` — so it
can run in CI without booting a browser. PNG decoding is hand-rolled to
avoid bringing in extra deps.

## `motionPresets` — the routing layer

`motionPresets.ts` maps a `SceneEnergy` tag to a recommended combo of:

- `primary` — photo motion (parallax / mask-reveal / split / collage / ken-burns)
- `text` — KineticText variant + spring + duration
- `transition` — SceneTransition variant + duration
- `particles` (optional) — ParticleOverlay preset
- `accent` (optional) — accent color override

| Tag                 | Primary motion           | Particles         | Text variant     |
|---------------------|--------------------------|-------------------|------------------|
| `party`             | mask-reveal `iris-open`  | confetti          | spring-bounce    |
| `elegant`           | parallax `push-in`       | floating-lights   | fade-slide-up    |
| `sports`            | mask-reveal `slash`      | speed-lines       | slide-left       |
| `outdoor`           | parallax `pan-right`     | —                 | scale-from-center|
| `food`              | split `left-right`       | sparkle (subtle)  | fade-slide-up    |
| `family`            | collage grid             | —                 | split-chars      |
| `arts`              | mask-reveal `curtain`    | sparkle           | fade-slide-up    |
| `music`             | parallax `push-in`       | confetti          | spring-bounce    |
| `holiday`           | mask-reveal `circle`     | snow              | spring-bounce    |
| `business`          | split `left-right`       | —                 | fade-slide-up    |
| `data`              | mask-reveal `split-v`    | —                 | typewriter       |
| `listing-luxury`    | parallax (depth-cut)     | floating-lights   | fade-slide-up    |
| `listing-standard`  | parallax `pan-right`     | —                 | fade-slide-up    |
| `default`           | **Ken Burns** (fallback) | —                 | fade-slide-up    |

### Adding a new energy tag

1. Add the literal to `SceneEnergy` in `motionPresets.ts`.
2. Add a new entry to the `motionPresets` map.
3. Add a row to the table above and update the example below.
4. If your build agent classifies events automatically, add the new tag to
   its classification rules.

## Composing a scene end-to-end

A typical scene wires the preset's pieces around a `FrameComposer`:

```tsx
import {
  AbsoluteFill,
  staticFile,
  useVideoConfig,
} from 'remotion';
import {
  ParallaxPhoto, MaskReveal, KineticText, AnimatedInfoCard,
  ParticleOverlay, GradientOverlay, ScrimLayer, FrameComposer,
  KenBurns, getMotionPreset, type SceneEnergy,
} from '../../shared/components/motion';

type SceneInput = {
  energy: SceneEnergy;
  hero: string;
  depthDir?: string;
  headline: string;
  durationSec: number;
};

export const Scene: React.FC<SceneInput> = ({
  energy, hero, depthDir, headline, durationSec,
}) => {
  const preset = getMotionPreset(energy);

  // Primary motion — branch on preset.primary.kind.
  const photoLayer = (() => {
    const p = preset.primary;
    switch (p.kind) {
      case 'parallax':
        return (
          <ParallaxPhoto
            src={staticFile(hero)}
            depthDir={depthDir ? staticFile(depthDir) : undefined}
            durationSec={durationSec}
            direction={p.direction}
            intensity={p.intensity}
          />
        );
      case 'mask-reveal':
        return (
          <MaskReveal shape={p.shape} durationSec={0.8}>
            <ParallaxPhoto src={staticFile(hero)} durationSec={durationSec} />
          </MaskReveal>
        );
      case 'ken-burns':
      default:
        return (
          <KenBurns
            src={staticFile(hero)}
            durationSec={durationSec}
            direction={p.kind === 'ken-burns' ? p.direction : 'zoom-in-center'}
          />
        );
    }
  })();

  return (
    <FrameComposer
      background={
        <GradientOverlay
          mode="drift"
          colors={['#0A1A2E', '#102742', '#173356']}
        />
      }
      content={photoLayer}
      overlay={
        <>
          <ScrimLayer direction="bottom" autoContrast durationSec={durationSec} />
          <AnimatedInfoCard
            headline={headline}
            delaySec={0.3}
            accent={preset.accent}
          />
        </>
      }
      effects={
        preset.particles ? (
          <ParticleOverlay
            preset={preset.particles.preset}
            durationSec={durationSec}
            intensity={preset.particles.intensity}
          />
        ) : null
      }
    />
  );
};
```

Wrap this scene in a `<SceneTransition>` (or a standalone `CrossfadeTransition`
etc.) at the parent comp level when wiring in/out between Sequences.

## Frame-size compatibility

Every component is tested at both:

- **Portrait 1080×1920** — primary delivery for short-form social.
- **Landscape 1920×1080** — used by `video/cascade-peaks` and other cinematic
  comps.

Components use percentage-based positioning, `100%`/`100vw`/`vh` units, or
`useVideoConfig().width / .height` so they scale without code changes.

`AnimatedInfoCard.maxWidth` defaults to `900px` which works for both — set
explicitly if you need a tighter card on landscape.

## Guidance for agents picking motion

- **Parallax beats Ken Burns by default.** For any photo where the subject
  has clear foreground separation (a person, a building, a tree against
  sky), `ParallaxPhoto` in fake mode looks better than Ken Burns and
  costs the same. Only fall back to Ken Burns for textural / abstract
  photos with no clear depth.
- **Mask reveals are a hook tool.** They burn attention budget — use them
  on the *first* beat or at major register shifts, not every beat.
- **Particles need restraint.** `intensity > 0.85` is rarely the right
  call. Start at 0.6 and only go up if the scene reads as too quiet.
- **Two transition variants per video** (one default + one for hard register
  shifts) reads cleaner than five different ones.
- **Gradient backgrounds beat solid colors every time.** If you typed a hex
  string into `backgroundColor`, you missed a chance to use `GradientOverlay`.
- **Wrap text in `KineticText` or `TextReveal`.** Static `<div>{copy}</div>`
  in a video scene is a regression — every line should animate in.
- **Use `FrameComposer` for new scenes.** It shows you when you've forgotten
  a layer before render time, not after.
- **`MotionValidator` runs in seconds.** Wire it into your render script's
  exit gate — bad renders fail loudly instead of slipping through.
- **Ken Burns is the fallback, not the default.** If your code defaults
  to `motionPresets.default`, that's a missed classification — go back
  and tag the scene properly.
