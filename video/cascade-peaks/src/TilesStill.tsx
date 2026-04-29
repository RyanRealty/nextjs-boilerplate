// TilesStill — single-frame Google 3D Tiles quality probe.
//
// Mounts TilesScene at a given lat/lon and parks a fixed camera at altitude
// `altitudeM` south of origin, looking at (0,0,0) on a 30° downward pitch.
// The camera-to-target distance scales with altitude so each render frames a
// proportional patch of ground — i.e. the test is "what does this place look
// like at this altitude" not "what does this exact 100m square look like."
//
// Used by tools/render_tiles_quality.sh to render 5 locations × 3 altitudes
// for a coverage assessment.

import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { TilesScene } from './TilesScene';
import { HEIGHT, WIDTH } from './config';

export type TilesStillProps = {
  lat: number;
  lon: number;
  /** Camera altitude ABOVE GROUND in meters. */
  altitudeM: number;
  /**
   * Ground elevation at (lat, lon) in meters above WGS84 ellipsoid.
   * The EastNorthUpFrame origin gets placed at this height so `altitudeM`
   * is measured above terrain, not above sea level. Bend, OR sits at
   * roughly 1100m, SF Bay floor at ~3m. Without this, low-altitude
   * cameras render below the terrain surface and you get a blank frame.
   */
  groundElevationM?: number;
  /** Compass bearing the camera looks toward. 0 = north, 90 = east. */
  azimuthDeg?: number;
  /** Vertical FOV in degrees. */
  fov?: number;
  /** Downward pitch in degrees (positive = look down). */
  pitchDeg?: number;
};

const StillCameraRig: React.FC<{
  altitudeM: number;
  azimuthDeg: number;
  pitchDeg: number;
  fov: number;
}> = ({ altitudeM, azimuthDeg, pitchDeg, fov }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    set({ camera: cam });
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();

    // Distance back from target so the target sits at center-of-frame at
    // the requested pitch. tan(pitch) = altitude / distance.
    const pitch = (pitchDeg * Math.PI) / 180;
    const distance = altitudeM / Math.tan(pitch);

    // Camera offset direction in ENU (+X east, +Y north). Camera sits OPPOSITE
    // the look direction at the requested distance.
    const az = (azimuthDeg * Math.PI) / 180;
    const dirEast = Math.sin(az);
    const dirNorth = Math.cos(az);
    const camPos = new THREE.Vector3(
      -dirEast * distance,
      -dirNorth * distance,
      altitudeM,
    );
    const target = new THREE.Vector3(0, 0, 0);
    const up = new THREE.Vector3(0, 0, 1);
    const m = new THREE.Matrix4();
    m.lookAt(camPos, target, up);
    cam.up.copy(up);
    cam.position.copy(camPos);
    cam.quaternion.setFromRotationMatrix(m);
  }, [altitudeM, azimuthDeg, pitchDeg, fov, set, size]);

  return (
    <perspectiveCamera
      ref={cameraRef}
      fov={fov}
      near={5}
      far={200_000}
      aspect={WIDTH / HEIGHT}
    />
  );
};

export const TilesStill: React.FC<TilesStillProps> = ({
  lat,
  lon,
  altitudeM,
  groundElevationM = 0,
  azimuthDeg = 0,
  fov = 45,
  pitchDeg = 30,
}) => {
  // Stills frame a small ground patch — far fewer tiles needed than the
  // 25-second peak orbits the main composition uses. Release as soon as
  // streaming quiets down (3s) past a modest minimum (20 loads). Cap total
  // wait at 90s; if Google hasn't streamed enough by then, ship what we have.
  return (
    <TilesScene
      origin={{ lat, lon, height: groundElevationM }}
      minLoads={20}
      quietMs={3_000}
      maxWaitMs={90_000}
    >
      <StillCameraRig
        altitudeM={altitudeM}
        azimuthDeg={azimuthDeg}
        pitchDeg={pitchDeg}
        fov={fov}
      />
    </TilesScene>
  );
};
