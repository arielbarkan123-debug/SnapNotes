/**
 * E2E Test Orchestrator
 *
 * Main entry point for running E2E tests using MCP Browser Tools.
 * This file provides instructions and utilities for Claude Code to execute
 * the tests through the MCP browser automation tools.
 *
 * Usage: Ask Claude Code to "Run the E2E tests using the materials in e2e/materials/"
 */

import { TEST_CONFIG, TEST_FLOWS, ERROR_PATTERNS } from '../config'
import { getStepInstructions, buildTestExecutionPlan, BROWSER_ACTIONS } from './browser-actions'
import { LOG_CAPTURE_INSTRUCTIONS, detectErrors } from './log-capture'
import { compare, compareAll, summarizeComparison } from './comparator'
import { autoFixer, AUTO_FIX_INSTRUCTIONS, summarizeFixes } from './auto-fixer'
import { generateReport, generateMarkdownReport, generateJSONReport, generateConsoleSummary, getTimestamp } from './reporter'
import type {
  TestScenario,
  TestStep,
  TestResult,
  StepResult,
  CapturedLogs,
  DetectedError,
  PageState,
  TestContext,
} from './types'

// ============================================================================
// Orchestrator Instructions
// ============================================================================

export const ORCHESTRATOR_INSTRUCTIONS = `
# E2E Test Orchestrator Instructions

This document provides step-by-step instructions for running the NoteSnap E2E test suite
using MCP Browser Tools (Claude-in-Chrome).

## Prerequisites

1. Development server running at ${TEST_CONFIG.baseUrl}
2. Test materials placed in e2e/materials/:
   - notebook_page.jpg - Photo of handwritten notes
   - study_notes.pdf - PDF document
   - homework_sample.jpg - Homework to check
3. Test user account created with:
   - Email: ${TEST_CONFIG.credentials.testEmail}
   - Password: ${TEST_CONFIG.credentials.testPassword}

## Test Execution Flow

### Phase 1: Initialize Browser Context

1. Call \`tabs_context_mcp\` to get current browser state
2. Call \`tabs_create_mcp\` to create a new tab for testing
3. Store the tabId for all subsequent operations

### Phase 2: Run Test Scenarios

For each test flow (${TEST_FLOWS.join(', ')}):

1. Load the scenario file: e2e/scenarios/{flow}.scenario.json
2. For each scenario in the flow:
   a. Execute setup if required (login, create course, etc.)
   b. Execute each step using the appropriate MCP tool
   c. Capture logs after steps marked with captureState: true
   d. Take screenshots on failures
   e. Compare actual state with expected outcomes
   f. If failed, attempt auto-fix
   g. Record results

### Phase 3: Generate Report

1. Aggregate all test results
2. Generate JSON report: e2e/reports/report-{timestamp}.json
3. Generate Markdown report: e2e/reports/report-{timestamp}.md
4. Print console summary

## Step Execution Details

### Navigate Step
\`\`\`
Action: navigate
Tool: navigate (MCP)
Parameters: { url: "{baseUrl}{value}", tabId }
\`\`\`

### Click Step
\`\`\`
Action: click
Tool: computer (MCP) with action: "left_click"
   OR: Use read_page to find element ref, then computer with ref
Parameters: { action: "left_click", ref: "{elementRef}", tabId }
\`\`\`

### Type Step
\`\`\`
Action: type
Tool: form_input (MCP)
   OR: computer (MCP) with action: "type"
Parameters: { ref: "{elementRef}", value: "{text}", tabId }
\`\`\`

### Upload Step
\`\`\`
Action: upload
Tool: upload_image (MCP) for images
   OR: Use file input interaction
Parameters: { imageId, ref: "{fileInputRef}", tabId }
\`\`\`

### WaitFor Step
\`\`\`
Action: waitFor
Conditions:
  - timeout:{ms} - Use computer with action: "wait"
  - urlContains:{pattern} - Poll read_page and check URL
  - element:{description} - Poll read_page until element found
\`\`\`

### Snapshot Step
\`\`\`
Action: snapshot
Tool: read_page (MCP)
Parameters: { tabId, filter: "all" }
Returns: Accessibility tree for state comparison
\`\`\`

## Error Detection

After capturing logs, check for these error patterns:

${Object.entries(ERROR_PATTERNS).map(([key, pattern]) =>
  `- ${pattern.code}: ${pattern.consolePattern || pattern.networkPattern || 'N/A'}`
).join('\n')}

## Auto-Fix Strategies

When an error is detected:
1. Categorize: fixable, infrastructure, or unknown
2. Apply strategy:
   - retry: Retry with exponential backoff
   - wait_and_retry: Wait 10s then retry (for rate limits)
   - report_code_fix: Suggest code changes
   - skip: Mark as infrastructure issue

## Example Test Execution

\`\`\`
// 1. Initialize
const { tabId } = await tabs_create_mcp()

// 2. Login (for scenarios requiring auth)
await navigate({ url: "${TEST_CONFIG.baseUrl}/login", tabId })
await waitFor({ time: 2 }) // seconds
const page = await read_page({ tabId, filter: "interactive" })
// Find email input ref from page snapshot
await form_input({ ref: "ref_X", value: "${TEST_CONFIG.credentials.testEmail}", tabId })
// Find password input ref
await form_input({ ref: "ref_Y", value: "${TEST_CONFIG.credentials.testPassword}", tabId })
// Find submit button ref
await computer({ action: "left_click", ref: "ref_Z", tabId })
// Wait for redirect to dashboard
await waitForUrl("/dashboard", tabId)

// 3. Execute scenario steps...

// 4. Capture logs
const console = await read_console_messages({ tabId, limit: 100 })
const network = await read_network_requests({ tabId, urlPattern: "/api/" })

// 5. Check for errors
const errors = detectErrors(console, network)

// 6. Compare with expected
const comparison = compare(actualState, expected)

// 7. Take screenshot on failure
if (!comparison.passed) {
  await computer({ action: "screenshot", tabId })
}
\`\`\`

## Test Materials Mapping

| Scenario | Material File |
|----------|---------------|
| upload_single_image | notebook_page.jpg |
| upload_pdf_document | study_notes.pdf |
| upload_homework_for_checking | homework_sample.jpg |
| homework_help_with_image | homework_sample.jpg |

## Timeouts

| Operation | Timeout |
|-----------|---------|
| Navigation | ${TEST_CONFIG.timeouts.navigation}ms |
| Action | ${TEST_CONFIG.timeouts.action}ms |
| Upload | ${TEST_CONFIG.timeouts.upload}ms |
| AI Processing | ${TEST_CONFIG.timeouts.aiProcessing}ms |
`

