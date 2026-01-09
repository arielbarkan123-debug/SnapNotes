/**
 * Browser Actions
 * Wrapper around MCP Browser Tools for E2E testing
 *
 * This module provides a clean API for browser automation using
 * Claude-in-Chrome MCP tools. It's designed to be used by the
 * test orchestrator to execute test steps.
 *
 * NOTE: This module defines the interface for browser actions.
 * The actual MCP tool calls are made by Claude Code when running tests.
 */

import { TEST_CONFIG } from '../config'
import type {
  BrowserContext,
  ElementInfo,
  PageSnapshot,
  WaitCondition,
} from './types'

// ============================================================================
// Browser Action Instructions
// ============================================================================

/**
 * Instructions for initializing browser context
 *
 * MCP Tools to use:
 * 1. tabs_context_mcp - Get existing tabs
 * 2. tabs_create_mcp - Create new tab if needed
 *
 * Returns: { tabId: number }
 */
export const INIT_CONTEXT_INSTRUCTIONS = `
To initialize browser context:
1. Call mcp__claude-in-chrome__tabs_context_mcp with { createIfEmpty: true }
2. If no suitable tab exists, call mcp__claude-in-chrome__tabs_create_mcp
3. Store the tabId for subsequent actions
`

/**
 * Instructions for navigation
 *
 * MCP Tools to use:
 * - navigate - Navigate to URL
 *
 * @param url - Full URL or path (will be prefixed with baseUrl)
 */
export const NAVIGATE_INSTRUCTIONS = `
To navigate to a URL:
1. If URL doesn't start with http, prefix with baseUrl from config
2. Call mcp__claude-in-chrome__navigate with { url, tabId }
3. Wait for page to load using computer screenshot or read_page
`

/**
 * Instructions for clicking elements
 *
 * MCP Tools to use:
 * - find - Find element by description
 * - computer - Click using coordinates or ref
 *
 * @param target - Element description or selector
 */
export const CLICK_INSTRUCTIONS = `
To click an element:
1. Call mcp__claude-in-chrome__find with { query: target, tabId }
2. Get the ref from the found element
3. Call mcp__claude-in-chrome__computer with { action: 'left_click', ref, tabId }
   OR with { action: 'left_click', coordinate: [x, y], tabId }
`

/**
 * Instructions for typing text
 *
 * MCP Tools to use:
 * - find - Find input element
 * - form_input - Set input value
 * OR
 * - computer - Type text character by character
 */
export const TYPE_INSTRUCTIONS = `
To type into an input:
1. Call mcp__claude-in-chrome__find with { query: target, tabId }
2. Get the ref from the found element
3. Call mcp__claude-in-chrome__form_input with { ref, value, tabId }
   OR call mcp__claude-in-chrome__computer with { action: 'triple_click', ref, tabId }
   then { action: 'type', text: value, tabId }
`

/**
 * Instructions for uploading files
 *
 * MCP Tools to use:
 * - find - Find file input
 * - upload_image - Upload file to input
 *
 * @param filePath - Path to file in e2e/materials/
 */
export const UPLOAD_INSTRUCTIONS = `
To upload a file:
1. Call mcp__claude-in-chrome__find with { query: 'file input', tabId }
2. Get the ref from the found element
3. Call mcp__claude-in-chrome__upload_image with { ref, imageId: filePath, tabId }
   Note: For non-image files, may need to use computer tool to interact with file dialog
`

/**
 * Instructions for waiting
 *
 * MCP Tools to use:
 * - read_page - Check if element exists
 * - computer wait - Wait for specified time
 *
 * @param condition - Wait condition type
 */
export const WAIT_INSTRUCTIONS = `
To wait for a condition:
1. For element: Poll mcp__claude-in-chrome__read_page until element found
2. For navigation: Poll until URL matches expected
3. For timeout: Call mcp__claude-in-chrome__computer with { action: 'wait', duration }
4. For network: Check mcp__claude-in-chrome__read_network_requests for expected request
`

/**
 * Instructions for taking screenshots
 *
 * MCP Tools to use:
 * - computer screenshot - Capture current state
 */
export const SCREENSHOT_INSTRUCTIONS = `
To take a screenshot:
1. Call mcp__claude-in-chrome__computer with { action: 'screenshot', tabId }
2. Save the returned image with the specified filename
`

/**
 * Instructions for getting page snapshot
 *
 * MCP Tools to use:
 * - read_page - Get accessibility tree
 */
export const SNAPSHOT_INSTRUCTIONS = `
To get page snapshot:
1. Call mcp__claude-in-chrome__read_page with { tabId }
2. Parse the accessibility tree to extract elements
3. Return structured PageSnapshot object
`

// ============================================================================
// Action Execution Templates
// ============================================================================

/**
 * Template for executing a test step
 * Returns instructions for Claude Code to execute
 */
