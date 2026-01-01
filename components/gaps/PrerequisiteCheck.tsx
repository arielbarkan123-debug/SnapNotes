'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DetectedGap, GapSeverity } from '@/lib/concepts/types'

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

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface PrerequisiteCheckProps {
  gaps: DetectedGap[]
  courseId: string
  lessonIndex: number
  lessonTitle: string
  onContinue: () => void
  onClose: () => void
}

const severityConfig: Record<GapSeverity, {
  color: string
  bgColor: string
  borderColor: string
  icon: string
  label: string
}> = {
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: '🔴',
    label: 'Critical'
  },
  moderate: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: '🟡',
    label: 'Moderate'
  },
  minor: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: '🔵',
    label: 'Minor'
  }
}

export function PrerequisiteCheck({
  gaps,
  courseId,
  lessonIndex,
  lessonTitle,
  onContinue,
  onClose
}: PrerequisiteCheckProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  const moderateGaps = gaps.filter(g => g.severity === 'moderate')
  const minorGaps = gaps.filter(g => g.severity === 'minor')

  const hasCriticalGaps = criticalGaps.length > 0

  const handleReviewFirst = () => {
    setIsLoading(true)
    // Navigate to practice with the gap concepts
    const conceptIds = gaps.map(g => g.conceptId).join(',')
    router.push(`/practice?concepts=${conceptIds}&returnTo=/course/${courseId}/lesson/${lessonIndex}`)
  }

  const handleContinueAnyway = () => {
    onContinue()
  }

  const renderGapItem = (gap: DetectedGap) => {
    const config = severityConfig[gap.severity]

    return (
      <div
        key={gap.conceptId}
        className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${config.color}`}>
                {gap.conceptName || 'Unknown Concept'}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>

            {gap.explanation && (
              <p className="text-sm text-muted-foreground mt-1">
                {gap.explanation}
              </p>
            )}

            {gap.remediation && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                Suggestion: {gap.remediation}
              </p>
            )}

            {gap.gapType && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                {gap.gapType === 'never_learned' && (
                  <>
                    <BookOpen className="w-3 h-3" />
                    <span>Not yet studied</span>
                  </>
                )}
                {gap.gapType === 'missing_prerequisite' && (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Missing prerequisite</span>
                  </>
                )}
                {gap.gapType === 'weak_foundation' && (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Needs more practice</span>
                  </>
                )}
                {gap.gapType === 'decay' && (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Due for review</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${hasCriticalGaps ? 'text-red-500' : 'text-amber-500'}`} />
            <h2 className="text-lg font-semibold">Prerequisite Check</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground mb-4">
            Before starting <span className="font-medium text-foreground">{lessonTitle}</span>,
            we noticed some concepts you may want to review:
          </p>

          <div className="space-y-4">
            {/* Critical Gaps */}
            {criticalGaps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <span>Critical ({criticalGaps.length})</span>
                </h3>
                <div className="space-y-2">
                  {criticalGaps.map(renderGapItem)}
                </div>
              </div>
            )}

            {/* Moderate Gaps */}
            {moderateGaps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  Moderate ({moderateGaps.length})
                </h3>
                <div className="space-y-2">
                  {moderateGaps.map(renderGapItem)}
                </div>
              </div>
            )}

            {/* Minor Gaps */}
            {minorGaps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  Minor ({minorGaps.length})
                </h3>
                <div className="space-y-2">
                  {minorGaps.map(renderGapItem)}
                </div>
              </div>
            )}
          </div>

          {/* Recommendation message */}
          {hasCriticalGaps && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Recommendation:</strong> We strongly suggest reviewing these critical concepts
                before continuing. Proceeding without understanding these fundamentals may make
                this lesson more difficult.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleReviewFirst}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <BookOpen className="w-4 h-4" />
              <span>Review First</span>
              <span className="text-xs opacity-75">(Recommended)</span>
            </button>

            <button
              onClick={handleContinueAnyway}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                hasCriticalGaps
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span>Continue Anyway</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!hasCriticalGaps && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              These gaps are not critical. You can continue if you feel confident.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
