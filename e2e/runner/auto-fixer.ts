/**
 * Auto-Fixer
 * Automatically attempts to fix detected errors during E2E tests
 *
 * Strategies:
 * - Retry: Retry failed network requests with backoff
 * - Wait and Retry: Wait longer then retry (for rate limiting)
 * - Report Code Fix: Identify code changes needed
 * - Skip: Mark as infrastructure issue
 */

import { TEST_CONFIG, ERROR_PATTERNS } from '../config'
import type {
  DetectedError,
  AppliedFix,
  CodeChange,
  FixStrategy,
  TestContext,
  StepResult,
} from './types'

// ============================================================================
// Fix Strategy Definitions
// ============================================================================

export const FIX_STRATEGIES: Record<string, FixStrategy> = {
  retry: {
    name: 'retry',
    type: 'retry',
    maxAttempts: TEST_CONFIG.retry.maxAttempts,
  },
  wait_and_retry: {
    name: 'wait_and_retry',
    type: 'wait_and_retry',
    maxAttempts: 3,
    waitMs: 10000, // 10 seconds for rate limits
  },
  report_code_fix: {
    name: 'report_code_fix',
    type: 'report_code_fix',
  },
  skip: {
    name: 'skip',
    type: 'skip',
  },
}

// ============================================================================
// Main Auto-Fixer Class
// ============================================================================

export class AutoFixer {
  private fixHistory: AppliedFix[] = []

  /**
   * Attempt to fix a detected error
   */
  async attemptFix(
    error: DetectedError,
    context: FixContext
  ): Promise<AppliedFix> {
    // Categorize the error
    const category = this.categorizeError(error)

    // Get appropriate strategy
    const strategy = this.getStrategy(error, category)

    // Apply the fix
    const fix = await this.applyStrategy(error, strategy, context)

    // Record in history
    this.fixHistory.push(fix)

    return fix
  }

  /**
   * Categorize error as fixable, infrastructure, or unknown
   */
  categorizeError(error: DetectedError): 'fixable' | 'infrastructure' | 'unknown' {
    const INFRASTRUCTURE_CODES = [
      'SERVICE_UNAVAILABLE',
      'DATABASE_ERROR',
      'STORAGE_QUOTA_EXCEEDED',
      'UNAUTHORIZED', // Need user action
      'SESSION_EXPIRED',
    ]

    const FIXABLE_CODES = [
      'NETWORK_ERROR',
      'NETWORK_TIMEOUT',
      'AI_TIMEOUT',
      'AI_PROCESSING_FAILED',
      'RATE_LIMITED',
      'HYDRATION_ERROR',
    ]

    if (INFRASTRUCTURE_CODES.includes(error.code)) {
      return 'infrastructure'
    }
    if (FIXABLE_CODES.includes(error.code) || error.isRetryable) {
      return 'fixable'
    }
    return 'unknown'
  }

  /**
   * Get the appropriate fix strategy for an error
   */
  getStrategy(
    error: DetectedError,
    category: 'fixable' | 'infrastructure' | 'unknown'
  ): FixStrategy {
    // Check if error pattern has a specific strategy
    const pattern = Object.values(ERROR_PATTERNS).find(p => p.code === error.code) as
      | (typeof ERROR_PATTERNS[keyof typeof ERROR_PATTERNS] & { fixStrategy?: string })
      | undefined
    if (pattern && 'fixStrategy' in pattern && pattern.fixStrategy) {
      return FIX_STRATEGIES[pattern.fixStrategy] || FIX_STRATEGIES.skip
    }

    // Default strategies by category
    switch (category) {
      case 'fixable':
        return error.code === 'HYDRATION_ERROR'
          ? FIX_STRATEGIES.report_code_fix
          : FIX_STRATEGIES.retry
      case 'infrastructure':
        return FIX_STRATEGIES.skip
      default:
        return FIX_STRATEGIES.skip
    }
  }

  /**
   * Apply the fix strategy
   */
  async applyStrategy(
    error: DetectedError,
    strategy: FixStrategy,
    context: FixContext
  ): Promise<AppliedFix> {
    switch (strategy.type) {
      case 'retry':
        return this.applyRetryStrategy(error, strategy, context)

      case 'wait_and_retry':
        return this.applyWaitAndRetryStrategy(error, strategy, context)

      case 'report_code_fix':
        return this.applyReportCodeFixStrategy(error, context)

      case 'skip':
      default:
        return {
          error,
          strategy: strategy.name,
          success: false,
          action: 'skipped',
          details: `Error ${error.code} marked as ${this.categorizeError(error)} - requires manual intervention`,
        }
    }
  }

