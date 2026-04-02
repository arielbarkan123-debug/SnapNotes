import { test, expect } from '@playwright/test'

test.describe('Smoke Tests @smoke', () => {
  test('/api/health returns 200 with ok status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  test('landing page loads under 10 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { timeout: 10000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(10000)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('login page renders form elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('/api/courses returns 401 for unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/courses')
    expect(response.status()).toBe(401)
  })

  test('static assets load (favicon)', async ({ request }) => {
    const response = await request.get('/favicon.ico')
    expect(response.status()).toBe(200)
  })

  test('no console errors on landing page', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Filter out known third-party/non-critical errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('third-party') &&
        !err.includes('404 (Not Found)')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('SEO meta tags are present on landing page', async ({ page }) => {
    await page.goto('/')
    // Title should contain X+1
    const title = await page.title()
    expect(title).toContain('X+1')

    // Meta description should be present and non-empty
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content')
    expect(metaDescription).toBeTruthy()
    expect(metaDescription!.length).toBeGreaterThan(10)
  })

  test('OpenGraph tags are present (non-breaking)', async ({ page }) => {
    await page.goto('/')
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content')
    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content')
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content')

    // These should ideally be present but we make the test non-breaking
    // by logging warnings instead of hard-failing on missing OG tags
    if (!ogTitle) {
      console.warn('Missing og:title meta tag')
    }
    if (!ogDescription) {
      console.warn('Missing og:description meta tag')
    }
    if (!ogImage) {
      console.warn('Missing og:image meta tag')
    }

    // At minimum, og:title should be set
    expect(ogTitle).toBeTruthy()
  })
})
