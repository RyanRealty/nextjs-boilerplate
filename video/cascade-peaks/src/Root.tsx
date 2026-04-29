// Remotion composition registration.

import React from 'react';
import { Composition } from 'remotion';

import { CascadePeaks } from './CascadePeaks';
import { TilesStill } from './TilesStill';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CascadePeaks"
        component={CascadePeaks}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TilesStill"
        component={TilesStill}
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          lat: 44.0582,
          lon: -121.3153,
          altitudeM: 500,
          azimuthDeg: 0,
          fov: 45,
          pitchDeg: 30,
        }}
      />
    </>
  );
};
