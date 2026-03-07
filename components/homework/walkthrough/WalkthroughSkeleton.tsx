'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

/**
 * Skeleton loading state for the walkthrough view.
 * Shows animated placeholders for diagram, step text, and navigation.
 */
export default function WalkthroughSkeleton() {
  const t = useTranslations('homework.walkthrough')
  const shimmer = {
    initial: { opacity: 0.4 },
    animate: { opacity: 1 },
    transition: { duration: 0.8, repeat: Infinity, repeatType: 'reverse' as const },
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10">
        <div className="flex items-center gap-3">
          <motion.div {...shimmer} className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-600" />
          <motion.div {...shimmer} className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-600" />
        </div>
        <motion.div {...shimmer} className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-600" />
      </div>

      {/* Progress bar skeleton */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <motion.div
          className="h-full bg-violet-300/40"
          animate={{ width: ['10%', '30%', '10%'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Step dots skeleton */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            {...shimmer}
            className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600"
          />
        ))}
      </div>

      {/* Diagram skeleton */}
      <div className="w-full p-4">
        <motion.div
          {...shimmer}
          className="w-full h-48 sm:h-64 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('generatingSolution')}</span>
          </div>
        </motion.div>
      </div>

      {/* Step explanation skeleton */}
      <div className="w-full px-4 pb-4">
        <div className="rounded-xl bg-violet-50/60 dark:bg-violet-900/15 border border-violet-200/60 dark:border-violet-800/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <motion.div {...shimmer} className="w-7 h-7 rounded-full bg-violet-200 dark:bg-violet-800" />
            <motion.div {...shimmer} className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-600" />
          </div>
          <div className="space-y-2">
            <motion.div {...shimmer} className="h-3 w-full rounded bg-gray-200 dark:bg-gray-600" />
            <motion.div {...shimmer} className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-600" />
            <motion.div {...shimmer} className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
          </div>
        </div>
      </div>

      {/* Navigation skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <motion.div {...shimmer} className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-600" />
        <motion.div {...shimmer} className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600" />
        <motion.div {...shimmer} className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>
  )
}
