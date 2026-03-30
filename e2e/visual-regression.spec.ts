import { test, expect } from '@playwright/test'

/**
 * Visual regression tests.
 *
 * Captures screenshots of key pages and compares against baselines.
 * First run generates baselines; subsequent runs detect visual changes.
 *
 * To update baselines after intentional UI changes:
 *   npm run test:e2e:update-snapshots
 *
 * Dynamic content (dates, counts, prices) is masked to prevent false positives.
 */

// Common selectors for dynamic content that should be masked
const DYNAMIC_MASKS = [
  // Timestamps, "X minutes ago", dates
  'time',
  '[data-testid="freshness"]',
  // Cookie consent banners
  '[data-testid="cookie-banner"]',
  // Live counters / badges with numbers
  '[data-testid="live-count"]',
]

function getMasks(page: import('@playwright/test').Page) {
  return DYNAMIC_MASKS.map(sel => page.locator(sel)).filter(Boolean)
}

test.describe('Visual Regression — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Wait for any animations to settle
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('search page — Bend', async ({ page }) => {
    await page.goto('/search/bend')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('search-bend-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('team page', async ({ page }) => {
    await page.goto('/team')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('team-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('about page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('about-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('admin login page', async ({ page }) => {
    await page.goto('/admin/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('admin-login-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('listing detail page', async ({ page }) => {
    // Navigate to a listing via search
    await page.goto('/search/bend')
    await page.waitForLoadState('networkidle')

    const listingLink = page.locator('a[href*="/listing/"]').first()
    const hasListings = await listingLink.isVisible().catch(() => false)

    if (!hasListings) {
      test.skip()
      return
    }

    await listingLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('listing-detail-desktop.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })
})

test.describe('Visual Regression — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('homepage mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('search page mobile', async ({ page }) => {
    await page.goto('/search/bend')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('search-bend-mobile.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })

  test('team page mobile', async ({ page }) => {
    await page.goto('/team')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('team-mobile.png', {
      fullPage: false,
      mask: getMasks(page),
    })
  })
})
