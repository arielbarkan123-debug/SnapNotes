const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/.worktrees/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(next-intl|use-intl)/)',
  ],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    'hooks/**/*.ts',
    '!lib/**/*.d.ts',
    '!**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
