import React from 'react'
import { Composition, Still } from 'remotion'
import { ColdOpen, EndCard, TitleCard, Wordmark, FPS } from './brand'
import './brand/loadFonts'
import { Episode1 } from './episodes/Episode1'

/**
 * Earnest. Remotion compositions.
 *
 * Standalone brand pieces (ColdOpen, EndCard, Wordmark, TitleCard) are
 * registered for individual review and audio-pass alignment. Episodes
 * compose them.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Brand pieces — for review, audio pickups, and reuse */}
      <Composition
        id="EarnestColdOpen"
        component={ColdOpen}
        durationInFrames={60} // 2.0s @ 30fps
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="EarnestEndCard"
        component={EndCard}
        durationInFrames={120} // 4.0s @ 30fps
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="EarnestTitleCard"
        component={TitleCard}
        durationInFrames={99} // 3.3s @ 30fps
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          pullQuote: 'She told her kids to live their own lives.',
          episodeTag: 'E01',
        }}
      />
      <Still
        id="EarnestWordmark"
        component={Wordmark}
        width={1080}
        height={1920}
        defaultProps={{
          horizonProgress: 1,
          wordmarkOpacity: 1,
          groupOpacity: 1,
        }}
      />

      {/* Episodes */}
      <Composition
        id="Episode1"
        component={Episode1}
        durationInFrames={1800} // 60s @ 30fps
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  )
}
