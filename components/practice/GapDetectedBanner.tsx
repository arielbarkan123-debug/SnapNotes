'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { GapRoute } from '@/lib/insights/gap-router'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GapDetectedBannerProps {
  gap: GapRoute
  onReview: (topic: string) => void
  onDismiss: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GapDetectedBanner({
  gap,
  onReview,
  onDismiss,
}: GapDetectedBannerProps) {
  const t = useTranslations('insights.gap')
  const locale = useLocale()
  const isHe = locale === 'he'
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    setTimeout(onDismiss, 300)
  }

  const reason = isHe ? gap.reasonHe : gap.reason

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔗</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
                  {t('detected')}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 mb-3">
                  {reason}
                </p>

                {/* Mastery indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-amber-200/50 dark:bg-amber-800/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all"
                      style={{ width: `${gap.prerequisiteMastery}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {t('prerequisiteMastery', { percent: gap.prerequisiteMastery })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onReview(gap.prerequisiteTopic)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors min-h-[36px]"
                  >
                    {t('review', { topic: gap.prerequisiteTopic })}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-gray-600 transition-colors min-h-[36px]"
                  >
                    {t('continueAnyway')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
