'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { DeepDiveAnalysis } from '@/lib/practice/types'

interface DeepDiveCardProps {
  deepDive: DeepDiveAnalysis
  onDismiss: () => void
}

const panelConfig = [
  {
    icon: '\u{1F914}',
    titleKey: 'deepDiveWhatYouThought' as const,
    field: 'likelyReasoning' as const,
    borderColor: 'border-amber-300 dark:border-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  {
    icon: '\u26A0\uFE0F',
    titleKey: 'deepDiveTheMistake' as const,
    field: 'whyWrong' as const,
    borderColor: 'border-red-300 dark:border-red-700',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
  },
  {
    icon: '\u{1F4A1}',
    titleKey: 'deepDiveHowToThink' as const,
    field: 'correctModel' as const,
    borderColor: 'border-green-300 dark:border-green-700',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
  },
]

export default function DeepDiveCard({ deepDive, onDismiss }: DeepDiveCardProps) {
  const tp = useTranslations('practice')
  const [quickCheckAnswer, setQuickCheckAnswer] = useState('')
  const [quickCheckSubmitted, setQuickCheckSubmitted] = useState(false)
  const [quickCheckCorrect, setQuickCheckCorrect] = useState(false)

  const handleQuickCheckSubmit = () => {
    if (!quickCheckAnswer.trim()) return
    const userAns = quickCheckAnswer.trim().toLowerCase()
    const expected = deepDive.quickCheck.answer.trim().toLowerCase()
    // Check exact match first
    let isCorrect = userAns === expected
    // Try numeric comparison if both are numbers
    if (!isCorrect) {
      const userNum = parseFloat(userAns)
      const expectedNum = parseFloat(expected)
      if (!isNaN(userNum) && !isNaN(expectedNum)) {
        isCorrect = Math.abs(userNum - expectedNum) < 0.001
      }
    }
    setQuickCheckCorrect(isCorrect)
    setQuickCheckSubmitted(true)
  }

  return (
    <div role="region" aria-label={tp('deepDiveTitle')} className="mt-4 rounded-[18px] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border border-slate-200 dark:border-slate-700 p-5 overflow-hidden">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-lg">{'\u{1F50D}'}</span>
        {tp('deepDiveTitle')}
      </h3>
      <div className="space-y-3">
        <>
          {panelConfig.map((panel, index) => (
            <motion.div
              key={panel.field}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.3, duration: 0.4, ease: 'easeOut' }}
              className={`rounded-xl border ${panel.borderColor} ${panel.bgColor} p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${panel.iconBg} flex items-center justify-center text-base flex-shrink-0`}>
                  {panel.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {tp(panel.titleKey)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {deepDive[panel.field]}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4, ease: 'easeOut' }}
        className="mt-4 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-4"
      >
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">
          {tp('deepDiveQuickCheck')}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
          {deepDive.quickCheck.question}
        </p>
        {!quickCheckSubmitted ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={quickCheckAnswer}
              onChange={(e) => setQuickCheckAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCheckSubmit() }}
              placeholder={tp('deepDiveQuickCheckPlaceholder')}
              aria-label={tp('deepDiveQuickCheck')}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleQuickCheckSubmit}
              disabled={!quickCheckAnswer.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {tp('checkAnswer')}
            </button>
          </div>
        ) : (
          <div aria-live="polite" className={`p-3 rounded-lg text-sm ${
            quickCheckCorrect
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {quickCheckCorrect
              ? tp('deepDiveQuickCheckCorrect')
              : tp('deepDiveQuickCheckWrong', { answer: deepDive.quickCheck.answer })}
          </div>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
        className="mt-4"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
        >
          {tp('deepDiveGotIt')}
        </button>
      </motion.div>
    </div>
  )
}
