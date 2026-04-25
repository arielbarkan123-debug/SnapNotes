'use client'

import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { BatchWorksheetItem } from '@/lib/homework/types'
import { MathText } from '@/components/ui/MathRenderer'

const MarkdownWithMath = dynamic(() => import('@/components/prepare/MarkdownWithMath'), { ssr: false })

interface WorksheetDetailProps {
  item: BatchWorksheetItem
  isVisible: boolean
  onPractice?: (item: BatchWorksheetItem) => void
  isPracticed?: boolean
}

export default function WorksheetDetail({ item, isVisible, onPractice, isPracticed }: WorksheetDetailProps) {
  const t = useTranslations('homework.results')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            {/* Problem text */}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('problemNumber', { number: item.problemNumber })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <MathText>{item.problemText}</MathText>
              </p>
            </div>

            {/* Student answer vs correct answer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('studentWrote')}
                </p>
                <p className={`text-sm ${item.isCorrect === false ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                  {item.studentAnswer ? <MathText>{item.studentAnswer}</MathText> : '\u2014'}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                  {t('correctAnswerIs')}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <MathText>{item.correctAnswer}</MathText>
                </p>
              </div>
            </div>

            {/* Explanation */}
            {item.explanation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {t('errorExplanation')}
                </p>
                <MarkdownWithMath className="text-sm text-blue-700 dark:text-blue-300 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold dark:[&_strong]:text-blue-200 [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:bg-blue-100 dark:[&_code]:bg-blue-900/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                  {item.explanation}
                </MarkdownWithMath>
              </div>
            )}

            {/* Practice This button (only for incorrect) */}
            {item.isCorrect === false && onPractice && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPractice(item)
                }}
                disabled={isPracticed}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
                  transition-colors
                  ${isPracticed
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                  }
                `}
              >
                {isPracticed ? (
                  <>
                    <span>{'\u2713'}</span>
                    {t('practiced')}
                  </>
                ) : (
                  t('practiceThis')
                )}
              </button>
            )}

            {/* Topic + error type badges */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {item.topic}
              </span>
              {item.errorType && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  {item.errorType}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
