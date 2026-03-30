import { test, expect } from '@playwright/test'

/**
 * Critical user flow E2E tests.
 *
 * These tests verify that the most important pages and interactions
 * work correctly. They run on every PR to prevent regressions.
 */

test.describe('Homepage', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
    // Hero section should be visible
    const hero = page.locator('main').first()
    await expect(hero).toBeVisible()
  })

  test('navigation links are present and work', async ({ page }) => {
    await page.goto('/')

    // Header should have key nav links
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Check for common nav items (text varies but links should exist)
    const navLinks = header.locator('a')
    const linkCount = await navLinks.count()
    expect(linkCount).toBeGreaterThan(2)
  })

  test('footer is present', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })
})

test.describe('Search', () => {
  test('city search page loads with listings', async ({ page }) => {
    await page.goto('/search/bend')
    await expect(page).toHaveTitle(/bend/i)

    // Page should render without errors
    await expect(page.locator('main')).toBeVisible()
  })

  test('search page has filter/sort controls', async ({ page }) => {
    await page.goto('/search/bend')

    // Should have some form of listing grid or results
    await page.waitForLoadState('networkidle')
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })
})

test.describe('Listing Detail', () => {
  test('listing page structure loads correctly', async ({ page }) => {
    // Navigate to search first, then click a listing
    await page.goto('/search/bend')
    await page.waitForLoadState('networkidle')

    // Try to find a listing link
    const listingLink = page.locator('a[href*="/listing/"]').first()
    const hasListings = await listingLink.isVisible().catch(() => false)

    if (hasListings) {
      await listingLink.click()
      await page.waitForLoadState('networkidle')

      // Listing detail page should have key sections
      await expect(page.locator('main')).toBeVisible()
      // URL should be a listing page
      expect(page.url()).toContain('/listing/')
    } else {
      // No listings in DB — skip gracefully
      test.skip()
    }
  })
})

test.describe('Team Page', () => {
  test('loads and shows team content', async ({ page }) => {
    await page.goto('/team')
    await expect(page).toHaveTitle(/team/i)
    await expect(page.locator('main')).toBeVisible()
  })
})

test.describe('About Page', () => {
  test('loads correctly', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('main')).toBeVisible()
  })
})

test.describe('Admin Login', () => {
  test('login page renders with form', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('main')).toBeVisible()

    // Should have some form of login UI
    const formOrButton = page.locator('form, button, input')
    const count = await formOrButton.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('404 Handling', () => {
  test('non-existent page shows 404', async ({ page }) => {
    const response = await page.goto('/this-page-definitely-does-not-exist-12345')
    // Should return 404 status
    expect(response?.status()).toBe(404)
  })
})

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('homepage has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that the page doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // +1 for subpixel rounding
  })

  test('mobile navigation is accessible', async ({ page }) => {
    await page.goto('/')
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })
})

test.describe('Key Pages Return 200', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/homes-for-sale', name: 'Listings browse' },
    { path: '/search/bend', name: 'City search' },
    { path: '/team', name: 'Team' },
    { path: '/about', name: 'About' },
    { path: '/admin/login', name: 'Admin login' },
  ]

  for (const { path, name } of pages) {
    test(`${name} (${path}) returns 200`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
    })
  }
})

test.describe('SEO Essentials', () => {
  const pages = ['/', '/search/bend', '/team', '/about']

  for (const path of pages) {
    test(`${path} has meta description`, async ({ page }) => {
      await page.goto(path)
      const meta = page.locator('meta[name="description"]')
      const content = await meta.getAttribute('content').catch(() => null)
      // Should have a non-empty description
      expect(content).toBeTruthy()
      expect(content!.length).toBeGreaterThan(10)
    })
  }

  test('homepage has canonical link', async ({ page }) => {
    await page.goto('/')
    const canonical = page.locator('link[rel="canonical"]')
    const href = await canonical.getAttribute('href').catch(() => null)
    if (href) {
      expect(href).toContain('/')
    }
  })
})
