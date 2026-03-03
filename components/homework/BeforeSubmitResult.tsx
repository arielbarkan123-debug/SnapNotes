'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { BeforeSubmitResult, BeforeSubmitStatus } from '@/lib/homework/types'

interface BeforeSubmitResultProps {
  result: BeforeSubmitResult
  onRunFullCheck?: () => void
}

function getStatusConfig(status: BeforeSubmitStatus) {
  switch (status) {
    case 'correct':
      return { color: 'bg-green-500', ring: 'ring-green-200 dark:ring-green-800', label: 'looksCorrect', icon: '\u2713', textColor: 'text-green-700 dark:text-green-400' }
    case 'check_again':
      return { color: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800', label: 'checkAgain', icon: '!', textColor: 'text-amber-700 dark:text-amber-400' }
    case 'needs_rework':
      return { color: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-800', label: 'needsRework', icon: '\u2717', textColor: 'text-red-700 dark:text-red-400' }
    case 'unclear':
      return { color: 'bg-gray-400', ring: 'ring-gray-200 dark:ring-gray-700', label: 'unclear', icon: '?', textColor: 'text-gray-500 dark:text-gray-400' }
  }
}

function HintRevealer({ hints }: { hints: [string, string, string] }) {
  const t = useTranslations('homework.results')
  const [revealedLevel, setRevealedLevel] = useState(0)

  const revealNext = useCallback(() => {
    setRevealedLevel((prev) => Math.min(prev + 1, 3))
  }, [])

  return (
    <div className="mt-3 space-y-2">
      <AnimatePresence>
        {Array.from({ length: revealedLevel }, (_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">
                {t('hintLevel', { level: i + 1 })}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{hints[i]}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {revealedLevel < 3 && (
        <button
          onClick={revealNext}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
        >
          {t('getHintBtn')}
        </button>
      )}
    </div>
  )
}

export default function BeforeSubmitResultView({ result, onRunFullCheck }: BeforeSubmitResultProps) {
  const t = useTranslations('homework.results')

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[22px] p-4 text-center">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {t('beforeSubmitBanner')}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg mx-auto" aria-label={`${result.summary.correct} ${t('looksCorrect')}`}>
              {result.summary.correct}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('looksCorrect')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg mx-auto" aria-label={`${result.summary.checkAgain} ${t('checkAgain')}`}>
              {result.summary.checkAgain}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('checkAgain')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg mx-auto" aria-label={`${result.summary.needsRework} ${t('needsRework')}`}>
              {result.summary.needsRework}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('needsRework')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-lg mx-auto" aria-label={`${result.summary.unclear} ${t('unclear')}`}>
              {result.summary.unclear}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('unclear')}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {result.items.map((item, idx) => {
          const config = getStatusConfig(item.status)
          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-[22px] p-4 border border-gray-200 dark:border-gray-700 shadow-card"
            >
              <div className="flex items-start gap-3">
                {/* Traffic light circle */}
                <div
                  className={`w-8 h-8 rounded-full ${config.color} ring-4 ${config.ring} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5`}
                  aria-label={t(config.label)}
                  role="img"
                >
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('problemNumber', { number: item.problemIndex + 1 })}
                    </p>
                    <span className={`text-xs font-medium ${config.textColor}`}>
                      {t(config.label)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.problemText}
                  </p>

                  {/* Hint revealer (for non-correct items) */}
                  {item.status !== 'correct' && item.hints[0] && (
                    <HintRevealer hints={item.hints} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Run Full Check CTA */}
      {onRunFullCheck && (
        <button
          onClick={onRunFullCheck}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-[22px] transition-colors shadow-card"
        >
          {t('runFullCheck')}
        </button>
      )}
    </div>
  )
}
