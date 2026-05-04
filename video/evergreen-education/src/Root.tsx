import { Composition, staticFile } from 'remotion'
import { EvergreenExplainer, EvergreenInput, computeDurationFrames } from './EvergreenExplainer'
import { EvergreenMasterclass, MasterclassInput, computeMasterclassDuration } from './EvergreenMasterclass'
import { FPS, PORTRAIT_HEIGHT, PORTRAIT_WIDTH } from './brand'
import { defaultPreviewProps, defaultMasterclassProps } from './scenes/preview-data'

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
      <Composition
        id="EvergreenMasterclass"
        component={EvergreenMasterclass}
        durationInFrames={computeMasterclassDuration(defaultMasterclassProps)}
        fps={FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={defaultMasterclassProps}
        calculateMetadata={({ props }: { props: MasterclassInput }) => ({
          durationInFrames: computeMasterclassDuration(props),
        })}
      />
    </>
  )
}

// Suppress lint on staticFile import — used implicitly via defaultProps
void staticFile
