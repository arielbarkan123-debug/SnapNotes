import { test, expect } from '@playwright/test'

test.describe('Practice & Review Routes (Protected)', () => {
  test('/practice redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/practice')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fpractice')
  })

  test('/practice/:sessionId redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/practice/session-abc-123')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fpractice%2Fsession-abc-123')
  })

  test('/practice/math redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/practice/math')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fpractice%2Fmath')
  })

  test('/review redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/review')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Freview')
  })

  test('redirect from /practice preserves redirectTo param', async ({ page }) => {
    const targetPath = '/practice'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })

  test('redirect from /review preserves redirectTo param', async ({ page }) => {
    const targetPath = '/review'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })
})
