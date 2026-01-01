'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useKnowledgeGaps } from '@/hooks'
import type { GapSeverity } from '@/lib/concepts/types'

// Inline SVG Icons
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const BookOpen = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface GapAlertProps {
  className?: string
}

const severityStyles: Record<GapSeverity, {
  icon: string
  text: string
  bg: string
  border: string
}> = {
  critical: {
    icon: '🔴',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  moderate: {
    icon: '🟡',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  minor: {
    icon: '🔵',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
}

export function GapAlert({ className = '' }: GapAlertProps) {
  const { gaps, totalGaps, criticalGaps, resolvedRecently, isLoading, refetch } = useKnowledgeGaps()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Don't show if loading, dismissed, or no gaps
  if (isLoading || isDismissed || totalGaps === 0) {
    // Show success message if recently resolved gaps
    if (!isLoading && resolvedRecently > 0 && totalGaps === 0) {
      return (
        <div className={`rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 ${className}`}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                All caught up! You resolved {resolvedRecently} knowledge {resolvedRecently === 1 ? 'gap' : 'gaps'} recently.
              </p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Take top 3 gaps to show
  const topGaps = gaps.slice(0, 3)
  const remainingCount = totalGaps - 3

  return (
    <div className={`rounded-xl border bg-card shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${criticalGaps > 0 ? 'text-red-500' : 'text-amber-500'}`} />
          <h3 className="font-semibold text-foreground">Knowledge Gaps</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            criticalGaps > 0
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}>
            {totalGaps} {totalGaps === 1 ? 'gap' : 'gaps'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Gap List */}
      <div className="p-4 space-y-3">
        {criticalGaps > 0 && (
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {criticalGaps} critical {criticalGaps === 1 ? 'gap' : 'gaps'} may be blocking your progress
          </p>
        )}

        {topGaps.map((gap) => {
          const styles = severityStyles[gap.severity as GapSeverity] || severityStyles.minor
          return (
            <div
              key={gap.id}
              className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">{styles.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${styles.text}`}>
                      {gap.concept?.name || 'Unknown Concept'}
                    </span>
                  </div>
                  {gap.ai_explanation && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {gap.ai_explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            +{remainingCount} more {remainingCount === 1 ? 'gap' : 'gaps'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        <Link
          href={`/practice?gaps=true`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>Fix Gaps</span>
        </Link>
        <Link
          href="/gaps"
          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
