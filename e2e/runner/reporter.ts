/**
 * Reporter
 * Generates test reports in JSON and Markdown formats
 */

import { TEST_CONFIG, TEST_FLOWS } from '../config'
import type {
  TestReport,
  ReportMetadata,
  ReportSummary,
  FlowReport,
  ScenarioReport,
  ErrorReport,
  FixReport,
  TestResult,
  DetectedError,
  AppliedFix,
} from './types'

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate complete test report from results
 */
export function generateReport(
  results: TestResult[],
  options: {
    runId?: string
    startTime: Date
    endTime: Date
    testMaterialsUsed?: string[]
  }
): TestReport {
  const metadata = generateMetadata(options)
  const summary = generateSummary(results)
  const flows = generateFlowReports(results)
  const errors = aggregateErrors(results)
  const fixes = aggregateFixes(results)

  return {
    metadata,
    summary,
    flows,
    errors,
    fixes,
  }
}

/**
 * Generate report metadata
 */
function generateMetadata(options: {
  runId?: string
  startTime: Date
  endTime: Date
  testMaterialsUsed?: string[]
}): ReportMetadata {
  return {
    runId: options.runId || `e2e-${Date.now()}`,
    startTime: options.startTime.toISOString(),
    endTime: options.endTime.toISOString(),
    duration: options.endTime.getTime() - options.startTime.getTime(),
    environment: {
      baseUrl: TEST_CONFIG.baseUrl,
      nodeVersion: process.version || 'unknown',
      platform: process.platform || 'unknown',
    },
    testMaterialsUsed: options.testMaterialsUsed || [],
  }
}

/**
 * Generate summary statistics
 */
function generateSummary(results: TestResult[]): ReportSummary {
  const total = results.length
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const errors = results.filter(r => r.status === 'error').length
  const skipped = total - passed - failed - errors

  return {
    total,
    passed,
    failed,
    errors,
    skipped,
    passRate: total > 0 ? Math.round((passed / total) * 100 * 10) / 10 : 0,
  }
}

/**
 * Generate flow-level reports
 */
function generateFlowReports(results: TestResult[]): FlowReport[] {
  return TEST_FLOWS.map(flow => {
    const flowResults = results.filter(r => r.flow === flow)

    return {
      name: flow,
      scenarios: flowResults.map(r => ({
        name: r.scenario,
        description: '',
        status: r.status,
        duration: r.duration,
        steps: r.steps.map(s => ({
          id: s.stepId,
          status: s.status,
          duration: s.duration,
          error: s.error,
        })),
        logs: {
          consoleErrors: r.logs.console.filter(m => m.level === 'error').length,
          networkErrors: r.logs.network.filter(n => n.failed || (n.status && n.status >= 400)).length,
          warnings: r.logs.console.filter(m => m.level === 'warning').length,
        },
        screenshots: r.screenshots,
      })),
      summary: {
        total: flowResults.length,
        passed: flowResults.filter(r => r.status === 'pass').length,
        failed: flowResults.filter(r => r.status === 'fail' || r.status === 'error').length,
      },
    }
  }).filter(flow => flow.scenarios.length > 0)
}

/**
 * Aggregate errors across all results
 */
function aggregateErrors(results: TestResult[]): ErrorReport[] {
  const errorMap = new Map<string, {
    code: string
    message: string
    count: number
    scenarios: Set<string>
    severity: 'low' | 'medium' | 'high'
    firstTime: string
    lastTime: string
  }>()

  for (const result of results) {
    for (const error of result.errors) {
      const existing = errorMap.get(error.code)
      if (existing) {
        existing.count++
        existing.scenarios.add(result.scenario)
        existing.lastTime = new Date(error.timestamp).toISOString()
      } else {
        errorMap.set(error.code, {
          code: error.code,
          message: error.message.slice(0, 200),
          count: 1,
          scenarios: new Set([result.scenario]),
          severity: error.severity,
          firstTime: new Date(error.timestamp).toISOString(),
          lastTime: new Date(error.timestamp).toISOString(),
        })
      }
    }
  }

  return Array.from(errorMap.values()).map(e => ({
    code: e.code,
    message: e.message,
    count: e.count,
    scenarios: Array.from(e.scenarios),
    severity: e.severity,
    firstOccurrence: e.firstTime,
    lastOccurrence: e.lastTime,
  })).sort((a, b) => b.count - a.count)
}

