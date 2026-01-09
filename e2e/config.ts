/**
 * E2E Test Configuration
 * Central configuration for all E2E tests
 */

export const TEST_CONFIG = {
  // Base URL for the application
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',

  // Path to test materials (user provides study materials here)
  materialsPath: './e2e/materials',

  // Path for generated reports
  reportsPath: './e2e/reports',

  // Timeouts in milliseconds
  timeouts: {
    navigation: 10000,      // Page navigation
    action: 5000,           // Button clicks, form inputs
    upload: 30000,          // File uploads
    aiProcessing: 180000,   // AI course generation (3 minutes)
    srsReview: 60000,       // SRS review session
    examGeneration: 120000, // Exam generation
  },

  // Test user credentials
  credentials: {
    testEmail: process.env.E2E_TEST_EMAIL || 'e2e-test@notesnap.test',
    testPassword: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,        // Initial backoff
    backoffMultiplier: 2,   // Exponential backoff multiplier
  },

  // Screenshot configuration
  screenshots: {
    captureOnFailure: true,
    captureOnSuccess: false,
    directory: './e2e/reports/screenshots',
  },

  // Log capture settings
  logging: {
    captureConsole: true,
    captureNetwork: true,
    consolePattern: '.*',           // Capture all console logs
    networkPattern: '/api/',        // Focus on API calls
    maxConsoleMessages: 200,
    maxNetworkRequests: 100,
  },
}

// Error patterns to detect (aligned with lib/api/errors.ts)
export const ERROR_PATTERNS = {
  // Auth errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    consolePattern: /UNAUTHORIZED|401|Please log in|Not authenticated/i,
    networkStatus: 401,
    severity: 'high' as const,
    autoFixable: false,
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    consolePattern: /SESSION_EXPIRED|session expired/i,
    networkStatus: 401,
    severity: 'high' as const,
    autoFixable: false,
  },

  // Upload errors
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    consolePattern: /FILE_TOO_LARGE|File is too large|size limit/i,
    networkStatus: 400,
    severity: 'medium' as const,
    autoFixable: false,
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    consolePattern: /INVALID_FILE_TYPE|Invalid file type|not supported/i,
    networkStatus: 400,
    severity: 'medium' as const,
    autoFixable: false,
  },

  // AI processing errors
  AI_TIMEOUT: {
    code: 'AI_TIMEOUT',
    consolePattern: /AI_TIMEOUT|Processing took too long|timeout/i,
    networkStatus: 504,
    severity: 'high' as const,
    autoFixable: true,
    fixStrategy: 'retry',
  },
  AI_PROCESSING_FAILED: {
    code: 'AI_PROCESSING_FAILED',
    consolePattern: /AI_PROCESSING_FAILED|Failed to process|AI error/i,
    networkStatus: 500,
    severity: 'high' as const,
    autoFixable: true,
    fixStrategy: 'retry',
  },

  // Network errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    consolePattern: /NETWORK_ERROR|Failed to fetch|Network error|fetch failed/i,
    networkStatus: null, // Request didn't complete
    severity: 'high' as const,
    autoFixable: true,
    fixStrategy: 'retry',
  },
  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    consolePattern: /NETWORK_TIMEOUT|Request timed out|timeout/i,
    networkStatus: 408,
    severity: 'high' as const,
    autoFixable: true,
    fixStrategy: 'retry',
  },

  // Rate limiting
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    consolePattern: /RATE_LIMITED|429|Too many requests/i,
    networkStatus: 429,
    severity: 'medium' as const,
    autoFixable: true,
    fixStrategy: 'wait_and_retry',
  },

  // UI errors
  HYDRATION_ERROR: {
    code: 'HYDRATION_ERROR',
    consolePattern: /Hydration failed|Text content does not match|Hydration mismatch/i,
    networkStatus: null,
    severity: 'medium' as const,
    autoFixable: true,
    fixStrategy: 'report_code_fix',
  },
  UNCAUGHT_ERROR: {
    code: 'UNCAUGHT_ERROR',
    consolePattern: /Uncaught|unhandledrejection|Unhandled Promise/i,
    networkStatus: null,
    severity: 'high' as const,
    autoFixable: false,
  },

  // Validation errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    consolePattern: /VALIDATION_ERROR|Invalid input|validation failed/i,
    networkStatus: 400,
    severity: 'low' as const,
    autoFixable: false,
  },

  // Database errors
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    consolePattern: /DATABASE_ERROR|Database error|Supabase error/i,
    networkStatus: 500,
    severity: 'high' as const,
    autoFixable: false,
  },
}

// Test flows configuration
export const TEST_FLOWS = [
  'auth',
  'upload',
  'learning',
  'practice',
  'exam',
  'homework',
] as const

export type TestFlow = typeof TEST_FLOWS[number]
