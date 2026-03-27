import { test, expect } from '@playwright/test'

test.describe('Prepare, Study Plan & Cheatsheet Routes (Protected)', () => {
  test('/prepare redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/prepare')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fprepare')
  })

  test('/prepare/:id redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/prepare/guide-uuid-789')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fprepare%2Fguide-uuid-789')
  })

  test('/study-plan redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/study-plan')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fstudy-plan')
  })

  test('/study-plan/create redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/study-plan/create')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fstudy-plan%2Fcreate')
  })

  test('/cheatsheets redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/cheatsheets')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fcheatsheets')
  })

  test('/cheatsheets/:id redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/cheatsheets/cheatsheet-uuid-101')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fcheatsheets%2Fcheatsheet-uuid-101')
  })

  test('redirect preserves full prepare path in redirectTo', async ({ page }) => {
    const targetPath = '/prepare/guide-uuid-789'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })
})
