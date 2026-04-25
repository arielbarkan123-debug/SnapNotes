'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { MathText } from '@/components/ui/MathRenderer'

const MarkdownWithMath = dynamic(() => import('@/components/prepare/MarkdownWithMath'), { ssr: false })

interface SubStep {
  title: string
  content: string
  hasExample: boolean
  quickCheck?: { question: string; answer: string } | null
}

interface DepthExpansionProps {
  subSteps: SubStep[]
  depth: number // 1 or 2
  courseId: string
  lessonIndex: number
  stepIndex: number
  onRequestExpand?: (depth: number) => void
  isLoadingNested?: boolean
  nestedSubSteps?: SubStep[] | null
}

export default function DepthExpansion({
  subSteps,
  depth,
  courseId: _courseId,
  lessonIndex: _lessonIndex,
  stepIndex: _stepIndex,
  onRequestExpand,
  isLoadingNested = false,
  nestedSubSteps,
}: DepthExpansionProps) {
  const t = useTranslations('lesson')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-4 space-y-3"
    >
      {/* Depth indicator pill */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full">
          {t('depthLevel', { level: depth })}
        </span>
      </div>

      {/* Sub-steps */}
      {subSteps.map((subStep, index) => (
        <SubStepCard
          key={index}
          subStep={subStep}
          index={index}
          depth={depth}
        />
      ))}

      {/* Nested "Go Deeper" button - only at depth 1 */}
      {depth < 2 && onRequestExpand && (
        <div className="pt-2">
          {isLoadingNested ? (
            <DepthSkeleton />
          ) : nestedSubSteps ? (
            <AnimatePresence>
              <DepthExpansion
                subSteps={nestedSubSteps}
                depth={depth + 1}
                courseId={_courseId}
                lessonIndex={_lessonIndex}
                stepIndex={_stepIndex}
              />
            </AnimatePresence>
          ) : (
            <button
              type="button"
              onClick={() => onRequestExpand(depth)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              {t('goDeeper')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

function SubStepCard({ subStep, index, depth }: { subStep: SubStep; index: number; depth: number }) {
  const t = useTranslations('lesson')

  return (
    <div
      className={`
        p-4 rounded-xl border transition-all
        ${depth === 1
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          : 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600 ms-4'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            <MathText>{subStep.title}</MathText>
          </h4>
          <MarkdownWithMath className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold dark:[&_strong]:text-white [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:bg-gray-200 dark:[&_code]:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
            {subStep.content}
          </MarkdownWithMath>

          {/* Example badge */}
          {subStep.hasExample && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              {t('exampleLabel')}
            </span>
          )}

          {/* Quick check inline */}
          {subStep.quickCheck && (
            <QuickCheckInline
              question={subStep.quickCheck.question}
              answer={subStep.quickCheck.answer}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function QuickCheckInline({ question, answer }: { question: string; answer: string }) {
  const t = useTranslations('lesson')
  const [userInput, setUserInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleCheck = () => {
    const correct = userInput.trim().toLowerCase() === answer.trim().toLowerCase()
    setIsCorrect(correct)
    setChecked(true)
  }

  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
        {t('quickCheck')}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200 mb-2"><MathText>{question}</MathText></p>

      {!checked ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && userInput.trim()) handleCheck() }}
            aria-label={question}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="..."
          />
          <button
            type="button"
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('checkQuickAnswer')}
          </button>
        </div>
      ) : (
        <div className={`text-sm font-medium ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isCorrect
            ? t('quickCheckCorrect')
            : t('quickCheckIncorrect', { answer })
          }
        </div>
      )}
    </div>
  )
}

function DepthSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-4/6 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export { DepthSkeleton }
export type { SubStep }
