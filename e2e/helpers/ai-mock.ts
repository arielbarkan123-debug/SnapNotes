import type { Page, Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock response payloads
// ---------------------------------------------------------------------------

const MOCK_GENERATE_COURSE = {
  type: 'success',
  course: {
    title: 'Mock Generated Course',
    overview: 'This is a mock course generated for testing.',
    lessons: [
      {
        title: 'Mock Lesson 1',
        steps: [
          {
            type: 'explanation',
            content: 'This is a mock explanation step.',
            title: 'Introduction',
          },
          {
            type: 'question',
            content: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correct_answer: 1,
            explanation: '2 + 2 equals 4.',
          },
        ],
      },
    ],
  },
};

const MOCK_EVALUATE_ANSWER = {
  correct: true,
  explanation: 'Well done! That is the correct answer.',
  score: 1,
};

const MOCK_CHAT_RESPONSE = {
  message: 'This is a mock AI chat response for testing purposes.',
  role: 'assistant' as const,
};

const MOCK_HOMEWORK_CHECK = {
  overall_score: 85,
  feedback: 'Good work overall. A few areas could use improvement.',
  details: [],
};

const MOCK_HELP_RESPONSE = {
  response: 'Here is a helpful explanation for your question.',
  type: 'explanation' as const,
};

// ---------------------------------------------------------------------------
// Individual mock installers
// ---------------------------------------------------------------------------

export async function mockGenerateCourse(page: Page): Promise<void> {
  await page.route('**/api/generate-course', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_GENERATE_COURSE),
    });
  });
}

export async function mockEvaluateAnswer(page: Page): Promise<void> {
  await page.route('**/api/evaluate-answer', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_EVALUATE_ANSWER),
    });
  });
}

export async function mockChat(page: Page): Promise<void> {
  await page.route('**/api/chat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CHAT_RESPONSE),
    });
  });
}

export async function mockHomeworkCheck(page: Page): Promise<void> {
  await page.route('**/api/homework/check', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_HOMEWORK_CHECK),
    });
  });
}

export async function mockHelp(page: Page): Promise<void> {
  await page.route('**/api/help', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_HELP_RESPONSE),
    });
  });
}

// ---------------------------------------------------------------------------
// Combined installer
// ---------------------------------------------------------------------------

/**
 * Install all AI-related API mocks on the given page.
 * Call this *before* any navigation that may trigger these endpoints.
 */
export async function setupAIMocks(page: Page): Promise<void> {
  await Promise.all([
    mockGenerateCourse(page),
    mockEvaluateAnswer(page),
    mockChat(page),
    mockHomeworkCheck(page),
    mockHelp(page),
  ]);
}

// ---------------------------------------------------------------------------
// Convenience object for selective imports
// ---------------------------------------------------------------------------

export const fixtures = {
  mockGenerateCourse,
  mockEvaluateAnswer,
  mockChat,
  mockHomeworkCheck,
  mockHelp,
  setupAIMocks,
} as const;
