import { test, expect } from '@playwright/test'

test.describe('Courses & Course Routes', () => {
  test.describe('Protected route redirects', () => {
    test('/courses redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/courses')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fcourses')
    })

    test('/course/:id redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/course/some-uuid-123')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fcourse%2Fsome-uuid-123')
    })

    test('/dashboard redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fdashboard')
    })

    test('/homework redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/homework')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fhomework')
    })

    test('/review redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/review')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Freview')
    })

    test('/settings redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fsettings')
    })
  })

  test.describe('Landing page course elements', () => {
    test('hero section has a heading', async ({ page }) => {
      await page.goto('/')
      const heroHeading = page.locator('h1')
      await expect(heroHeading).toBeVisible()
    })

    test('has course creation CTA (get started / signup link)', async ({ page }) => {
      await page.goto('/')
      // The hero section has a "Get Started" link pointing to /signup
      const ctaLink = page.locator('a[href="/signup"]').first()
      await expect(ctaLink).toBeVisible()
    })

    test('footer has links to /privacy and /terms', async ({ page }) => {
      await page.goto('/')
      const footer = page.locator('footer')
      await expect(footer.locator('a[href="/privacy"]')).toBeVisible()
      await expect(footer.locator('a[href="/terms"]')).toBeVisible()
    })
  })

  test.describe('Mobile responsive landing', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('landing page renders on mobile viewport', async ({ page }) => {
      await page.goto('/')
      const heroHeading = page.locator('h1')
      await expect(heroHeading).toBeVisible()
      // Navigation links should still be present
      await expect(page.locator('a[href="/login"]').first()).toBeVisible()
    })
  })
})
