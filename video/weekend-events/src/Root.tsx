import React from 'react'
import { Composition } from 'remotion'
import { WeekendEvents, computeDurationFrames } from './WeekendEvents'
import { FPS, DIMS, type Aspect } from './brand'
import { fixtureProps } from './VideoProps.fixture'
import type { VideoProps } from './VideoProps'

// All five aspects share the fixture props — only `aspect` and dims differ.
const makeDefault = (aspect: Aspect): VideoProps => ({
  ...fixtureProps,
  aspect,
})

export const RemotionRoot: React.FC = () => {
  const aspects: Aspect[] = ['16x9', '9x16', '1x1', '2x3', '4x5']

  return (
    <>
      {aspects.map((aspect) => {
        const dims    = DIMS[aspect]
        const defProps = makeDefault(aspect)
        const id = `WeekendEvents_${aspect.replace('x', 'x')}`

        return (
          <Composition
            key={id}
            id={id}
            component={WeekendEvents}
            durationInFrames={computeDurationFrames(defProps)}
            fps={FPS}
            width={dims.width}
            height={dims.height}
            defaultProps={defProps}
            calculateMetadata={({ props }) => ({
              durationInFrames: computeDurationFrames(props),
              width: DIMS[props.aspect].width,
              height: DIMS[props.aspect].height,
            })}
          />
        )
      })}
    </>
  )
}
