'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { RubricResult, RubricCriterion } from '@/lib/homework/types'

interface RubricTableProps {
  result: RubricResult
}

function getCriterionColor(pct: number) {
  if (pct >= 80) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', bar: 'bg-green-500' }
  if (pct >= 60) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' }
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' }
}

function CriterionRow({ criterion, isExpanded, onToggle }: { criterion: RubricCriterion; isExpanded: boolean; onToggle: () => void }) {
  const t = useTranslations('homework.results')
  const colors = getCriterionColor(criterion.percentage)

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${colors.bg}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-start"
        aria-expanded={isExpanded}
        aria-label={`${criterion.criterion}: ${criterion.earnedPoints}/${criterion.maxPoints}`}
      >
        {/* Score box */}
        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
          <span className={`text-lg font-bold ${colors.text}`}>
            {criterion.earnedPoints}
          </span>
          <span className="text-[10px] text-gray-400">/{criterion.maxPoints}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {criterion.criterion}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${criterion.percentage}%` }} />
            </div>
            <span className={`text-xs font-medium ${colors.text}`}>{criterion.percentage}%</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 dark:border-gray-700/50 pt-3">
              {/* Reasoning */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('rubricReasoning')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{criterion.reasoning}</p>
              </div>
              {/* Suggestions */}
              {criterion.suggestions && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('rubricSuggestions')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{criterion.suggestions}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RubricTable({ result }: RubricTableProps) {
  const t = useTranslations('homework.results')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const scoreColor = result.percentage >= 80
    ? 'text-green-600 dark:text-green-400'
    : result.percentage >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700 shadow-card text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('rubricResults')}</h2>
        <div className={`text-4xl font-bold ${scoreColor}`}>
          {result.totalEarned}/{result.totalPossible}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {result.estimatedGrade} ({result.percentage}%)
        </p>
      </div>

      {/* Criteria List */}
      {result.rubricBreakdown.length > 0 ? (
        <div className="space-y-3">
          {result.rubricBreakdown.map((criterion, idx) => (
            <CriterionRow
              key={idx}
              criterion={criterion}
              isExpanded={expandedIndex === idx}
              onToggle={() => setExpandedIndex(prev => prev === idx ? null : idx)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-[22px] p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noRubricCriteria')}</p>
        </div>
      )}

      {/* Tagged Feedback */}
      {result.taggedFeedback.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('rubricSuggestions')}</h3>
          <div className="space-y-2">
            {result.taggedFeedback.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 flex-shrink-0 mt-0.5">
                  {item.rubricCriterion}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
