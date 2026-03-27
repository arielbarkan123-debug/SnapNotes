import { test, expect } from '@playwright/test'

test.describe('Exam Routes (Protected)', () => {
  test('/exams redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/exams')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fexams')
  })

  test('/exams/:id redirects to /login with redirectTo', async ({ page }) => {
    await page.goto('/exams/exam-uuid-456')
    await page.waitForURL('**/login**', { timeout: 15000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirectTo=%2Fexams%2Fexam-uuid-456')
  })

  test('redirect from /exams preserves redirectTo param', async ({ page }) => {
    const targetPath = '/exams'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })

  test('redirect from /exams/:id preserves full path', async ({ page }) => {
    const targetPath = '/exams/exam-uuid-456'
    await page.goto(targetPath)
    await page.waitForURL('**/login**', { timeout: 15000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirectTo')).toBe(targetPath)
  })
})
