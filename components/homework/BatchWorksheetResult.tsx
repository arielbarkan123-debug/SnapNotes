'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { BatchWorksheetResult as BatchResult, BatchWorksheetItem } from '@/lib/homework/types'
import WorksheetTile from './WorksheetTile'
import WorksheetDetail from './WorksheetDetail'

interface BatchWorksheetResultProps {
  result: BatchResult
  onPractice?: (item: BatchWorksheetItem, problemIndex: number) => void
  practicedIndices?: number[]
}

export default function BatchWorksheetResultView({
  result,
  onPractice,
  practicedIndices = [],
}: BatchWorksheetResultProps) {
  const t = useTranslations('homework.results')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }, [])

  const scoreColor = result.score >= 80
    ? 'text-green-600 dark:text-green-400'
    : result.score >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-6">
      {/* Summary Bar - sticky */}
      <div className="sticky top-14 md:top-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[22px] shadow-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('worksheetResults')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('worksheetSummary', {
                correct: result.correct,
                incorrect: result.incorrect,
                unclear: result.unclear,
                total: result.totalProblems,
              })}
            </p>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {result.score}%
          </div>
        </div>

        {/* Horizontal stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-gray-100 dark:bg-gray-700">
          {result.correct > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(result.correct / result.totalProblems) * 100}%` }}
            />
          )}
          {result.incorrect > 0 && (
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${(result.incorrect / result.totalProblems) * 100}%` }}
            />
          )}
          {result.unclear > 0 && (
            <div
              className="bg-gray-400 transition-all"
              style={{ width: `${(result.unclear / result.totalProblems) * 100}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            {t('correct')} ({result.correct})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {t('incorrect')} ({result.incorrect})
          </span>
          {result.unclear > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              {t('unclear')} ({result.unclear})
            </span>
          )}
        </div>
      </div>

      {/* Problem Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
        {result.items.map((item, idx) => (
          <WorksheetTile
            key={idx}
            item={item}
            isExpanded={expandedIndex === idx}
            onClick={() => toggleExpanded(idx)}
          />
        ))}
      </div>

      {/* Expanded Detail */}
      {expandedIndex !== null && result.items[expandedIndex] && (
        <WorksheetDetail
          item={result.items[expandedIndex]}
          isVisible={true}
          onPractice={onPractice ? (item) => onPractice(item, expandedIndex) : undefined}
          isPracticed={practicedIndices.includes(expandedIndex)}
        />
      )}

      {/* Topic Breakdown */}
      {Object.keys(result.topicBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t('topicBreakdown')}
          </h3>
          <div className="space-y-2">
            {Object.entries(result.topicBreakdown).map(([topic, data]) => {
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">
                    {topic}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 text-end">
                    {data.correct}/{data.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
