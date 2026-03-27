import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loginAsTestUser } from './auth';
import { setupAIMocks } from './ai-mock';

type CustomFixtures = {
  /** A page that is already logged in as the test user. */
  authenticatedPage: Page;
  /** Installs AI mocks on the given page and returns it. */
  mockAIResponse: (page: Page) => Promise<Page>;
};

export const test = base.extend<CustomFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsTestUser(page);
    await use(page);
  },

  mockAIResponse: async ({}, use) => {
    const install = async (page: Page): Promise<Page> => {
      await setupAIMocks(page);
      return page;
    };
    await use(install);
  },
});

export { expect };
