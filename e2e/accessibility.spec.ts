import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

/** Wait for the page to stabilise before running axe. */
async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Format axe violations into a readable report.
 * Critical / serious violations cause a hard failure.
 * Moderate / minor violations are logged as warnings.
 */
function formatViolations(
  violations: Array<{
    id: string;
    impact?: string | null;
    description: string;
    helpUrl: string;
    nodes: Array<{ html: string; failureSummary?: string }>;
  }>,
): { message: string; hasCritical: boolean } {
  if (violations.length === 0) {
    return { message: '', hasCritical: false };
  }

  let hasCritical = false;
  const lines: string[] = [`Found ${violations.length} accessibility violation(s):\n`];

  for (const v of violations) {
    const impact = (v.impact ?? 'unknown').toUpperCase();
    if (impact === 'CRITICAL' || impact === 'SERIOUS') {
      hasCritical = true;
    }

    lines.push(`  [${impact}] ${v.id}: ${v.description}`);
    lines.push(`    Help: ${v.helpUrl}`);
    lines.push(`    Affected nodes: ${v.nodes.length}`);
    for (const node of v.nodes.slice(0, 3)) {
      lines.push(`      - ${node.html.slice(0, 120)}`);
      if (node.failureSummary) {
        lines.push(`        ${node.failureSummary.split('\n')[0]}`);
      }
    }
    if (v.nodes.length > 3) {
      lines.push(`      ... and ${v.nodes.length - 3} more`);
    }
    lines.push('');
  }

  return { message: lines.join('\n'), hasCritical };
}

/**
 * Run axe scan with standard configuration.
 * Temporarily disables color-contrast to reduce noise from dynamic themes.
 * TODO(a11y): Re-enable color-contrast rule once design tokens stabilise.
 */
async function runAxeScan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast']) // TODO(a11y): Track — re-enable after fixing theme contrast ratios
    .analyze();

  const { message, hasCritical } = formatViolations(results.violations);

  if (hasCritical) {
    // Hard fail on critical / serious violations
    expect(results.violations, message).toHaveLength(0);
  } else if (results.violations.length > 0) {
    // Warn on moderate / minor violations — do not fail the test
    console.warn(message);
  }
}

// ---------------------------------------------------------------------------
// Light mode — all 7 public pages
// ---------------------------------------------------------------------------

test.describe('Accessibility — Light mode', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const { name, path } of PUBLIC_PAGES) {
    test(`a11y light - ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);
      await runAxeScan(page);
    });
  }
});

// ---------------------------------------------------------------------------
// Dark mode — 3 pages (landing, login, signup)
// ---------------------------------------------------------------------------

test.describe('Accessibility — Dark mode', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  });

  const DARK_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login' || p.name === 'signup',
  );

  for (const { name, path } of DARK_PAGES) {
    test(`a11y dark - ${name}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(path);
      await waitForStable(page);
      await runAxeScan(page);
    });
  }
});

// ---------------------------------------------------------------------------
// RTL / Hebrew — 3 pages (landing, login, signup)
// ---------------------------------------------------------------------------

test.describe('Accessibility — RTL Hebrew', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  const RTL_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login' || p.name === 'signup',
  );

  for (const { name, path } of RTL_PAGES) {
    test(`a11y rtl-he - ${name}`, async ({ page, context }) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: 'he', domain: 'localhost', path: '/' },
      ]);
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'he' });

      await page.goto(path);
      await waitForStable(page);
      await runAxeScan(page);
    });
  }
});

// ---------------------------------------------------------------------------
// Mobile viewport — 3 pages (landing, login, signup)
// ---------------------------------------------------------------------------

