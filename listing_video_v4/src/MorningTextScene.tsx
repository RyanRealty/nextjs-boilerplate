// MorningTextScene.tsx — Three.js (R3F) animated 3D text reveal
//
// Renders "YOUR MORNING" / "IN TUMALO" as real extruded TextGeometry letters
// in a Three.js scene with three-point lighting, fog, and a flythrough camera
// path. Output is a transparent-background frame sequence that Tumalo.tsx
// composites over Beat 4 (great-room push-in) at 8.0s.
//
// 3.5s @ 30fps = 105 frames. Frames render as PNGs to
// public/images/morning_text/morning_<frame>.png and are loaded back into
// the main composition via <Img>.
//
// Camera path:
//   0.0–1.0s  ("emerge"):  cam at z=80 looking at origin; text scales 0.4→1.0
//                          with opacity 0→1, slight Y rotation settle.
//   1.0–2.0s  ("dolly"):   cam glides z=80→z=18 with subtle orbit (x oscillation
//                          ±6) — feels like a steadicam approaching the letters.
//   2.0–3.0s  ("fly-through"): cam continues z=18 → z=-25 PASSING the text plane
//                              (text at z=-15) so letterforms whoosh past camera.
//                              Camera tilts up 0→8° to look back at receding text.
//   3.0–3.5s  ("exit"):   text opacity 1→0 as cam continues away; faint rim light
//                         decay so the letters dissolve cleanly.
//
// Lighting:
//   - Key:  warm gold (#C8A864) directional from upper-right, intensity 1.2
//   - Fill: cool cream (#F2EBDD) directional from lower-left, intensity 0.5
//   - Rim:  bright white from behind, intensity 1.6 (haloes silhouettes)
//   - Ambient: warm soft 0.35
//
// Material: cream off-white (#F8F4EA) MeshStandardMaterial,
//   metalness 0.18, roughness 0.42 → polished plaster / aged ivory read.
//
// Fog: linear fog from z=-30 to z=-80, color #1a0f08 (warm dark), creates
// atmospheric depth so distant letters fade to silhouette.

import React from 'react';
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Text3D, Center } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const MORNING_TEXT_TOTAL_SEC = 3.5;

// ─── Easing helpers ──────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInQuad = (t: number) => t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

// ─── Inner scene — gets useFrame access via R3F ─────────────────────────────
type SceneProps = { tSec: number };