// ============================================================================
// Test Result Tracking
// ============================================================================

/**
 * Create empty test result
 */
export function createTestResult(flow: string, scenario: string): TestResult {
  return {
    flow,
    scenario,
    status: 'pending' as const,
    duration: 0,
    steps: [],
    logs: {
      console: [],
      network: [],
      timestamp: Date.now(),
    },
    errors: [],
    screenshots: [],
  }
}

/**
 * Create step result
 */
export function createStepResult(stepId: string): StepResult {
  return {
    stepId,
    status: 'pending' as const,
    duration: 0,
  }
}

/**
 * Mark step as passed
 */
export function passStep(result: StepResult, duration: number): StepResult {
  return {
    ...result,
    status: 'pass',
    duration,
  }
}

/**
 * Mark step as failed
 */
export function failStep(result: StepResult, error: string, duration: number): StepResult {
  return {
    ...result,
    status: 'fail',
    error,
    duration,
  }
}

// ============================================================================
// Scenario Loading
// ============================================================================

/**
 * Get scenario file path
 */
export function getScenarioPath(flow: string): string {
  return `e2e/scenarios/${flow}.scenario.json`
}

/**
 * Instructions for loading scenarios
 */
export const SCENARIO_LOADING_INSTRUCTIONS = `
## Loading Test Scenarios

To load a scenario file, read the JSON file and parse it:

1. Read file: e2e/scenarios/{flow}.scenario.json
2. Parse JSON to get scenario definitions
3. Each scenario contains:
   - name: Unique identifier
   - description: What the test does
   - setup: Prerequisites (login, createCourse, etc.)
   - steps: Array of test steps
   - expected: Array of expected outcomes

Example scenario structure:
{
  "flow": "auth",
  "scenarios": [
    {
      "name": "login_existing_user",
      "setup": {},
      "steps": [
        { "id": "nav_login", "action": "navigate", "value": "/login" },
        { "id": "fill_email", "action": "type", "target": "Email input", "value": "{testEmail}" }
      ],
      "expected": [
        { "type": "navigation", "assertion": { "urlContains": "/dashboard" } }
      ]
    }
  ]
}
`

// ============================================================================
// Setup Helpers
// ============================================================================

