/**
 * Log Capture
 * Captures console logs and network requests during E2E tests
 *
 * Uses MCP Browser Tools:
 * - read_console_messages - Capture console output
 * - read_network_requests - Capture API calls
 */

import { TEST_CONFIG, ERROR_PATTERNS } from '../config'
import type {
  CapturedLogs,
  ConsoleMessage,
  NetworkRequest,
  DetectedError,
} from './types'

// ============================================================================
// Log Capture Instructions
// ============================================================================

/**
 * Instructions for capturing console logs
 *
 * MCP Tool: read_console_messages
 */
export const CAPTURE_CONSOLE_INSTRUCTIONS = `
To capture console logs:
1. Call mcp__claude-in-chrome__read_console_messages({
   tabId: (current tab),
   limit: ${TEST_CONFIG.logging.maxConsoleMessages},
   pattern: '${TEST_CONFIG.logging.consolePattern}',
   clear: false  // Don't clear yet, we may need to re-read
})
2. Parse the results into ConsoleMessage[] format
3. Filter by level if needed (error, warning, info, debug)
`

/**
 * Instructions for capturing network requests
 *
 * MCP Tool: read_network_requests
 */
export const CAPTURE_NETWORK_INSTRUCTIONS = `
To capture network requests:
1. Call mcp__claude-in-chrome__read_network_requests({
   tabId: (current tab),
   limit: ${TEST_CONFIG.logging.maxNetworkRequests},
   urlPattern: '${TEST_CONFIG.logging.networkPattern}',
   clear: false
})
2. Parse the results into NetworkRequest[] format
3. Check for failed requests or error status codes
`

/**
 * Instructions for clearing logs before test step
 */
export const CLEAR_LOGS_INSTRUCTIONS = `
To clear logs before a new capture:
1. Call mcp__claude-in-chrome__read_console_messages({ tabId, clear: true })
2. Call mcp__claude-in-chrome__read_network_requests({ tabId, clear: true })
3. This ensures we only capture logs for the current step
`

// ============================================================================
// Log Parsing Functions
// ============================================================================

/**
 * Parse console messages from MCP tool response
 */
export function parseConsoleMessages(rawOutput: string): ConsoleMessage[] {
  const messages: ConsoleMessage[] = []

  // Parse based on expected format from read_console_messages
  // Format varies but typically includes level, message, and timestamp
  const lines = rawOutput.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // Try to parse structured format
    const levelMatch = line.match(/\[(error|warning|info|debug|log)\]/i)
    const level = levelMatch
      ? (levelMatch[1].toLowerCase() as ConsoleMessage['level'])
      : 'log'

    // Extract message content
    const message = line
      .replace(/\[(error|warning|info|debug|log)\]/gi, '')
      .trim()

    if (message) {
      messages.push({
        level,
        message,
        timestamp: Date.now(),
        source: 'console',
      })
    }
  }

  return messages
}

/**
 * Parse network requests from MCP tool response
 */
export function parseNetworkRequests(rawOutput: string): NetworkRequest[] {
  const requests: NetworkRequest[] = []

  // Parse based on expected format from read_network_requests
  // Typically includes URL, method, status, duration
  const lines = rawOutput.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // Try to extract request info
    const urlMatch = line.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i)
    const methodMatch = line.match(/(GET|POST|PUT|DELETE|PATCH)/i)
    const statusMatch = line.match(/(\d{3})/);
    const failedMatch = line.match(/failed|error|timeout/i)

    if (urlMatch) {
      requests.push({
        url: urlMatch[1],
        method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
        status: statusMatch ? parseInt(statusMatch[1], 10) : null,
        statusText: '',
        duration: 0,
        failed: !!failedMatch,
        errorMessage: failedMatch ? line : undefined,
      })
    }
  }

  return requests
}

// ============================================================================
// Error Detection Functions
// ============================================================================

/**
 * Detect errors from captured logs
 */
export function detectErrors(logs: CapturedLogs): DetectedError[] {
  const errors: DetectedError[] = []

  // Check console for errors
  for (const msg of logs.console) {
    const detected = detectConsoleError(msg)
    if (detected) {
      errors.push(detected)
    }
  }

  // Check network for failed requests
  for (const req of logs.network) {
    const detected = detectNetworkError(req)
    if (detected) {
      errors.push(detected)
    }
  }

  return errors
}

/**
 * Check if a console message indicates an error
 */
export function detectConsoleError(msg: ConsoleMessage): DetectedError | null {
  // Skip non-error messages unless they contain error keywords
  if (msg.level !== 'error' && !msg.message.match(/error|fail|exception/i)) {
    return null
  }

  // Check against known error patterns
  for (const [code, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.consolePattern && pattern.consolePattern.test(msg.message)) {
      return {
        code,
        message: msg.message,
        severity: pattern.severity,
        source: 'console',
        timestamp: msg.timestamp,
        isRetryable: pattern.autoFixable || false,
        exposesInternalInfo: checkExposesInternalInfo(msg.message),
      }
    }
  }

  // Generic error detection
  if (msg.level === 'error') {
    return {
      code: 'CONSOLE_ERROR',
      message: msg.message,
      severity: 'medium',
      source: 'console',
      timestamp: msg.timestamp,
      isRetryable: false,
      exposesInternalInfo: checkExposesInternalInfo(msg.message),
    }
  }

  return null
}

/**
 * Check if a network request indicates an error
 */
