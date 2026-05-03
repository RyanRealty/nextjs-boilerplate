import { Composition, staticFile } from 'remotion'
import { EvergreenExplainer, EvergreenInput, computeDurationFrames } from './EvergreenExplainer'
import { FPS, PORTRAIT_HEIGHT, PORTRAIT_WIDTH } from './brand'
import { defaultPreviewProps } from './scenes/preview-data'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EvergreenExplainer"
        component={EvergreenExplainer}
        durationInFrames={computeDurationFrames(defaultPreviewProps)}
        fps={FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={defaultPreviewProps}
        calculateMetadata={({ props }: { props: EvergreenInput }) => ({
          durationInFrames: computeDurationFrames(props),
        })}
      />
    </>
  )
}

// Suppress lint on staticFile import — used implicitly via defaultProps
void staticFile