export const SETUP_INSTRUCTIONS = `
## Test Setup Instructions

### Login Setup
When scenario has setup.login: true

1. Navigate to ${TEST_CONFIG.baseUrl}/login
2. Wait for page load
3. Find email input (look for input with type="email" or placeholder containing "email")
4. Type: ${TEST_CONFIG.credentials.testEmail}
5. Find password input (look for input with type="password")
6. Type: ${TEST_CONFIG.credentials.testPassword}
7. Click sign in button
8. Wait for URL to contain /dashboard
9. Verify no console errors

### Create Course Setup
When scenario has setup.createCourse: true

1. Ensure logged in first
2. Navigate to ${TEST_CONFIG.baseUrl}/dashboard
3. Click Upload button
4. Upload test material (notebook_page.jpg)
5. Click Generate Course button
6. Wait for processing (may take up to 3 minutes)
7. Wait for redirect to /course/{id}
8. Store courseId for scenario use

### Create Exam Setup
When scenario has setup.createExam: true

1. Ensure course exists first
2. Navigate to /exams
3. Select the test course
4. Configure exam (10 questions)
5. Click Create Exam
6. Wait for exam generation
7. Store examId for scenario use

### Variable Substitution
Replace these placeholders in step values:
- {testEmail} -> ${TEST_CONFIG.credentials.testEmail}
- {testPassword} -> ${TEST_CONFIG.credentials.testPassword}
- {courseId} -> ID from createCourse setup
- {examId} -> ID from createExam setup
- {baseUrl} -> ${TEST_CONFIG.baseUrl}
`

// ============================================================================
// Element Finding Helpers
// ============================================================================

export const ELEMENT_FINDING_INSTRUCTIONS = `
## Finding Elements

Use read_page to get the accessibility tree, then find elements by:

### By Role and Name
Look for elements with matching role and name/text:
- Button: "Sign in button" -> role: button, name contains "Sign in"
- Input: "Email input" -> role: textbox, name/placeholder contains "email"
- Link: "Dashboard link" -> role: link, name contains "Dashboard"

### By Text Content
For elements with visible text:
- "First answer option" -> First option/button in a group
- "Course card" -> Card element containing course info

### Common Element Patterns

| Target Description | How to Find |
|-------------------|-------------|
| Email input | textbox with name/placeholder "email" |
| Password input | textbox with type="password" |
| Sign in button | button with name "Sign in" or "Login" |
| Upload button | button with name containing "Upload" |
| File input | input with type="file" |
| Course title | heading (h1) or element with role="heading" |
| Error message | element with role="alert" or class containing "error" |
| Success indicator | element with class containing "success" |

### Using find Tool
The find tool can search by natural language:
- find({ query: "search bar", tabId })
- find({ query: "login button", tabId })
- find({ query: "course title", tabId })
`

// ============================================================================
// Report Generation Instructions
// ============================================================================

export const REPORT_GENERATION_INSTRUCTIONS = `
## Generating Test Reports

After all tests complete:

1. Collect all TestResult objects
2. Call generateReport() with:
   - results: TestResult[]
   - startTime: Date when tests started
   - endTime: Date when tests ended
   - testMaterialsUsed: Array of material filenames used

3. Generate output files:
   - JSON: Write generateJSONReport(report) to e2e/reports/report-{timestamp}.json
   - Markdown: Write generateMarkdownReport(report) to e2e/reports/report-{timestamp}.md

4. Print console summary:
   - Output generateConsoleSummary(report) to show results

### Report Contents

The report includes:
- metadata: Run ID, timestamps, duration, environment info
- summary: Total, passed, failed, errors, pass rate
- flows: Detailed results by flow and scenario
- errors: Aggregated error information
- fixes: Auto-fix attempts and results

### Example Report Generation

const startTime = new Date()
// ... run tests ...
const endTime = new Date()

const report = generateReport(results, {
  startTime,
  endTime,
  testMaterialsUsed: ['notebook_page.jpg', 'study_notes.pdf', 'homework_sample.jpg']
})

// Save reports
const timestamp = getTimestamp()
// Write to e2e/reports/report-{timestamp}.json
// Write to e2e/reports/report-{timestamp}.md

// Print summary
console.log(generateConsoleSummary(report))
`

// ============================================================================
// Full Test Run Instructions
// ============================================================================