  /**
   * Retry strategy with exponential backoff
   */
  async applyRetryStrategy(
    error: DetectedError,
    strategy: FixStrategy,
    context: FixContext
  ): Promise<AppliedFix> {
    const maxAttempts = strategy.maxAttempts || TEST_CONFIG.retry.maxAttempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Calculate backoff
      const backoff = TEST_CONFIG.retry.backoffMs *
        Math.pow(TEST_CONFIG.retry.backoffMultiplier, attempt - 1)

      console.log(`[AutoFixer] Retry attempt ${attempt}/${maxAttempts} after ${backoff}ms`)

      // Wait
      await this.wait(backoff)

      // Retry the step
      if (context.retryStep) {
        const result = await context.retryStep()
        if (result.success) {
          return {
            error,
            strategy: 'retry',
            success: true,
            action: 'retried',
            details: `Succeeded on attempt ${attempt + 1}`,
            attempts: attempt,
          }
        }
      }
    }

    return {
      error,
      strategy: 'retry',
      success: false,
      action: 'retry_exhausted',
      details: `All ${maxAttempts} retry attempts failed`,
      attempts: maxAttempts,
    }
  }

  /**
   * Wait and retry strategy for rate limiting
   */
  async applyWaitAndRetryStrategy(
    error: DetectedError,
    strategy: FixStrategy,
    context: FixContext
  ): Promise<AppliedFix> {
    const waitMs = strategy.waitMs || 10000

    console.log(`[AutoFixer] Rate limited - waiting ${waitMs}ms before retry`)

    await this.wait(waitMs)

    if (context.retryStep) {
      const result = await context.retryStep()
      if (result.success) {
        return {
          error,
          strategy: 'wait_and_retry',
          success: true,
          action: 'waited_and_retried',
          details: `Succeeded after waiting ${waitMs}ms`,
        }
      }
    }

    return {
      error,
      strategy: 'wait_and_retry',
      success: false,
      action: 'still_rate_limited',
      details: `Still rate limited after waiting ${waitMs}ms`,
    }
  }

  /**
   * Report code fix strategy - analyze error and suggest code changes
   */
  async applyReportCodeFixStrategy(
    error: DetectedError,
    context: FixContext
  ): Promise<AppliedFix> {
    const codeChanges: CodeChange[] = []

    // Analyze error and generate fix suggestions
    switch (error.code) {
      case 'HYDRATION_ERROR':
        codeChanges.push(...this.suggestHydrationFix(error))
        break

      case 'VALIDATION_ERROR':
        codeChanges.push(...this.suggestValidationFix(error))
        break

      default:
        if (error.exposesInternalInfo) {
          codeChanges.push(...this.suggestErrorSanitizationFix(error))
        }
    }

    return {
      error,
      strategy: 'report_code_fix',
      success: codeChanges.length > 0,
      action: codeChanges.length > 0 ? 'code_fix_suggested' : 'no_fix_available',
      details: codeChanges.length > 0
        ? `Suggested ${codeChanges.length} code change(s)`
        : 'No automatic fix available',
      codeChanges,
    }
  }

  /**
   * Suggest fix for hydration errors
   */
  suggestHydrationFix(error: DetectedError): CodeChange[] {
    // Extract component name from error message if possible
    const componentMatch = error.message.match(/in (\w+)|at (\w+)/i)
    const component = componentMatch?.[1] || componentMatch?.[2] || 'Component'

    return [
      {
        file: `components/${component}.tsx`,
        reason: 'Hydration mismatch - component renders differently on server vs client',
        before: '// Component may have dynamic content causing hydration mismatch',
        after: `// Add mounted state to handle hydration
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null // or loading skeleton`,
        applied: false,
      },
      {
        file: `components/${component}.tsx`,
        reason: 'Alternative: Use suppressHydrationWarning for intentional differences',
        before: '<div>',
        after: '<div suppressHydrationWarning>',
        applied: false,
      },
    ]
  }

  /**
   * Suggest fix for validation errors
   */
  suggestValidationFix(error: DetectedError): CodeChange[] {
    return [
      {
        file: 'Unknown - check form/input handling',
        reason: 'Validation error - ensure input validation matches API expectations',
        before: '// Check validation logic',
        after: '// Add proper input validation before submission',
        applied: false,
      },
    ]
  }

  /**
   * Suggest fix for exposed internal errors
   */
  suggestErrorSanitizationFix(error: DetectedError): CodeChange[] {
    const endpoint = error.apiEndpoint || 'unknown'

    return [
      {
        file: `app/api/${endpoint}/route.ts`,
        reason: 'Internal error details exposed to client',
        before: 'return NextResponse.json({ error: error.message })',
        after: `import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
return createErrorResponse(ErrorCodes.INTERNAL_ERROR)`,
        applied: false,
      },
      {
        file: 'lib/utils/error-sanitizer.ts',
        reason: 'Use sanitizeError utility for user-facing error messages',
        before: 'setError(err.message)',
        after: `import { sanitizeError } from '@/lib/utils/error-sanitizer'
setError(sanitizeError(err))`,
        applied: false,
      },
    ]
  }

  /**
   * Check if an error can be auto-fixed
   */
  canAutoFix(error: DetectedError): boolean {
    const category = this.categorizeError(error)
    return category === 'fixable' && error.isRetryable
  }

  /**
   * Get fix history
   */
  getFixHistory(): AppliedFix[] {
    return [...this.fixHistory]
  }

  /**
   * Clear fix history
   */
  clearHistory(): void {
    this.fixHistory = []
  }

  /**
   * Wait helper
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// Fix Context Type
// ============================================================================

export interface FixContext {
  tabId: number
  currentStep?: string
  retryStep?: () => Promise<{ success: boolean; result?: StepResult }>
  getPageState?: () => Promise<{ url: string; snapshot: string }>
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format code changes for display
 */
