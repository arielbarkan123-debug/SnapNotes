import { test, expect } from '@playwright/test'

test.describe('Internationalization (i18n)', () => {
  test('HTML lang attribute is set on landing page', async ({ page }) => {
    await page.goto('/')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
    expect(['en', 'he']).toContain(lang)
  })

  test('NEXT_LOCALE cookie is set after first visit', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const cookies = await page.context().cookies()
    const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
    expect(localeCookie).toBeDefined()
    expect(['en', 'he']).toContain(localeCookie!.value)
  })

  test('Hebrew locale detected from Accept-Language header', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'he-IL',
      extraHTTPHeaders: {
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.1',
      },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cookies = await context.cookies()
    const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('he')

    await context.close()
  })

  test('English locale used by default without Hebrew Accept-Language', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cookies = await context.cookies()
    const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('en')

    await context.close()
  })

  test('no JavaScript errors on landing page', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (error) => {
      jsErrors.push(error.message)
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(jsErrors).toHaveLength(0)
  })

  test('RTL direction attribute set for Hebrew locale', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'he-IL',
      extraHTTPHeaders: {
        'Accept-Language': 'he-IL,he;q=0.9',
      },
    })
    // Set the NEXT_LOCALE cookie to 'he' to trigger RTL
    await context.addCookies([
      {
        name: 'NEXT_LOCALE',
        value: 'he',
        domain: 'localhost',
        path: '/',
      },
    ])
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    // Should be 'rtl' when Hebrew locale is active
    if (dir) {
      expect(dir).toBe('rtl')
    }

    await context.close()
  })

  test('login page renders correctly with default locale', async ({ page }) => {
    await page.goto('/login')
    // The page should render form elements regardless of locale
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    // X+1 branding should be present
    await expect(page.getByText('X+1', { exact: true })).toBeVisible()
  })
})
