import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['json', { outputFile: 'playwright-report/results.json' }]]
    : [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005,
    },
  },

  snapshotPathTemplate:
    '{testDir}/screenshots/baseline/{projectName}/{testFilePath}/{arg}{ext}',

  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      grep: /@visual/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !isCI,
  },
});
