import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

/**
 * Playwright auth setup — runs once before authenticated tests.
 *
 * Logs in via the /login page with email/password, then saves the
 * browser storage state (cookies + localStorage) so that all tests
 * in the "authenticated" project reuse the session without logging
 * in again.
 *
 * Requires env vars:
 *   E2E_SIGNED_IN_EMAIL    — test user email
 *   E2E_SIGNED_IN_PASSWORD — test user password
 *
 * If either is missing the setup is skipped; dependent tests will
 * also be skipped because the storage state file won't exist.
 */
setup('authenticate test user', async ({ page }) => {
  const email = process.env.E2E_SIGNED_IN_EMAIL?.trim()
  const password = process.env.E2E_SIGNED_IN_PASSWORD?.trim()

  if (!email || !password) {
    setup.skip()
    return
  }

  // Navigate to login page
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()

  // Fill in credentials
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)

  // Submit the form
  await page.locator('button[type="submit"]').click()

  // Wait for successful navigation away from /login
  // The app redirects to /dashboard on success
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  })

  // Verify we're authenticated — the page should have loaded
  await expect(page.locator('main').first()).toBeVisible()

  // Save the authenticated browser state for reuse
  await page.context().storageState({ path: AUTH_FILE })
})
