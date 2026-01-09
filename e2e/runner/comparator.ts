/**
 * Comparator
 * Compares expected outcomes with actual test results
 *
 * Handles UI state, network requests, and console log assertions
 */

import type {
  ExpectedOutcome,
  AssertionConfig,
  CapturedLogs,
  NetworkRequest,
  ConsoleMessage,
} from './types'
import { buildUrl } from './browser-actions'
import { wasApiCallSuccessful, getAllErrorMessages } from './log-capture'

// ============================================================================
// Comparison Types
// ============================================================================

export interface ComparisonResult {
  passed: boolean
  expected: ExpectedOutcome
  actual: ActualState
  differences: Difference[]
  message: string
}

export interface ActualState {
  url?: string
  elements?: ElementMatch[]
  networkRequests?: NetworkRequest[]
  consoleMessages?: ConsoleMessage[]
}

export interface ElementMatch {
  selector: string
  found: boolean
  text?: string
  visible?: boolean
  count?: number
}

export interface Difference {
  field: string
  expected: unknown
  actual: unknown
  message: string
}

// ============================================================================
// Main Comparison Function
// ============================================================================

/**
 * Compare expected outcome with actual state
 */
export function compare(
  expected: ExpectedOutcome,
  actualState: {
    url?: string
    snapshot?: string // Raw read_page output
    logs?: CapturedLogs
  }
): ComparisonResult {
  const differences: Difference[] = []
  const actual: ActualState = {}

  const assertion = expected.assertion

  // Navigation assertions
  if (assertion.urlEquals || assertion.urlContains || assertion.urlMatches) {
    const urlResult = checkUrlAssertion(actualState.url || '', assertion)
    actual.url = actualState.url
    if (!urlResult.passed) {
      differences.push(urlResult.difference!)
    }
  }

  // UI state assertions
  if (assertion.elementExists || assertion.elementNotExists || assertion.elementVisible) {
    const elementResult = checkElementAssertion(actualState.snapshot || '', assertion)
    actual.elements = elementResult.elements
    differences.push(...elementResult.differences)
  }

  // Element text assertion
  if (assertion.elementText) {
    const textResult = checkElementTextAssertion(actualState.snapshot || '', assertion.elementText)
    actual.elements = actual.elements || []
    actual.elements.push(textResult.element)
    if (!textResult.passed) {
      differences.push(textResult.difference!)
    }
  }

  // Element count assertion
  if (assertion.elementCount) {
    const countResult = checkElementCountAssertion(actualState.snapshot || '', assertion.elementCount)
    actual.elements = actual.elements || []
    actual.elements.push(countResult.element)
    if (!countResult.passed) {
      differences.push(countResult.difference!)
    }
  }

  // Network assertions
  if (assertion.apiCalled || assertion.apiSucceeded || assertion.apiFailed) {
    const networkResult = checkNetworkAssertion(actualState.logs || createEmptyLogs(), assertion)
    actual.networkRequests = actualState.logs?.network || []
    differences.push(...networkResult.differences)
  }

  // Console assertions
  if (assertion.noConsoleErrors !== undefined || assertion.consoleContains || assertion.consoleNotContains) {
    const consoleResult = checkConsoleAssertion(actualState.logs || createEmptyLogs(), assertion)
    actual.consoleMessages = actualState.logs?.console || []
    differences.push(...consoleResult.differences)
  }

  const passed = differences.length === 0

  return {
    passed,
    expected,
    actual,
    differences,
    message: passed
      ? `Assertion passed: ${expected.description || expected.type}`
      : `Assertion failed: ${differences.map(d => d.message).join('; ')}`,
  }
}

// ============================================================================
// URL Assertions
// ============================================================================

function checkUrlAssertion(
  currentUrl: string,
  assertion: AssertionConfig
): { passed: boolean; difference?: Difference } {
  if (assertion.urlEquals) {
    const expectedUrl = buildUrl(assertion.urlEquals)
    const passed = currentUrl === expectedUrl || currentUrl === assertion.urlEquals
    return {
      passed,
      difference: passed ? undefined : {
        field: 'url',
        expected: assertion.urlEquals,
        actual: currentUrl,
        message: `URL should equal "${assertion.urlEquals}" but was "${currentUrl}"`,
      },
    }
  }

  if (assertion.urlContains) {
    const passed = currentUrl.includes(assertion.urlContains)
    return {
      passed,
      difference: passed ? undefined : {
        field: 'url',
        expected: `contains "${assertion.urlContains}"`,
        actual: currentUrl,
        message: `URL should contain "${assertion.urlContains}" but was "${currentUrl}"`,
      },
    }
  }

  if (assertion.urlMatches) {
    const regex = new RegExp(assertion.urlMatches)
    const passed = regex.test(currentUrl)
    return {
      passed,
      difference: passed ? undefined : {
        field: 'url',
        expected: `matches /${assertion.urlMatches}/`,
        actual: currentUrl,
        message: `URL should match pattern "${assertion.urlMatches}" but was "${currentUrl}"`,
      },
    }
  }

  return { passed: true }
}

