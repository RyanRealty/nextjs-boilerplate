import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E and visual regression testing.
 *
 * Usage:
 *   npm run test:e2e                    — Run all E2E tests (chromium)
 *   npm run test:e2e:ui                 — Open Playwright UI mode
 *   npm run test:e2e:update-snapshots   — Update visual regression baselines
 *
 * In CI, the app is built first (`npm run build`) then served via `next start`.
 * Locally, reuses an existing dev server if one is running.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Parallel tests in CI, sequential locally for stability */
  workers: process.env.CI ? 2 : 1,

  /* Reporter: HTML locally, GitHub-friendly in CI */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'e2e/html-report' }]]
    : [['html', { open: 'on-failure', outputFolder: 'e2e/html-report' }]],

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* Screenshot comparison tolerance */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },

  /* Projects — chromium only for speed in CI, add more for full coverage */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],

  /* Start the Next.js production server before running tests */
  webServer: {
    command: 'npm run start:ci',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
