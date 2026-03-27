import { test, expect } from '@playwright/test'

test.describe('Homework Routes (Protected)', () => {
  test('/homework redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/homework')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fhomework')
  })

  test('/homework/check redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/homework/check')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fhomework%2Fcheck')
  })

  test('/homework/help redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/homework/help')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fhomework%2Fhelp')
  })

  test('/homework/history redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/homework/history')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fhomework%2Fhistory')
  })

  test('/homework/:sessionId redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/homework/test-session-123')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fhomework%2Ftest-session-123')
  })

  test('redirect preserves full homework path', async ({ page }) => {
    const targetPath = '/homework/check'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })
})