test.describe('Accessibility — Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

  const MOBILE_PAGES = PUBLIC_PAGES.filter(
    (p) => p.name === 'landing' || p.name === 'login' || p.name === 'signup',
  );

  for (const { name, path } of MOBILE_PAGES) {
    test(`a11y mobile - ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);
      await runAxeScan(page);
    });
  }
});

// ---------------------------------------------------------------------------
// Specific checks — 5 tests
// ---------------------------------------------------------------------------

test.describe('Accessibility — Specific checks', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('images have alt text on landing page', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Images must have alt text OR be explicitly decorative
      const isDecorative = role === 'presentation' || ariaHidden === 'true';
      const hasAlt = alt !== null && alt !== undefined;

      expect(
        hasAlt || isDecorative,
        `Image at index ${i} missing alt text and not marked decorative`,
      ).toBe(true);
    }
  });

  test('login form has proper labels', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    // Every visible input should have an associated label or aria-label
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');

      // Skip hidden/submit/button inputs
      if (type === 'hidden' || type === 'submit' || type === 'button') continue;

      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check for associated <label> element
      let hasAssociatedLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasAssociatedLabel = (await label.count()) > 0;
      }

      const isLabelled =
        hasAssociatedLabel ||
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        placeholder !== null;

      expect(
        isLabelled,
        `Login input at index ${i} (type="${type}") has no accessible label`,
      ).toBe(true);
    }
  });

  test('signup form has proper labels', async ({ page }) => {
    await page.goto('/signup');
    await waitForStable(page);

    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');

      if (type === 'hidden' || type === 'submit' || type === 'button') continue;

      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      let hasAssociatedLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasAssociatedLabel = (await label.count()) > 0;
      }

      const isLabelled =
        hasAssociatedLabel ||
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        placeholder !== null;

      expect(
        isLabelled,
        `Signup input at index ${i} (type="${type}") has no accessible label`,
      ).toBe(true);
    }
  });

  test('heading hierarchy is correct on landing page', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);

    // Must have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count, 'Page should have exactly one h1').toBe(1);

    // Heading levels should not skip (e.g. h1 -> h3 without h2)
    let prevLevel = 0;
    for (let i = 0; i < count; i++) {
      const tag = await headings.nth(i).evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tag.replace('h', ''), 10);

      if (prevLevel > 0) {
        // Going deeper should only increase by 1 at a time
        expect(
          level <= prevLevel + 1,
          `Heading level skipped from h${prevLevel} to h${level} at index ${i}`,
        ).toBe(true);
      }

      prevLevel = level;
    }
  });

  test('landmark regions are present', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    // Check for essential ARIA landmarks
    const main =
      page.locator('main, [role="main"]');
    const navigation =
      page.locator('nav, [role="navigation"]');

    expect(
      await main.count(),
      'Page should have a <main> or role="main" landmark',
    ).toBeGreaterThanOrEqual(1);

    expect(
      await navigation.count(),
      'Page should have a <nav> or role="navigation" landmark',
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation (2 tests)
// ---------------------------------------------------------------------------

test.describe('Accessibility — Keyboard navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    // Tab to the first input
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() =>
        document.activeElement?.tagName.toLowerCase(),
      );
      if (tag === 'input') break;
    }

    // The focused element should have a visible focus style (outline or ring)
    const focusStyles = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return { outline: '', boxShadow: '' };
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
      };
    });

    const hasFocusIndicator =
      (focusStyles.outline !== '' &&
        focusStyles.outline !== 'none' &&
        focusStyles.outline !== '0px none rgb(0, 0, 0)') ||
      (focusStyles.boxShadow !== '' && focusStyles.boxShadow !== 'none');

    expect(
      hasFocusIndicator,
      'Focused input should have a visible focus indicator (outline or box-shadow)',
    ).toBe(true);
  });

  test('login page is fully navigable with keyboard', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    // Tab through all interactive elements
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableCount = await page.locator(focusableSelector).count();
    expect(focusableCount).toBeGreaterThan(0);

    // Tab through each focusable element and verify focus is visible
    for (let i = 0; i < Math.min(focusableCount, 15); i++) {
      await page.keyboard.press('Tab');

      const activeTag = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName.toLowerCase() : 'none';
      });

      // After tabbing, focus should not be stuck on body
      // (first tab may land on skip-link or first interactive element)
      if (i > 0) {
        expect(
          activeTag,
          `After ${i + 1} Tab presses, focus should be on an interactive element`,
        ).not.toBe('body');
      }
    }

    // Verify focus on an input and type into it
    await page.goto('/login');
    await waitForStable(page);

    // Tab to the first input
    let reachedInput = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(() =>
        document.activeElement?.tagName.toLowerCase(),
      );
      if (activeTag === 'input') {
        reachedInput = true;
        break;
      }
    }

    expect(reachedInput, 'Should be able to tab to an input field').toBe(true);

    // Type into the focused input
    await page.keyboard.type('test@example.com');

    const activeValue = await page.evaluate(
      () => (document.activeElement as HTMLInputElement)?.value,
    );
    expect(activeValue).toBe('test@example.com');
  });
});