export function getStepInstructions(
  action: string,
  target?: string,
  value?: string,
  tabId?: number
): string {
  const tab = tabId ? `tabId: ${tabId}` : 'tabId: (use current tab)'

  switch (action) {
    case 'navigate':
      return `
NAVIGATE to "${value}"
1. Call mcp__claude-in-chrome__navigate({ url: "${value}", ${tab} })
2. Wait 2 seconds for page load
3. Take screenshot to verify
`

    case 'click':
      return `
CLICK on "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Click the found element using computer tool with ref or coordinates
3. Wait 1 second for any animations/updates
`

    case 'type':
      return `
TYPE "${value}" into "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Call mcp__claude-in-chrome__form_input({ ref: (found ref), value: "${value}", ${tab} })
`

    case 'upload':
      return `
UPLOAD file "${value}" to "${target}"
1. Find the file input element
2. Use upload_image tool with the file path: e2e/materials/${value}
3. Wait for upload preview to appear
`

    case 'select':
      return `
SELECT "${value}" in dropdown "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Call mcp__claude-in-chrome__form_input({ ref: (found ref), value: "${value}", ${tab} })
`

    case 'waitFor':
      return `
WAIT for condition: ${value}
- If element: Poll read_page until "${target}" found
- If navigation: Poll until URL contains "${value}"
- If timeout: Wait ${value}ms using computer wait action
`

    case 'snapshot':
      return `
SNAPSHOT page state
1. Call mcp__claude-in-chrome__read_page({ ${tab} })
2. Return the accessibility tree for analysis
`

    case 'screenshot':
      return `
SCREENSHOT with name "${value}"
1. Call mcp__claude-in-chrome__computer({ action: 'screenshot', ${tab} })
2. Save as e2e/reports/screenshots/${value}.png
`

    case 'scroll':
      return `
SCROLL ${value} on page
1. Call mcp__claude-in-chrome__computer({
   action: 'scroll',
   scroll_direction: "${value}",
   ${tab}
})
`

    case 'hover':
      return `
HOVER over "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Call mcp__claude-in-chrome__computer({ action: 'hover', ref: (found ref), ${tab} })
`

    case 'pressKey':
      return `
PRESS KEY "${value}"
1. Call mcp__claude-in-chrome__computer({ action: 'key', text: "${value}", ${tab} })
`

    case 'clearInput':
      return `
CLEAR input "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Call mcp__claude-in-chrome__computer({ action: 'triple_click', ref: (found ref), ${tab} })
3. Call mcp__claude-in-chrome__computer({ action: 'key', text: 'Backspace', ${tab} })
`

    case 'assertText':
      return `
ASSERT text "${value}" in "${target}"
1. Call mcp__claude-in-chrome__find({ query: "${target}", ${tab} })
2. Check if found element contains text "${value}"
3. Return pass/fail based on result
`

    case 'assertVisible':
      return `
ASSERT "${target}" is visible
1. Call mcp__claude-in-chrome__read_page({ ${tab} })
2. Search for element matching "${target}"
3. Return pass if found, fail if not
`

    case 'assertNotVisible':
      return `
ASSERT "${target}" is NOT visible
1. Call mcp__claude-in-chrome__read_page({ ${tab} })
2. Search for element matching "${target}"
3. Return pass if NOT found, fail if found
`

    default:
      return `Unknown action: ${action}`
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build full URL from path
 */
export function buildUrl(path: string): string {
  if (path.startsWith('http')) {
    return path
  }
  const baseUrl = TEST_CONFIG.baseUrl.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Get timeout for action type
 */
export function getTimeoutForAction(action: string): number {
  switch (action) {
    case 'navigate':
      return TEST_CONFIG.timeouts.navigation
    case 'upload':
      return TEST_CONFIG.timeouts.upload
    case 'waitFor':
      return TEST_CONFIG.timeouts.aiProcessing // Could be waiting for AI
    default:
      return TEST_CONFIG.timeouts.action
  }
}

/**
 * Parse element from read_page result
 */
export function parseElementFromSnapshot(
  snapshot: string,
  query: string
): ElementInfo | null {
  // This would parse the accessibility tree from read_page
  // Implementation depends on the actual format returned
  // For now, return null as actual parsing happens during execution
  return null
}

/**
 * Check if URL matches condition
 */
export function urlMatchesCondition(
  currentUrl: string,
  condition: { equals?: string; contains?: string; matches?: string }
): boolean {
  if (condition.equals) {
    return currentUrl === condition.equals || currentUrl === buildUrl(condition.equals)
  }
  if (condition.contains) {
    return currentUrl.includes(condition.contains)
  }
  if (condition.matches) {
    return new RegExp(condition.matches).test(currentUrl)
  }
  return false
}

// ============================================================================
// Exported Action Builders
// ============================================================================

/**
 * Build complete test execution plan
 */
export function buildTestExecutionPlan(
  scenario: { steps: Array<{ id: string; action: string; target?: string; value?: string }> },
  tabId: number
): string {
  const instructions: string[] = [
    `# Test Execution Plan`,
    `Tab ID: ${tabId}`,
    ``,
    `## Steps:`,
  ]

  scenario.steps.forEach((step, index) => {
    instructions.push(``)
    instructions.push(`### Step ${index + 1}: ${step.id}`)
    instructions.push(getStepInstructions(step.action, step.target, step.value, tabId))
  })

  instructions.push(``)
  instructions.push(`## After Each Step:`)
  instructions.push(`1. Capture console logs using read_console_messages`)
  instructions.push(`2. Capture network requests using read_network_requests`)
  instructions.push(`3. Record step result (pass/fail)`)
  instructions.push(`4. Take screenshot if step failed`)

  return instructions.join('\n')
}
