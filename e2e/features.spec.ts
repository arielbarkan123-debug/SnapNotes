import { test, expect } from '@playwright/test'

test.describe('Feature Routes (Protected)', () => {
  test.describe('Formula Scanner', () => {
    test('/formula-scanner redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/formula-scanner')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fformula-scanner')
    })
  })

  test.describe('Knowledge Map', () => {
    test('/knowledge-map redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/knowledge-map')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fknowledge-map')
    })
  })

  test.describe('Settings', () => {
    test('/settings redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fsettings')
    })

    test('/settings/past-exams redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/settings/past-exams')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fsettings%2Fpast-exams')
    })
  })

  test.describe('Profile', () => {
    test('/profile redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/profile')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fprofile')
    })
  })

  test.describe('Progress', () => {
    test('/progress redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/progress')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fprogress')
    })
  })

  test.describe('Onboarding', () => {
    test('/onboarding redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fonboarding')
    })
  })

  test.describe('Course Detail & Lesson', () => {
    test('/course/:id redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/course/test-course-id')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fcourse%2Ftest-course-id')
    })

    test('/course/:id/lesson/:index redirects to /login with redirectTo', async ({
      page,
    }) => {
      await page.goto('/course/test-course-id/lesson/0')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain(
        'redirectTo=%2Fcourse%2Ftest-course-id%2Flesson%2F0'
      )
    })
  })

  test.describe('Admin', () => {
    test('/admin/monitoring redirects to /login with redirectTo', async ({ page }) => {
      await page.goto('/admin/monitoring')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fadmin%2Fmonitoring')
    })
  })

  test.describe('Public page accessibility', () => {
    test('landing page has no missing alt text on images', async ({ page }) => {
      await page.goto('/')
      const images = page.locator('img')
      const count = await images.count()
      for (let i = 0; i < count; i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        // Every img tag should have an alt attribute (can be empty for decorative)
        expect(alt).not.toBeNull()
      }
    })
  })

  test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('landing page accessible on mobile', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('a[href="/login"]').first()).toBeVisible()
      await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    })
  })
})
