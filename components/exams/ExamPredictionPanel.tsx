'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExamPrediction, PredictedTopic } from '@/lib/exam-prediction/predictor'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExamPredictionPanelProps {
  examTemplateIds: string[]
  onCreateStudyPlan?: (topics: PredictedTopic[]) => void
}

// ─── Difficulty Config ───────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  hard: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
}

const TREND_ICONS = {
  increasing: '📈',
  stable: '➡️',
  decreasing: '📉',
}

const PRIORITY_CONFIG = {
  critical: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  important: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  recommended: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExamPredictionPanel({
  examTemplateIds,
  onCreateStudyPlan,
}: ExamPredictionPanelProps) {
  const t = useTranslations('examPrediction')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [prediction, setPrediction] = useState<ExamPrediction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPriorities, setShowPriorities] = useState(false)

  const canPredict = examTemplateIds.length >= 3

  const handleGenerate = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/exam-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examTemplateIds }),
      })

      const json = await res.json()

      if (json.success) {
        setPrediction(json.prediction)
      } else {
        setError(json.message || t('error'))
      }
    } catch {
      setError(t('error'))
    } finally {
      setIsLoading(false)
    }
  }, [examTemplateIds, t])

  // Not enough papers
  if (!canPredict) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔮</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('title')}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('needMorePapers', { count: examTemplateIds.length })}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔮</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('title')}</h3>
        </div>
        {!prediction && (
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isLoading ? t('generating') : t('generate')}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('analyzing')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-5">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:underline"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {prediction && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-5 space-y-4"
          >
            {/* Confidence badge */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('basedOn', { count: prediction.basedOn })}
              </p>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                prediction.confidence >= 70
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : prediction.confidence >= 50
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {t('confidence', { percent: prediction.confidence })}
              </span>
            </div>

            {/* Predicted Topics */}
            <div className="space-y-2">
              {prediction.predictedTopics.map((topic, idx) => {
                const name = isHe ? topic.topicHe : topic.topic
                const diffConfig = DIFFICULTY_CONFIG[topic.difficulty]

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                  >
                    {/* Likelihood bar */}
                    <div className="w-12 text-center flex-shrink-0">
                      <span className={`text-sm font-bold ${
                        topic.likelihood >= 70 ? 'text-green-600 dark:text-green-400'
                        : topic.likelihood >= 50 ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {topic.likelihood}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {name}
                        </span>
                        <span className="text-xs">{TREND_ICONS[topic.trend]}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            topic.likelihood >= 70 ? 'bg-green-500'
                            : topic.likelihood >= 50 ? 'bg-amber-500'
                            : 'bg-gray-400'
                          }`}
                          style={{ width: `${topic.likelihood}%` }}
                        />
                      </div>
                    </div>

                    {/* Difficulty badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${diffConfig.bg} ${diffConfig.color}`}>
                      {t(`difficulty.${topic.difficulty}`)}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Study Priorities Toggle */}
            {prediction.studyPriorities.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPriorities(!showPriorities)}
                  className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:underline"
                >
                  {showPriorities ? '▼' : '▶'} {t('studyPlan')}
                </button>

                <AnimatePresence>
                  {showPriorities && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {prediction.studyPriorities.map((sp, idx) => {
                        const name = isHe ? sp.topicHe : sp.topic
                        const reason = isHe ? sp.reasonHe : sp.reason
                        const config = PRIORITY_CONFIG[sp.priority]

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border ${config.bg} ${config.border}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${config.color}`}>{name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {sp.studyMinutes} {t('minutes')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{reason}</p>
                          </div>
                        )
                      })}

                      {onCreateStudyPlan && (
                        <button
                          onClick={() => onCreateStudyPlan(prediction.predictedTopics)}
                          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors mt-2"
                        >
                          {t('createStudyPlan')}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