// ============================================================================
// Element Assertions
// ============================================================================

function checkElementAssertion(
  snapshot: string,
  assertion: AssertionConfig
): { elements: ElementMatch[]; differences: Difference[] } {
  const elements: ElementMatch[] = []
  const differences: Difference[] = []

  if (assertion.elementExists) {
    const found = snapshotContainsElement(snapshot, assertion.elementExists)
    elements.push({ selector: assertion.elementExists, found })
    if (!found) {
      differences.push({
        field: 'element',
        expected: `element "${assertion.elementExists}" exists`,
        actual: 'not found',
        message: `Element "${assertion.elementExists}" should exist but was not found`,
      })
    }
  }

  if (assertion.elementNotExists) {
    const found = snapshotContainsElement(snapshot, assertion.elementNotExists)
    elements.push({ selector: assertion.elementNotExists, found: !found })
    if (found) {
      differences.push({
        field: 'element',
        expected: `element "${assertion.elementNotExists}" does not exist`,
        actual: 'found',
        message: `Element "${assertion.elementNotExists}" should not exist but was found`,
      })
    }
  }

  if (assertion.elementVisible) {
    const found = snapshotContainsElement(snapshot, assertion.elementVisible)
    elements.push({ selector: assertion.elementVisible, found, visible: found })
    if (!found) {
      differences.push({
        field: 'element',
        expected: `element "${assertion.elementVisible}" is visible`,
        actual: 'not visible',
        message: `Element "${assertion.elementVisible}" should be visible but was not`,
      })
    }
  }

  return { elements, differences }
}

function checkElementTextAssertion(
  snapshot: string,
  config: { selector: string; text: string; contains?: boolean }
): { passed: boolean; element: ElementMatch; difference?: Difference } {
  // In actual implementation, would parse snapshot to find element and check text
  // For now, check if text appears in snapshot near selector context
  const found = snapshot.includes(config.selector) || snapshot.toLowerCase().includes(config.selector.toLowerCase())
  const textFound = snapshot.includes(config.text)

  const passed = found && (config.contains ? textFound : textFound)

  return {
    passed,
    element: { selector: config.selector, found, text: config.text },
    difference: passed ? undefined : {
      field: 'elementText',
      expected: `element "${config.selector}" ${config.contains ? 'contains' : 'has'} text "${config.text}"`,
      actual: found ? 'element found but text mismatch' : 'element not found',
      message: `Element "${config.selector}" should have text "${config.text}"`,
    },
  }
}