/**
 * Aggregate fix attempts across all results
 */
function aggregateFixes(results: TestResult[]): FixReport[] {
  const fixes: FixReport[] = []

  for (const result of results) {
    if (result.fixes) {
      for (const fix of result.fixes) {
        fixes.push({
          error: fix.error.code,
          strategy: fix.strategy,
          result: fix.success ? 'success' : 'failed',
          details: fix.details,
          codeChanges: fix.codeChanges,
        })
      }
    }
  }

  return fixes
}

// ============================================================================
// Markdown Report Generation
// ============================================================================

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = []

  // Header
  lines.push('# NoteSnap E2E Test Report')
  lines.push('')
  lines.push(`**Run ID:** ${report.metadata.runId}`)
  lines.push(`**Date:** ${new Date(report.metadata.startTime).toLocaleDateString()}`)
  lines.push(`**Duration:** ${formatDuration(report.metadata.duration)}`)
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Total Scenarios | ${report.summary.total} |`)
  lines.push(`| Passed | ${report.summary.passed} |`)
  lines.push(`| Failed | ${report.summary.failed} |`)
  lines.push(`| Errors | ${report.summary.errors} |`)
  lines.push(`| Pass Rate | ${report.summary.passRate}% |`)
  lines.push('')

  // Results by Flow
  lines.push('## Results by Flow')
  lines.push('')

  for (const flow of report.flows) {
    const icon = flow.summary.failed === 0 ? '✓' : '✗'
    lines.push(`### ${icon} ${capitalizeFirst(flow.name)} Flow (${flow.summary.passed}/${flow.summary.total} passed)`)
    lines.push('')

    for (const scenario of flow.scenarios) {
      const statusIcon = scenario.status === 'pass' ? '✓' : scenario.status === 'fail' ? '✗' : '⚠'
      const statusText = scenario.status.toUpperCase()
      lines.push(`- [${statusText}] ${scenario.name} (${formatDuration(scenario.duration)})`)

      if (scenario.status !== 'pass') {
        // Show failed steps
        const failedSteps = scenario.steps.filter(s => s.status === 'fail')
        for (const step of failedSteps) {
          lines.push(`  - ✗ Step ${step.id}: ${step.error || 'Failed'}`)
        }

        // Show screenshots
        if (scenario.screenshots.length > 0) {
          lines.push(`  - Screenshots: ${scenario.screenshots.map(s => `[${s}](./screenshots/${s})`).join(', ')}`)
        }
      }
    }
    lines.push('')
  }

  // Detected Errors
  if (report.errors.length > 0) {
    lines.push('## Detected Errors')
    lines.push('')

    for (const error of report.errors) {
      lines.push(`### ${error.code}`)
      lines.push('')
      lines.push(`- **Severity:** ${error.severity}`)
      lines.push(`- **Count:** ${error.count}`)
      lines.push(`- **Scenarios:** ${error.scenarios.join(', ')}`)
      lines.push(`- **Message:** ${error.message}`)
      lines.push('')
    }
  }

  // Applied Fixes
  if (report.fixes.length > 0) {
    lines.push('## Auto-Fix Attempts')
    lines.push('')
    lines.push('| Error | Strategy | Result | Details |')
    lines.push('|-------|----------|--------|---------|')

    for (const fix of report.fixes) {
      const resultIcon = fix.result === 'success' ? '✓' : '✗'
      lines.push(`| ${fix.error} | ${fix.strategy} | ${resultIcon} ${fix.result} | ${fix.details.slice(0, 50)} |`)
    }
    lines.push('')

    // Code changes section
    const fixesWithCodeChanges = report.fixes.filter(f => f.codeChanges && f.codeChanges.length > 0)
    if (fixesWithCodeChanges.length > 0) {
      lines.push('### Suggested Code Changes')
      lines.push('')

      for (const fix of fixesWithCodeChanges) {
        lines.push(`**${fix.error}:**`)
        for (const change of fix.codeChanges!) {
          lines.push(`- File: \`${change.file}\``)
          lines.push(`  - Reason: ${change.reason}`)
          if (change.after) {
            lines.push('  ```typescript')
            lines.push(`  ${change.after}`)
            lines.push('  ```')
          }
        }
        lines.push('')
      }
    }
  }

  // Environment
  lines.push('## Environment')
  lines.push('')
  lines.push(`- Base URL: ${report.metadata.environment.baseUrl}`)
  lines.push(`- Platform: ${report.metadata.environment.platform}`)
  if (report.metadata.testMaterialsUsed.length > 0) {
    lines.push(`- Test Materials: ${report.metadata.testMaterialsUsed.join(', ')}`)
  }
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// JSON Report Generation
// ============================================================================