export function formatCodeChanges(changes: CodeChange[]): string {
  if (changes.length === 0) {
    return 'No code changes suggested'
  }

  let output = 'Suggested Code Changes:\n'
  output += '='.repeat(50) + '\n\n'

  for (const change of changes) {
    output += `File: ${change.file}\n`
    output += `Reason: ${change.reason}\n`
    if (change.before) {
      output += `Before:\n  ${change.before}\n`
    }
    if (change.after) {
      output += `After:\n  ${change.after}\n`
    }
    output += `Status: ${change.applied ? 'Applied' : 'Pending'}\n`
    output += '-'.repeat(40) + '\n\n'
  }

  return output
}

/**
 * Summarize fix attempts
 */
export function summarizeFixes(fixes: AppliedFix[]): string {
  const successful = fixes.filter(f => f.success).length
  const failed = fixes.filter(f => !f.success).length

  let summary = `Fix Summary: ${successful} successful, ${failed} failed\n\n`

  for (const fix of fixes) {
    const icon = fix.success ? '✓' : '✗'
    summary += `${icon} ${fix.error.code}: ${fix.action}\n`
    summary += `  Strategy: ${fix.strategy}\n`
    summary += `  Details: ${fix.details}\n`
    if (fix.codeChanges && fix.codeChanges.length > 0) {
      summary += `  Code changes: ${fix.codeChanges.length}\n`
    }
    summary += '\n'
  }

  return summary
}

// ============================================================================
// Auto-Fix Instructions
// ============================================================================

export const AUTO_FIX_INSTRUCTIONS = `
## Auto-Fix Workflow

When an error is detected:

1. **Categorize** the error:
   - fixable: Network errors, timeouts, rate limits, hydration
   - infrastructure: Database, auth, service unavailable
   - unknown: Other errors

2. **Select strategy**:
   - retry: For network/timeout errors
   - wait_and_retry: For rate limiting
   - report_code_fix: For code issues like hydration
   - skip: For infrastructure issues

3. **Execute strategy**:
   - retry: Wait with backoff, re-run failed step
   - wait_and_retry: Wait 10s, then retry once
   - report_code_fix: Analyze error, suggest code changes
   - skip: Log and continue

4. **Record result**:
   - Success/failure status
   - Action taken
   - Code changes suggested (if any)
   - Number of attempts (for retries)

## During Test Execution

After each failed step:
1. Capture error details
2. Call autoFixer.attemptFix(error, context)
3. If fix.success, continue test
4. If !fix.success, mark step as failed
5. Record fix attempt in report
`

// Export singleton instance
export const autoFixer = new AutoFixer()
