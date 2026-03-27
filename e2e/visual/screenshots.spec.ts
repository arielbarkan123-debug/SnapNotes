import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PUBLIC_PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'offline', path: '/offline' },
] as const;

/** Wait for the page to stabilise: networkidle + extra 500 ms for animations. */
async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/** Strict threshold for UI pages (0.5 %). */
const STRICT_THRESHOLD = 0.005;

/** Relaxed threshold for text-heavy legal pages (1 %). */
const RELAXED_THRESHOLD = 0.01;

function thresholdFor(name: string): number {
  return name === 'privacy' || name === 'terms'
    ? RELAXED_THRESHOLD
    : STRICT_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Desktop — 1280 x 720  (8 tests: waitForStable helper + 7 pages)
// ---------------------------------------------------------------------------

test.describe('Desktop screenshots @visual', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('waitForStable helper waits for networkidle + 500 ms', async ({ page }) => {
    await page.goto('/');
    const start = Date.now();
    await waitForStable(page);
    const elapsed = Date.now() - start;
    // The 500 ms timeout alone guarantees at least ~500 ms
    expect(elapsed).toBeGreaterThanOrEqual(450);
  });

  for (const { name, path } of PUBLIC_PAGES) {
    test(`desktop - ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`desktop-${name}.png`, {
        maxDiffPixelRatio: thresholdFor(name),
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Mobile — 375 x 812  (6 pages: skip offline for mobile set)
// ---------------------------------------------------------------------------

test.describe('Mobile screenshots @visual', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

  const MOBILE_PAGES = PUBLIC_PAGES.filter((p) => p.name !== 'offline');

  for (const { name, path } of MOBILE_PAGES) {
    test(`mobile - ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`mobile-${name}.png`, {
        maxDiffPixelRatio: thresholdFor(name),
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Tablet — 768 x 1024  (2 pages: landing, login)
// ---------------------------------------------------------------------------

test.describe('Tablet screenshots @visual', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  const TABLET_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login' || p.name === 'signup',
  );

  for (const { name, path } of TABLET_PAGES) {
    test(`tablet - ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`tablet-${name}.png`, {
        maxDiffPixelRatio: STRICT_THRESHOLD,
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Dark mode — Desktop 1280 x 720  (6 pages)
// ---------------------------------------------------------------------------

test.describe('Dark mode desktop screenshots @visual', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  });

  for (const { name, path } of PUBLIC_PAGES) {
    test(`dark-desktop - ${name}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(path);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`dark-desktop-${name}.png`, {
        maxDiffPixelRatio: thresholdFor(name),
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Dark mode — Mobile 375 x 812  (2 pages: landing, login)
// ---------------------------------------------------------------------------

test.describe('Dark mode mobile screenshots @visual', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    colorScheme: 'dark',
  });

  const DARK_MOBILE_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login',
  );

  for (const { name, path } of DARK_MOBILE_PAGES) {
    test(`dark-mobile - ${name}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(path);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`dark-mobile-${name}.png`, {
        maxDiffPixelRatio: STRICT_THRESHOLD,
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// RTL / Hebrew  (3 pages: landing, login, signup)
// ---------------------------------------------------------------------------

test.describe('RTL Hebrew screenshots @visual', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  const RTL_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login' || p.name === 'signup',
  );

  for (const { name, path } of RTL_PAGES) {
    test(`rtl-he - ${name}`, async ({ page, context }) => {
      // Set locale cookie before navigating
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: 'he', domain: 'localhost', path: '/' },
      ]);
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'he' });

      await page.goto(path);
      await waitForStable(page);

      // Verify RTL direction is applied
      const dir = await page.locator('html').getAttribute('dir');
      expect(dir).toBe('rtl');

      await expect(page).toHaveScreenshot(`rtl-he-${name}.png`, {
        maxDiffPixelRatio: STRICT_THRESHOLD,
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Error states  (2 tests: login + signup validation errors)
// ---------------------------------------------------------------------------

test.describe('Error state screenshots @visual', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('login - validation errors', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    // Submit with empty fields to trigger validation
    const submitButton = page.getByRole('button', { name: /log\s*in|sign\s*in|enter/i });
    await submitButton.click();

    // Wait for validation messages to appear
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('error-login-validation.png', {
      maxDiffPixelRatio: STRICT_THRESHOLD,
      fullPage: true,
    });
  });

  test('signup - validation errors', async ({ page }) => {
    await page.goto('/signup');
    await waitForStable(page);

    // Submit with empty fields to trigger validation
    const submitButton = page.getByRole('button', { name: /sign\s*up|create|register/i });
    await submitButton.click();

    // Wait for validation messages to appear
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('error-signup-validation.png', {
      maxDiffPixelRatio: STRICT_THRESHOLD,
      fullPage: true,
    });
  });
});
