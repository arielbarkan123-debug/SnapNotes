'use client'

import type { SessionSummary as SessionSummaryType, HomeworkSession } from '@/lib/homework/types'
import Button from '@/components/ui/Button'

// ============================================================================
// Types
// ============================================================================

interface SessionSummaryProps {
  session: HomeworkSession
  summary: SessionSummaryType
  onPracticeMore?: () => void
  onDone: () => void
}

// ============================================================================
// Component
// ============================================================================

export default function SessionSummary({
  session,
  summary,
  onPracticeMore,
  onDone,
}: SessionSummaryProps) {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-8">
      {/* Celebration Header */}
      <div className="space-y-2">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Great Work!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You solved: {session.detected_topic || 'Homework Problem'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summary.timeSpent}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Time</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summary.hintsUsed}
            {summary.usedShowAnswer && (
              <span className="text-xs text-amber-500 ml-1">+A</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hints</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summary.conceptsPracticed.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Concepts</div>
        </div>
      </div>

      {/* Concepts Practiced */}
      {summary.conceptsPracticed.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {summary.conceptsPracticed.slice(0, 4).map((concept, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full"
            >
              {concept}
            </span>
          ))}
        </div>
      )}

      {/* What You Learned */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-left">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-3">
          <span>🧠</span>
          <span>What You Learned</span>
        </h3>
        <ul className="space-y-2">
          {summary.whatYouLearned.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Approach Feedback */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800/50 text-left">
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">
          Your Approach
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {summary.approachFeedback}
        </p>
      </div>

      {/* Encouragement */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
          {summary.encouragement}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {onPracticeMore && (
          <Button
            onClick={onPracticeMore}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <span className="mr-2">🔄</span>
            Practice Similar Problems
          </Button>
        )}
        <Button
          onClick={onDone}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Done
        </Button>
      </div>
    </div>
  )
}
