import { test, expect } from '@playwright/test'

test.describe('Authentication & Login', () => {
  test.describe('Landing page', () => {
    test('loads with login and signup links', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('a[href="/login"]').first()).toBeVisible()
      await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    })
  })

  test.describe('Login page', () => {
    test('renders email, password fields and submit button', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('shows validation errors for empty fields on submit', async ({ page }) => {
      await page.goto('/login')
      await page.locator('button[type="submit"]').click()
      // Client-side validation should show error messages
      const errorElements = page.locator('[class*="text-red"]')
      await expect(errorElements.first()).toBeVisible({ timeout: 5000 })
    })

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/login')
      await page.locator('input[name="email"]').fill('invalid@test.com')
      await page.locator('input[name="password"]').fill('wrongpassword123')
      await page.locator('button[type="submit"]').click()
      // Should show server error after failed login attempt
      const errorBanner = page.locator('[class*="bg-red"]')
      await expect(errorBanner).toBeVisible({ timeout: 15000 })
    })

    test('client-side validation rejects malformed email', async ({ page }) => {
      await page.goto('/login')
      await page.locator('input[name="email"]').fill('not-an-email')
      await page.locator('input[name="password"]').fill('somepassword')
      await page.locator('button[type="submit"]').click()
      const errorElements = page.locator('[class*="text-red"]')
      await expect(errorElements.first()).toBeVisible({ timeout: 5000 })
    })

    test('has labels associated with inputs for accessibility', async ({ page }) => {
      await page.goto('/login')
      // Check that each input has an associated label
      const emailInput = page.locator('input[name="email"]')
      const emailId = await emailInput.getAttribute('id')
      if (emailId) {
        await expect(page.locator(`label[for="${emailId}"]`)).toBeAttached()
      }

      const passwordInput = page.locator('input[name="password"]')
      const passwordId = await passwordInput.getAttribute('id')
      if (passwordId) {
        await expect(page.locator(`label[for="${passwordId}"]`)).toBeAttached()
      }
    })

    test('has link to forgot password page', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible()
    })

    test('has link to signup page', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('a[href="/signup"]')).toBeVisible()
    })
  })

  test.describe('Protected route redirects', () => {
    test('/dashboard redirects to /login', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
    })

    test('/courses redirects with redirectTo param', async ({ page }) => {
      await page.goto('/courses')
      await page.waitForURL('**/login**', { timeout: 15000 })
      expect(page.url()).toContain('/login')
      expect(page.url()).toContain('redirectTo=%2Fcourses')
    })
  })

  test.describe('Forgot password page', () => {
    test('renders email field and submit button', async ({ page }) => {
      await page.goto('/forgot-password')
      await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })

  test.describe('Signup page', () => {
    test('renders name, email, password, and confirmPassword fields', async ({ page }) => {
      await page.goto('/signup')
      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })

  test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('login form renders and submit button is full-width', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeVisible()
      // Submit button should have w-full class for mobile
      await expect(submitButton).toHaveClass(/w-full/)
    })
  })
})
