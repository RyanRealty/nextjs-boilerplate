import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

/**
 * Load Inter Display (Black 900, Medium 500) and Inter Regular (400) for the
 * Earnest. brand system. Called once at module load. @remotion/fonts handles
 * the @font-face injection in both Studio preview and headless rendering so
 * the wordmark renders in Inter Display Black instead of a system fallback.
 */

void loadFont({
  family: 'Inter Display',
  url: staticFile('fonts/InterDisplay-Black.woff2'),
  weight: '900',
  style: 'normal',
  format: 'woff2',
})

void loadFont({
  family: 'Inter Display',
  url: staticFile('fonts/InterDisplay-Medium.woff2'),
  weight: '500',
  style: 'normal',
  format: 'woff2',
})

void loadFont({
  family: 'Inter',
  url: staticFile('fonts/Inter-Regular.woff2'),
  weight: '400',
  style: 'normal',
  format: 'woff2',
})