/**
 * Generate JSON report string
 */
export function generateJSONReport(report: TestReport): string {
  return JSON.stringify(report, null, 2)
}

// ============================================================================
// Console Report
// ============================================================================

/**
 * Generate console-friendly summary
 */
export function generateConsoleSummary(report: TestReport): string {
  const lines: string[] = []

  lines.push('')
  lines.push('═'.repeat(60))
  lines.push('  E2E TEST RESULTS')
  lines.push('═'.repeat(60))
  lines.push('')

  // Summary bar
  const passBar = '█'.repeat(Math.round(report.summary.passRate / 5))
  const failBar = '░'.repeat(20 - Math.round(report.summary.passRate / 5))
  lines.push(`  [${passBar}${failBar}] ${report.summary.passRate}%`)
  lines.push('')

  // Quick stats
  lines.push(`  ✓ Passed:  ${report.summary.passed}`)
  lines.push(`  ✗ Failed:  ${report.summary.failed}`)
  lines.push(`  ⚠ Errors:  ${report.summary.errors}`)
  lines.push(`  ⏱ Duration: ${formatDuration(report.metadata.duration)}`)
  lines.push('')

  // Failed scenarios
  const failed = report.flows.flatMap(f => f.scenarios).filter(s => s.status !== 'pass')
  if (failed.length > 0) {
    lines.push('─'.repeat(60))
    lines.push('  FAILED SCENARIOS')
    lines.push('─'.repeat(60))
    for (const scenario of failed) {
      lines.push(`  ✗ ${scenario.name}`)
    }
    lines.push('')
  }

  // Top errors
  if (report.errors.length > 0) {
    lines.push('─'.repeat(60))
    lines.push('  TOP ERRORS')
    lines.push('─'.repeat(60))
    for (const error of report.errors.slice(0, 5)) {
      lines.push(`  [${error.count}x] ${error.code}: ${error.message.slice(0, 40)}...`)
    }
    lines.push('')
  }

  lines.push('═'.repeat(60))
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get timestamp string for filenames
 */
export function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Generate report filename
 */
export function getReportFilename(format: 'json' | 'md'): string {
  return `report-${getTimestamp()}.${format}`
}

// ============================================================================
// Report Save Instructions
// ============================================================================

export const SAVE_REPORT_INSTRUCTIONS = `
## Saving Test Report

After test execution completes:

1. Generate report:
   const report = generateReport(results, {
     startTime,
     endTime,
     testMaterialsUsed
   })

2. Save JSON report:
   Write to: e2e/reports/report-{timestamp}.json
   Content: generateJSONReport(report)

3. Save Markdown report:
   Write to: e2e/reports/report-{timestamp}.md
   Content: generateMarkdownReport(report)

4. Print console summary:
   console.log(generateConsoleSummary(report))

5. Return report to user with key findings
`
