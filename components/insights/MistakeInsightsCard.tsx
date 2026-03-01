'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { MistakeInsight } from '@/lib/insights/mistake-analyzer'
import RemediationModal from './RemediationModal'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MistakeInsightsData {
  success: boolean
  patterns: MistakeInsight[]
  insufficientData: boolean
  analyzedCount: number
}

// ─── Severity Config ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  high: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/50',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    gradient: 'from-red-500 to-rose-500',
    icon: '🔴',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/50',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
    icon: '🟡',
  },
  low: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800/50',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    gradient: 'from-green-500 to-emerald-500',
    icon: '🟢',
  },
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MistakeInsightsCard() {
  const t = useTranslations('insights')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [data, setData] = useState<MistakeInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<MistakeInsight | null>(null)

  // Fetch data on mount
  const fetchData = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true)
      else setIsLoading(true)

      const url = force ? '/api/insights/mistakes' : '/api/insights/mistakes'
      const method = force ? 'POST' : 'GET'
      const res = await fetch(url, { method })
      const json = await res.json()

      if (json.success) {
        setData(json)
        setError(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return null // Silent fail - don't show broken widget on dashboard
  }

  // No data or insufficient
  if (!data || data.insufficientData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🔍</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('patterns')}</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto">
            {t('insufficientData')}
          </p>
          {data && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {t('attemptsCompleted', { count: data.analyzedCount })}
            </p>
          )}
        </div>
      </div>
    )
  }

  // No patterns found (but enough data)
  if (data.patterns.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">✨</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('patterns')}</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noPatterns')}</p>
        </div>
      </div>
    )
  }

  // Show top 3 patterns
  const topPatterns = data.patterns.slice(0, 3)

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h3 className="font-bold text-gray-900 dark:text-white">{t('patterns')}</h3>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50"
          >
            {isRefreshing ? t('refreshing') : t('refreshAnalysis')}
          </button>
        </div>

        {/* Pattern Cards */}
        <div className="p-4 space-y-3">
          <AnimatePresence mode="wait">
            {topPatterns.map((pattern, idx) => {
              const config = SEVERITY_CONFIG[pattern.severity]
              const name = isHe ? pattern.patternNameHe : pattern.patternName
              const desc = isHe ? pattern.descriptionHe : pattern.description

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${config.bg} ${config.border} border rounded-xl p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{config.icon}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                          {t(`severity.${pattern.severity}`)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('frequency', { count: pattern.frequency })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {desc}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPattern(pattern)}
                      className="flex-shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors min-h-[32px]"
                    >
                      {t('fixThis')}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Remediation Modal */}
      {selectedPattern && (
        <RemediationModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
          onResolved={() => {
            setSelectedPattern(null)
            fetchData(true)
          }}
        />
      )}
    </>
  )
}