export function detectNetworkError(req: NetworkRequest): DetectedError | null {
  // Check for failed requests
  if (req.failed) {
    return {
      code: 'NETWORK_ERROR',
      message: req.errorMessage || `Request to ${req.url} failed`,
      severity: 'high',
      source: 'network',
      timestamp: Date.now(),
      apiEndpoint: req.url,
      isRetryable: true,
      exposesInternalInfo: false,
    }
  }

  // Check for error status codes
  if (req.status && req.status >= 400) {
    // Find matching error pattern by status
    for (const [code, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.networkStatus === req.status) {
        return {
          code,
          message: `${req.method} ${req.url} returned ${req.status}`,
          severity: pattern.severity,
          source: 'network',
          timestamp: Date.now(),
          apiEndpoint: req.url,
          networkStatus: req.status,
          isRetryable: pattern.autoFixable || false,
          exposesInternalInfo: checkExposesInternalInfo(req.responseBody || ''),
        }
      }
    }

    // Generic HTTP error
    return {
      code: `HTTP_${req.status}`,
      message: `${req.method} ${req.url} returned ${req.status}`,
      severity: req.status >= 500 ? 'high' : 'medium',
      source: 'network',
      timestamp: Date.now(),
      apiEndpoint: req.url,
      networkStatus: req.status,
      isRetryable: req.status >= 500,
      exposesInternalInfo: false,
    }
  }

  return null
}

/**
 * Check if error message exposes internal information
 * (Stack traces, file paths, database details, etc.)
 */
export function checkExposesInternalInfo(message: string): boolean {
  const patterns = [
    /at\s+\w+\s+\([^)]+:\d+:\d+\)/,  // Stack trace
    /\/Users\/|\/home\/|C:\\/,        // File paths
    /password|secret|key|token/i,     // Credentials
    /database|postgres|supabase/i,    // Database info
    /internal server error/i,          // Generic internal error
    /\{[\s\S]*"type":\s*"error"/,      // Raw JSON error objects
  ]

  return patterns.some(p => p.test(message))
}

// ============================================================================
// Log Analysis Functions
// ============================================================================

/**
 * Get summary statistics from logs
 */
export function getLogSummary(logs: CapturedLogs): {
  consoleErrors: number
  networkErrors: number
  warnings: number
  totalRequests: number
  failedRequests: number
} {
  return {
    consoleErrors: logs.console.filter(m => m.level === 'error').length,
    networkErrors: logs.network.filter(r => r.failed || (r.status && r.status >= 400)).length,
    warnings: logs.console.filter(m => m.level === 'warning').length,
    totalRequests: logs.network.length,
    failedRequests: logs.network.filter(r => r.failed).length,
  }
}

/**
 * Filter logs by API endpoint
 */
export function filterLogsByEndpoint(
  logs: CapturedLogs,
  endpoint: string
): NetworkRequest[] {
  return logs.network.filter(r => r.url.includes(endpoint))
}

/**
 * Check if specific API was called successfully
 */
export function wasApiCallSuccessful(
  logs: CapturedLogs,
  endpoint: string,
  method?: string
): boolean {
  const matching = logs.network.filter(r => {
    const urlMatch = r.url.includes(endpoint)
    const methodMatch = !method || r.method === method.toUpperCase()
    return urlMatch && methodMatch
  })

  return matching.some(r => !r.failed && r.status && r.status >= 200 && r.status < 300)
}

/**
 * Get all error messages from logs
 */
export function getAllErrorMessages(logs: CapturedLogs): string[] {
  const messages: string[] = []

  // Console errors
  logs.console
    .filter(m => m.level === 'error')
    .forEach(m => messages.push(`[Console] ${m.message}`))

  // Network errors
  logs.network
    .filter(r => r.failed || (r.status && r.status >= 400))
    .forEach(r => messages.push(`[Network] ${r.method} ${r.url} - ${r.status || 'Failed'}`))

  return messages
}

// ============================================================================
// Capture Workflow
// ============================================================================

/**
 * Full capture workflow instructions
 */
export const FULL_CAPTURE_WORKFLOW = `
## Log Capture Workflow

### Before Test Step:
1. Clear previous logs (if capturing per-step):
   - read_console_messages({ tabId, clear: true })
   - read_network_requests({ tabId, clear: true })

### After Test Step:
1. Capture console logs:
   - read_console_messages({ tabId, limit: 200 })

2. Capture network requests:
   - read_network_requests({ tabId, urlPattern: '/api/' })

3. Parse and analyze:
   - Convert raw output to ConsoleMessage[] and NetworkRequest[]
   - Run detectErrors() to find issues
   - Run getLogSummary() for statistics

4. Return CapturedLogs object:
   {
     console: [...],
     network: [...],
     timestamp: Date.now(),
     pagePath: current URL path
   }
`

/**
 * Create empty captured logs object
 */
export function createEmptyLogs(pagePath: string = ''): CapturedLogs {
  return {
    console: [],
    network: [],
    timestamp: Date.now(),
    pagePath,
  }
}

/**
 * Merge multiple log captures
 */
export function mergeLogs(...captures: CapturedLogs[]): CapturedLogs {
  return {
    console: captures.flatMap(c => c.console),
    network: captures.flatMap(c => c.network),
    timestamp: Date.now(),
    pagePath: captures[captures.length - 1]?.pagePath || '',
  }
}
