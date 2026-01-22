/**
 * E2E Test Types
 * Type definitions for the E2E testing system
 */

import { type TestFlow } from '../config'

// ============================================================================
// Test Scenario Types
// ============================================================================

export interface TestScenario {
  name: string
  description: string
  flow: TestFlow
  steps: TestStep[]
  expected: ExpectedOutcome[]
  setup?: SetupConfig
  teardown?: TeardownConfig
}

export interface TestStep {
  id: string
  action: TestAction
  target?: string          // Element selector, ref, or description
  value?: string           // Input value, URL, or file path
  timeout?: number         // Override default timeout
  captureState?: boolean   // Capture logs at this step
  optional?: boolean       // Don't fail if step fails
  condition?: string       // Only run if condition met
}

export type TestAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'upload'
  | 'select'
  | 'waitFor'
  | 'snapshot'
  | 'screenshot'
  | 'scroll'
  | 'hover'
  | 'pressKey'
  | 'clearInput'
  | 'assertText'
  | 'assertVisible'
  | 'assertNotVisible'

export interface SetupConfig {
  login?: boolean
  createCourse?: boolean
  courseId?: string
  navigateTo?: string
}

export interface TeardownConfig {
  logout?: boolean
  deleteCourse?: boolean
  clearData?: boolean
}

// ============================================================================
// Expected Outcome Types
// ============================================================================

export interface ExpectedOutcome {
  type: OutcomeType
  description?: string
  assertion: AssertionConfig
}

export type OutcomeType =
  | 'navigation'
  | 'ui_state'
  | 'network_success'
  | 'network_error'
  | 'console_clean'
  | 'console_contains'
  | 'element_visible'
  | 'element_text'

export interface AssertionConfig {
  // Navigation assertions
  urlEquals?: string
  urlContains?: string
  urlMatches?: string

  // UI state assertions
  elementExists?: string
  elementNotExists?: string
  elementVisible?: string
  elementText?: { selector: string; text: string; contains?: boolean }
  elementCount?: { selector: string; count: number }

  // Network assertions
  apiCalled?: { endpoint: string; method?: string }
  apiSucceeded?: { endpoint: string; statusRange?: [number, number] }
  apiFailed?: { endpoint: string; expectedStatus?: number }

  // Console assertions
  noConsoleErrors?: boolean
  consoleContains?: string
  consoleNotContains?: string
}

// ============================================================================
// Test Execution Types
// ============================================================================

export interface TestContext {
  tabId: number
  baseUrl: string
  currentUrl: string
  sessionData: Record<string, unknown>
  createdResources: CreatedResource[]
}

export interface CreatedResource {
  type: 'user' | 'course' | 'exam' | 'practice_session'
  id: string
  cleanup?: () => Promise<void>
}

export interface StepResult {
  stepId: string
  action: TestAction
  status: 'pass' | 'fail' | 'skip' | 'error'
  duration: number
  error?: string
  screenshot?: string
  logs?: CapturedLogs
}

export interface TestResult {
  scenario: string
  flow: TestFlow
  status: 'pass' | 'fail' | 'error'
  duration: number
  startTime: string
  endTime: string
  steps: StepResult[]
  logs: CapturedLogs
  screenshots: string[]
  errors: DetectedError[]
  fixes?: AppliedFix[]
}

// ============================================================================
// Log Capture Types
// ============================================================================

export interface CapturedLogs {
  console: ConsoleMessage[]
  network: NetworkRequest[]
  timestamp: number
  pagePath: string
}

export interface ConsoleMessage {
  level: 'error' | 'warning' | 'info' | 'debug' | 'log'
  message: string
  timestamp: number
  source?: string
}

export interface NetworkRequest {
  url: string
  method: string
  status: number | null
  statusText: string
  duration: number
  failed: boolean
  errorMessage?: string
  requestBody?: string
  responseBody?: string
}

// ============================================================================
// Error Detection Types
// ============================================================================

export interface DetectedError {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
  source: 'console' | 'network' | 'ui'
  timestamp: number
  stepId?: string
  apiEndpoint?: string
  networkStatus?: number
  stackTrace?: string
  isRetryable: boolean
  exposesInternalInfo: boolean
}

// ============================================================================
// Auto-Fix Types
// ============================================================================

export interface FixStrategy {
  name: string
  type: 'retry' | 'wait_and_retry' | 'report_code_fix' | 'skip'
  maxAttempts?: number
  waitMs?: number
}

export interface AppliedFix {
  error: DetectedError
  strategy: string
  success: boolean
  action: string
  details: string
  codeChanges?: CodeChange[]
  attempts?: number
}

export interface CodeChange {
  file: string
  line?: number
  before?: string
  after?: string
  reason: string
  applied: boolean
}

// ============================================================================
// Report Types
// ============================================================================

export interface TestReport {
  metadata: ReportMetadata
  summary: ReportSummary
  flows: FlowReport[]
  errors: ErrorReport[]
  fixes: FixReport[]
}

export interface ReportMetadata {
  runId: string
  startTime: string
  endTime: string
  duration: number
  environment: {
    baseUrl: string
    nodeVersion: string
    platform: string
  }
  testMaterialsUsed: string[]
}

export interface ReportSummary {
  total: number
  passed: number
  failed: number
  errors: number
  skipped: number
  passRate: number
}

export interface FlowReport {
  name: TestFlow
  scenarios: ScenarioReport[]
  summary: {
    total: number
    passed: number
    failed: number
  }
}

export interface ScenarioReport {
  name: string
  description: string
  status: 'pass' | 'fail' | 'error' | 'skip'
  duration: number
  steps: {
    id: string
    status: 'pass' | 'fail' | 'skip'
    duration: number
    error?: string
  }[]
  logs: {
    consoleErrors: number
    networkErrors: number
    warnings: number
  }
  screenshots: string[]
}

export interface ErrorReport {
  code: string
  message: string
  count: number
  scenarios: string[]
  severity: 'low' | 'medium' | 'high'
  firstOccurrence: string
  lastOccurrence: string
}

export interface FixReport {
  error: string
  strategy: string
  result: 'success' | 'failed' | 'pending'
  details: string
  codeChanges?: CodeChange[]
}

// ============================================================================
// Browser Action Types
// ============================================================================

export interface BrowserContext {
  tabId: number
  windowId?: number
}

export interface ElementInfo {
  ref: string
  role: string
  name: string
  value?: string
  visible: boolean
  focusable: boolean
  bounds?: { x: number; y: number; width: number; height: number }
}

export interface PageSnapshot {
  url: string
  title: string
  elements: ElementInfo[]
  timestamp: number
}

export interface WaitCondition {
  type: 'element' | 'navigation' | 'network' | 'timeout'
  selector?: string
  urlContains?: string
  apiEndpoint?: string
  timeoutMs: number
}