function checkElementCountAssertion(
  snapshot: string,
  config: { selector: string; count: number }
): { passed: boolean; element: ElementMatch; difference?: Difference } {
  // Count occurrences of selector pattern in snapshot
  const regex = new RegExp(config.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const matches = snapshot.match(regex)
  const actualCount = matches ? matches.length : 0

  const passed = actualCount === config.count

  return {
    passed,
    element: { selector: config.selector, found: actualCount > 0, count: actualCount },
    difference: passed ? undefined : {
      field: 'elementCount',
      expected: config.count,
      actual: actualCount,
      message: `Expected ${config.count} elements matching "${config.selector}" but found ${actualCount}`,
    },
  }
}

/**
 * Check if snapshot contains element matching selector/description
 */
function snapshotContainsElement(snapshot: string, selector: string): boolean {
  // Handle various selector formats
  // data-testid
  if (selector.startsWith('[data-')) {
    const match = selector.match(/\[([^\]]+)\]/)
    if (match) {
      return snapshot.includes(match[1])
    }
  }

  // Class selector
  if (selector.startsWith('.')) {
    return snapshot.includes(selector.slice(1))
  }

  // ID selector
  if (selector.startsWith('#')) {
    return snapshot.includes(selector.slice(1))
  }

  // Role/aria
  if (selector.includes('role=') || selector.includes('aria-')) {
    const value = selector.split('=')[1]?.replace(/['"]/g, '')
    return value ? snapshot.toLowerCase().includes(value.toLowerCase()) : false
  }

  // Text content (has-text)
  if (selector.includes(':has-text')) {
    const match = selector.match(/:has-text\(["']?([^"')]+)["']?\)/)
    if (match) {
      return snapshot.toLowerCase().includes(match[1].toLowerCase())
    }
  }

  // Generic text search
  return snapshot.toLowerCase().includes(selector.toLowerCase())
}

// ============================================================================
// Network Assertions
// ============================================================================

function checkNetworkAssertion(
  logs: CapturedLogs,
  assertion: AssertionConfig
): { differences: Difference[] } {
  const differences: Difference[] = []

  if (assertion.apiCalled) {
    const { endpoint, method } = assertion.apiCalled
    const found = logs.network.some(r =>
      r.url.includes(endpoint) && (!method || r.method === method.toUpperCase())
    )
    if (!found) {
      differences.push({
        field: 'apiCalled',
        expected: `${method || 'ANY'} ${endpoint} was called`,
        actual: 'not called',
        message: `API ${endpoint} should have been called but was not`,
      })
    }
  }

  if (assertion.apiSucceeded) {
    const { endpoint, statusRange } = assertion.apiSucceeded
    const range = statusRange || [200, 299]
    const requests = logs.network.filter(r => r.url.includes(endpoint))

    if (requests.length === 0) {
      differences.push({
        field: 'apiSucceeded',
        expected: `${endpoint} called with status ${range[0]}-${range[1]}`,
        actual: 'not called',
        message: `API ${endpoint} should have succeeded but was not called`,
      })
    } else {
      const succeeded = requests.some(r =>
        r.status && r.status >= range[0] && r.status <= range[1]
      )
      if (!succeeded) {
        const statuses = requests.map(r => r.status).join(', ')
        differences.push({
          field: 'apiSucceeded',
          expected: `status ${range[0]}-${range[1]}`,
          actual: `status ${statuses}`,
          message: `API ${endpoint} should have status ${range[0]}-${range[1]} but got ${statuses}`,
        })
      }
    }
  }

  if (assertion.apiFailed) {
    const { endpoint, expectedStatus } = assertion.apiFailed
    const requests = logs.network.filter(r => r.url.includes(endpoint))

    if (requests.length === 0) {
      differences.push({
        field: 'apiFailed',
        expected: `${endpoint} called and failed`,
        actual: 'not called',
        message: `API ${endpoint} should have been called (and failed) but was not`,
      })
    } else {
      const failed = requests.some(r =>
        r.failed || (r.status && r.status >= 400) &&
        (!expectedStatus || r.status === expectedStatus)
      )
      if (!failed) {
        differences.push({
          field: 'apiFailed',
          expected: expectedStatus ? `status ${expectedStatus}` : 'failed request',
          actual: 'succeeded',
          message: `API ${endpoint} should have failed but succeeded`,
        })
      }
    }
  }

  return { differences }
}

// ============================================================================
// Console Assertions
// ============================================================================

function checkConsoleAssertion(
  logs: CapturedLogs,
  assertion: AssertionConfig
): { differences: Difference[] } {
  const differences: Difference[] = []

  if (assertion.noConsoleErrors) {
    const errors = logs.console.filter(m => m.level === 'error')
    if (errors.length > 0) {
      differences.push({
        field: 'console',
        expected: 'no console errors',
        actual: `${errors.length} errors`,
        message: `Expected no console errors but found ${errors.length}: ${errors[0]?.message?.slice(0, 100)}...`,
      })
    }
  }

  if (assertion.consoleContains) {
    const found = logs.console.some(m =>
      m.message.toLowerCase().includes(assertion.consoleContains!.toLowerCase())
    )
    if (!found) {
      differences.push({
        field: 'console',
        expected: `contains "${assertion.consoleContains}"`,
        actual: 'not found',
        message: `Console should contain "${assertion.consoleContains}" but did not`,
      })
    }
  }

  if (assertion.consoleNotContains) {
    const found = logs.console.some(m =>
      m.message.toLowerCase().includes(assertion.consoleNotContains!.toLowerCase())
    )
    if (found) {
      differences.push({
        field: 'console',
        expected: `does not contain "${assertion.consoleNotContains}"`,
        actual: 'found',
        message: `Console should not contain "${assertion.consoleNotContains}" but did`,
      })
    }
  }

  return { differences }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create empty logs object
 */
function createEmptyLogs(): CapturedLogs {
  return {
    console: [],
    network: [],
    timestamp: Date.now(),
    pagePath: '',
  }
}

/**
 * Run all expected outcome comparisons
 */
export function compareAll(
  expectedOutcomes: ExpectedOutcome[],
  actualState: {
    url?: string
    snapshot?: string
    logs?: CapturedLogs
  }
): { passed: boolean; results: ComparisonResult[] } {
  const results = expectedOutcomes.map(expected => compare(expected, actualState))
  const passed = results.every(r => r.passed)

  return { passed, results }
}

/**
 * Generate human-readable comparison summary
 */
export function summarizeComparison(results: ComparisonResult[]): string {
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  let summary = `Assertions: ${passed} passed, ${failed} failed\n`

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗'
    summary += `  ${icon} ${result.expected.type}: ${result.message}\n`

    if (!result.passed && result.differences.length > 0) {
      for (const diff of result.differences) {
        summary += `      Expected: ${diff.expected}\n`
        summary += `      Actual: ${diff.actual}\n`
      }
    }
  }

  return summary
}