const SceneContent: React.FC<SceneProps> = ({ tSec }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  // Drive R3F's default camera each render. useThree returns the live camera
  // and is stable across renders; mutating its position + lookAt before R3F
  // paints (via useLayoutEffect) guarantees the frame picks up the new pose.
  const { camera } = useThree();

  // ─── Camera path math ─────────────────────────────────────────────────────
  // Phase boundaries in seconds.
  const t = clamp(tSec, 0, MORNING_TEXT_TOTAL_SEC);

  // Phase 1: emerge (0.0–1.0s)
  const emergeT = clamp(t / 1.0, 0, 1);
  // Phase 2: dolly (1.0–2.0s)
  const dollyT = clamp((t - 1.0) / 1.0, 0, 1);
  // Phase 3: flythrough (2.0–3.0s)
  const flyT = clamp((t - 2.0) / 1.0, 0, 1);
  // Phase 4: exit (3.0–3.5s)
  const exitT = clamp((t - 3.0) / 0.5, 0, 1);

  // Camera Z: starts far (110), dollies to medium-near (45), flies through (-30).
  // Wider start gives a clean comfortable opening read of all three lines.
  // The dolly closes 65 units over phase 2; flythrough closes 75 units in phase
  // 3 (faster — that's where the "whoosh past" feel lives).
  const camZ =
    t < 1.0
      ? 110
      : t < 2.0
      ? 110 - 65 * easeInOutCubic(dollyT)
      : t < 3.0
      ? 45 - 75 * easeOutCubic(flyT)
      : -30 - 25 * exitT;

  // Camera X: subtle orbit during dolly, hold during flythrough
  const camX =
    t < 1.0
      ? 0
      : t < 2.0
      ? 6 * Math.sin(dollyT * Math.PI)
      : t < 3.0
      ? 6 * Math.sin(Math.PI - 2 * flyT * Math.PI / 3) * 0.5
      : 0;

  // Camera Y: slight rise as it approaches, tilt up at flythrough
  const camY =
    t < 1.0
      ? -2 + 4 * easeOutCubic(emergeT)
      : t < 2.0
      ? 2 + 1.5 * easeInOutCubic(dollyT)
      : t < 3.0
      ? 3.5 + 2.5 * easeOutCubic(flyT)
      : 6 + 3 * exitT;

  // Camera lookAt target: origin during emerge/dolly; tilts back during flythrough
  const lookY =
    t < 2.0 ? 0 : t < 3.0 ? -2 * easeInQuad(flyT) : -2 - 1.5 * exitT;

  // Text scale: small to full during emerge phase
  const textScale =
    t < 1.0 ? 0.4 + 0.6 * easeOutQuart(emergeT) : 1.0;

  // Text Y rotation: settles from -0.32 rad (-18°) to -0.10 rad (-6°) during
  // emerge, holds at -0.10 thereafter. Constant -6° turn after settle keeps a
  // visible right-side wall at every camera distance — without this, the
  // text reads as a flat decal when the camera is far back.
  const textRotY =
    t < 1.0 ? -0.32 + 0.22 * easeOutCubic(emergeT) : -0.10;

  // Per-line "Blonde Waterfall" cascade entries — each line emerges + falls
  // into place. Stagger:
  //   Line 1 ("YOUR")        emerges 0.05–0.55s
  //   Line 2 ("MORNING IN")  emerges 0.30–0.85s
  //   Line 3 ("TUMALO")      emerges 0.55–1.10s
  // After 1.1s all three lines are at full opacity. They hold through 3.0s,
  // then fade together during exit (3.0–3.5s).
  const lineOpacity = (start: number, dur: number) => {
    if (t < start) return 0;
    if (t > 3.0) return 1.0 - easeInQuad(exitT);
    return clamp(easeOutCubic((t - start) / dur), 0, 1);
  };
  // Per-line drop offset (Y translation that resolves to 0). Lines start
  // ~3.5 units above their resting position and fall into place with the
  // emerge curve.
  const lineDrop = (start: number, dur: number) => {
    if (t < start) return 4.5;
    if (t > start + dur) return 0;
    return (1 - easeOutQuart((t - start) / dur)) * 4.5;
  };
  const op1 = lineOpacity(0.05, 0.5);
  const op2 = lineOpacity(0.30, 0.55);
  const op3 = lineOpacity(0.55, 0.55);
  const drop1 = lineDrop(0.05, 0.5);
  const drop2 = lineDrop(0.30, 0.55);
  const drop3 = lineDrop(0.55, 0.55);
  // Aggregate text opacity for shared material — but we now build per-line
  // materials so each line has its own opacity.

  // Drive R3F's default camera + group transforms BEFORE the WebGL paint
  // (useLayoutEffect runs synchronously after DOM mutations, before browser
  // paint — which is what Remotion's headless Chrome captures). Setting in
  // a plain useEffect runs AFTER the frame is captured, which is why earlier
  // attempts produced identical-looking frames across the entire 3.5s.
  React.useLayoutEffect(() => {
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, lookY, -15);
    if ('fov' in camera) {
      // perspective camera — keep FOV at 28° for cinematic compressed look
      (camera as THREE.PerspectiveCamera).fov = 28;
    }
    camera.updateProjectionMatrix();
    if (groupRef.current) {
      groupRef.current.scale.setScalar(textScale);
      groupRef.current.rotation.y = textRotY;
    }
  });

  const fontPath = staticFile('fonts3d/optimer_bold.typeface.json');

  // Per-line material factory — each line has its own opacity. Emissive
  // pushed high (0.85) so the front face glows luminous gold even from far
  // distance against bright photo backgrounds. Without the bump, the text
  // read as flat dark silhouettes during the emerge phase (cam at z=110)
  // when the side wall extrusion is foreshortened to invisibility. At
  // close distance the three-point lighting still models the side walls
  // cleanly — emissive does not wash out the side-wall shading.
  const mkMaterial = (op: number) => (
    <meshStandardMaterial
      color="#F8F4EA"
      metalness={0.20}
      roughness={0.40}
      transparent
      opacity={op}
      emissive="#D4AF37"
      emissiveIntensity={0.85}
    />
  );

  return (
    <>
      {/* Camera is the R3F default cam, mutated each render via useLayoutEffect
          above. No <PerspectiveCamera> primitive needed. */}

      {/* Atmospheric fog — gives 3D depth read. Pushed to start at z=-40 (well
          behind the text plane at z=-15) so the text itself is OUT of fog. */}
      <fog attach="fog" args={['#1a0f08', 50, 140]} />

      {/* Three-point lighting. Ambient dropped from 0.35 to 0.25 so the
          three-point key/fill/rim do the modeling, not flat fill. */}
      <ambientLight intensity={0.55} color="#fff2dd" />
      <directionalLight
        position={[18, 22, 12]}
        intensity={1.2}
        color="#C8A864"
        castShadow={false}
      />
      <directionalLight
        position={[-15, -8, 8]}
        intensity={0.5}
        color="#F2EBDD"
      />
      <directionalLight
        position={[0, 6, -20]}
        intensity={1.6}
        color="#ffffff"
      />
      {/* A close warm point light that flares as cam passes through */}
      <pointLight
        position={[0, 0, -10]}
        intensity={t > 1.6 && t < 2.6 ? 12 : 4}
        color="#D4AF37"
        distance={45}
        decay={2}
      />

      {/* The text group — three stacked lines extruded at z=-15.
       *  "Blonde Waterfall" cascading reveal: per-line entry stagger gives the
       *  feel of letters tumbling down through space. Each line has its own
       *  emerge offset so they don't all appear at once.
       *  Line widths (size 3.4 each):
       *    "YOUR"        ≈ 11 units (4 ch)
       *    "MORNING IN"  ≈ 28 units (10 ch)
       *    "TUMALO"      ≈ 17 units (6 ch)
       *  Visible width at z=-15 from cam z=18 (closest dolly): ~9 units.
       *  Visible width at z=-15 from cam z=80 (start): ~26.6 units.
       *  → All lines fit start-frame; "MORNING IN" partly clips at closest
       *    dolly (intentional — adds the "fly past the type" cinematic read). */}
      <group ref={groupRef} position={[0, 0, -15]}>
        {/* Line 1 — "YOUR" — drops in first */}
        <group position={[0, 3.0 + drop1, 0]}>
          <Center top right={false} left={false} cacheKey="line1">
            <Text3D
              font={fontPath}
              size={1.85}
              height={0.7}
              curveSegments={6}
              bevelEnabled
              bevelThickness={0.09}
              bevelSize={0.055}
              bevelOffset={0}
              bevelSegments={5}
            >
              YOUR
              {mkMaterial(op1)}
            </Text3D>
          </Center>
        </group>
        {/* Line 2 — "MORNING IN" — drops in second */}
        <group position={[0, 0.2 + drop2, 0]}>
          <Center top right={false} left={false} cacheKey="line2">
            <Text3D
              font={fontPath}
              size={1.85}
              height={0.7}
              curveSegments={6}
              bevelEnabled
              bevelThickness={0.09}
              bevelSize={0.055}
              bevelOffset={0}
              bevelSegments={5}
            >
              MORNING IN
              {mkMaterial(op2)}
            </Text3D>
          </Center>
        </group>
        {/* Line 3 — "TUMALO" — drops in last */}
        <group position={[0, -2.6 + drop3, 0]}>
          <Center top right={false} left={false} cacheKey="line3">
            <Text3D
              font={fontPath}
              size={1.85}
              height={0.7}
              curveSegments={6}
              bevelEnabled
              bevelThickness={0.09}
              bevelSize={0.055}
              bevelOffset={0}
              bevelSegments={5}
            >
              TUMALO
              {mkMaterial(op3)}
            </Text3D>
          </Center>
        </group>
      </group>
    </>
  );
};

// ─── Outer composition ───────────────────────────────────────────────────────
export const MorningTextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const tSec = frame / fps;

  return (
    <AbsoluteFill style={{ background: 'transparent' }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
        }}
        // Transparent background so PNG output preserves alpha.
        // (clearColor + clearAlpha set inside the canvas.)
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
      >
        <SceneContent tSec={tSec} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