export const FULL_TEST_RUN_INSTRUCTIONS = `
# Complete E2E Test Run Instructions

## Overview

Run all E2E tests for NoteSnap, covering:
- Auth flow (login, logout, protected routes)
- Upload flow (images, PDFs, text)
- Learning flow (courses, lessons, questions)
- Practice flow (sessions, SRS review)
- Exam flow (create, take, results)
- Homework flow (check, help)

## Step-by-Step Execution

### 1. Pre-flight Checks

a. Verify dev server is running at ${TEST_CONFIG.baseUrl}
b. Verify test materials exist in e2e/materials/
c. Initialize browser context

### 2. Initialize Browser

\`\`\`
// Get browser context
tabs_context_mcp({ createIfEmpty: true })

// Create test tab
tabs_create_mcp()
// Store returned tabId
\`\`\`

### 3. Run Auth Flow Tests

Read: e2e/scenarios/auth.scenario.json
Execute scenarios:
1. login_existing_user - Verify login works
2. login_invalid_credentials - Verify error shown
3. logout - Verify logout works
4. protected_route_redirect - Verify auth redirect

### 4. Run Upload Flow Tests

Read: e2e/scenarios/upload.scenario.json
Execute scenarios:
1. upload_single_image - Upload notebook_page.jpg
2. upload_pdf_document - Upload study_notes.pdf
3. upload_text_input - Create course from text
4. upload_validation_error - Verify error for invalid file

### 5. Run Learning Flow Tests

Read: e2e/scenarios/learning.scenario.json
Execute scenarios:
1. view_course_overview - View created course
2. start_lesson - Start first lesson
3. navigate_lesson_steps - Navigate through steps
4. answer_lesson_question - Answer in-lesson question
5. get_help_on_content - Use help feature

### 6. Run Practice Flow Tests

Read: e2e/scenarios/practice.scenario.json
Execute scenarios:
1. start_practice_session - Start practice
2. answer_multiple_choice - Answer MC question
3. answer_short_answer - Answer short answer
4. complete_practice_session - Complete session
5. srs_review_session - Review SRS cards
6. practice_hub_navigation - Navigate hub

### 7. Run Exam Flow Tests

Read: e2e/scenarios/exam.scenario.json
Execute scenarios:
1. view_exams_page - View exams page
2. create_exam_from_course - Create exam
3. take_exam - Take exam and submit
4. view_exam_results - View results
5. exam_timer_display - Verify timer
6. exam_navigation - Navigate questions

### 8. Run Homework Flow Tests

Read: e2e/scenarios/homework.scenario.json
Execute scenarios:
1. view_homework_check_page - View check page
2. upload_homework_for_checking - Upload and check
3. view_homework_help_page - View help page
4. ask_homework_question - Ask question
5. homework_help_with_image - Help with image
6. homework_follow_up_question - Follow-up
7. homework_validation_empty_input - Test validation

### 9. For Each Scenario

1. Check setup requirements
2. Execute setup if needed (login, create course)
3. For each step:
   a. Record start time
   b. Execute step action
   c. Record end time and duration
   d. If captureState: true, capture logs
   e. If error, take screenshot
4. After all steps, compare with expected outcomes
5. If failed, attempt auto-fix
6. Record result

### 10. Generate Reports

After all scenarios complete:
1. Compile all results
2. Generate JSON report
3. Generate Markdown report
4. Print console summary
5. Report any critical failures

## Error Handling

If a scenario fails:
1. Capture screenshot
2. Capture console/network logs
3. Detect error type using ERROR_PATTERNS
4. Attempt auto-fix if fixable
5. Record failure details
6. Continue to next scenario

## Success Criteria

- All auth tests pass
- At least one upload test passes (creates course for other tests)
- Learning, practice, exam, homework tests show expected UI states
- No critical console errors (excluding known warnings)
- API calls return success status codes
`

// ============================================================================
// Exports
// ============================================================================

export {
  TEST_CONFIG,
  TEST_FLOWS,
  ERROR_PATTERNS,
  getStepInstructions,
  buildTestExecutionPlan,
  BROWSER_ACTIONS,
  LOG_CAPTURE_INSTRUCTIONS,
  detectErrors,
  compare,
  compareAll,
  summarizeComparison,
  autoFixer,
  AUTO_FIX_INSTRUCTIONS,
  summarizeFixes,
  generateReport,
  generateMarkdownReport,
  generateJSONReport,
  generateConsoleSummary,
  getTimestamp,
}

// ============================================================================
// Quick Reference
// ============================================================================

export const QUICK_REFERENCE = `
## Quick Reference

### MCP Tools Used
- tabs_context_mcp - Get browser context
- tabs_create_mcp - Create new tab
- navigate - Go to URL
- read_page - Get accessibility tree
- find - Find elements by description
- computer - Click, type, screenshot, wait
- form_input - Fill form fields
- upload_image - Upload files
- read_console_messages - Get console logs
- read_network_requests - Get network logs

### Key Files
- e2e/config.ts - Configuration
- e2e/runner/types.ts - Type definitions
- e2e/runner/browser-actions.ts - Action instructions
- e2e/runner/log-capture.ts - Log capture
- e2e/runner/comparator.ts - Result comparison
- e2e/runner/auto-fixer.ts - Auto-fix logic
- e2e/runner/reporter.ts - Report generation
- e2e/scenarios/*.json - Test scenarios

### Timeouts
- Navigation: ${TEST_CONFIG.timeouts.navigation}ms
- Action: ${TEST_CONFIG.timeouts.action}ms
- Upload: ${TEST_CONFIG.timeouts.upload}ms
- AI Processing: ${TEST_CONFIG.timeouts.aiProcessing}ms

### Test Flows
${TEST_FLOWS.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`
