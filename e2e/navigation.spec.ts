import { test, expect } from '@playwright/test'

test.describe('Navigation & Public Pages', () => {
  test.describe('Landing page', () => {
    test('hero section displays X+1 branding', async ({ page }) => {
      await page.goto('/')
      // Header has X+1 brand text
      await expect(page.locator('header').getByText('X+1')).toBeVisible()
    })
  })

  test.describe('Public pages', () => {
    test('privacy page loads successfully', async ({ page }) => {
      const response = await page.goto('/privacy')
      expect(response?.status()).toBeLessThan(400)
      await expect(page.locator('body')).not.toBeEmpty()
    })

    test('terms page loads successfully', async ({ page }) => {
      const response = await page.goto('/terms')
      expect(response?.status()).toBeLessThan(400)
      await expect(page.locator('body')).not.toBeEmpty()
    })

    test('404 page renders for unknown routes', async ({ page }) => {
      const response = await page.goto('/this-route-does-not-exist-xyz')
      // Next.js returns 404 for unknown routes
      expect(response?.status()).toBe(404)
    })
  })

  test.describe('Navigation flows', () => {
    test('landing -> login -> back returns to landing', async ({ page }) => {
      await page.goto('/')
      await page.locator('a[href="/login"]').first().click()
      await page.waitForURL('**/login', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      await page.goBack()
      await page.waitForURL('**/', { timeout: 15000 })
    })
  })

  test.describe('Footer', () => {
    test('footer contains login, signup, privacy, and terms links', async ({ page }) => {
      await page.goto('/')
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      await expect(footer.locator('a[href="/login"]')).toBeVisible()
      await expect(footer.locator('a[href="/signup"]')).toBeVisible()
      await expect(footer.locator('a[href="/privacy"]')).toBeVisible()
      await expect(footer.locator('a[href="/terms"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('header navigation anchors have accessible names', async ({ page }) => {
      await page.goto('/')
      const headerLinks = page.locator('header a')
      const count = await headerLinks.count()
      for (let i = 0; i < count; i++) {
        const link = headerLinks.nth(i)
        const accessibleName = await link.evaluate(
          (el) => el.textContent?.trim() || el.getAttribute('aria-label') || ''
        )
        expect(accessibleName.length).toBeGreaterThan(0)
      }
    })
  })
})
