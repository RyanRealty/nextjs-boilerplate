import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setOverwriteOutput(true)
Config.setChromiumOpenGlRenderer('angle')
// concurrency=1 is REQUIRED — Chrome OOMs higher.
Config.setConcurrency(1)
Config.setChromiumHeadlessMode(true)
Config.setDelayRenderTimeoutInMilliseconds(120_000)
