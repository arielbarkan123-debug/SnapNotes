import { type Page, expect } from '@playwright/test';

const TEST_EMAIL =
  process.env.TEST_USER_EMAIL ?? 'test@xplus1.example.com';
const TEST_PASSWORD =
  process.env.TEST_USER_PASSWORD ?? 'TestPassword123!';

/**
 * Log in as the test user through the UI login form.
 * Waits for the /dashboard redirect before returning.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
