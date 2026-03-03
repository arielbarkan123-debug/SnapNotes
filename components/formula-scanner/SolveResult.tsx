'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, BarChart3, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'
import type { FormulaSolution } from '@/lib/formula-scanner/solver'
import type { DesmosExpression } from '@/components/diagrams/DesmosRenderer'

const DesmosRenderer = dynamic(() => import('@/components/diagrams/DesmosRenderer'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading graph...
      </div>
    </div>
  ),
})

interface SolveResultProps {
  solution: FormulaSolution
}

export default function SolveResult({ solution }: SolveResultProps) {
  const t = useTranslations('formulaScanner')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [showSteps, setShowSteps] = useState(true)
  const [showGraph, setShowGraph] = useState(true)
  const [showExplanation, setShowExplanation] = useState(true)

  // Map solver graph expressions to DesmosExpression format
  const desmosExpressions: DesmosExpression[] | null = solution.graph
    ? solution.graph.expressions.map((expr, i) => ({
        id: `solve-expr-${i}`,
        latex: expr.latex,
        color: expr.color,
        label: expr.label,
        showLabel: !!expr.label,
      }))
    : null

  return (
    <div className="space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* ─── Section 1: Step-by-Step Solution ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            {t('solve.stepByStep')}
          </span>
          {showSteps ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showSteps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-4">
                {solution.steps.map((step, i) => (
                  <motion.div
                    key={step.stepNumber}
                    initial={{ opacity: 0, x: isHe ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3"
                  >
                    {/* Step number badge */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                        {step.stepNumber}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* KaTeX expression */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-1.5 overflow-x-auto">
                        <BlockMath math={step.expression} />
                      </div>
                      {/* Text explanation */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {isHe ? step.explanationHe : step.explanation}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Section 2: Interactive Graph ─────────────────────────────────── */}
      {solution.graph && desmosExpressions && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGraph(!showGraph)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {t('solve.interactiveGraph')}
            </span>
            {showGraph ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {showGraph && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <DesmosRenderer
                    expressions={desmosExpressions}
                    xMin={solution.graph.xRange?.[0]}
                    xMax={solution.graph.xRange?.[1]}
                    yMin={solution.graph.yRange?.[0]}
                    yMax={solution.graph.yRange?.[1]}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                    {t('solve.graphHint')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Section 3: Plain-Language Explanation ────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            {t('solve.explanation')}
          </span>
          {showExplanation ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                {/* Highlighted explanation */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-s-4 border-amber-400 dark:border-amber-500 rounded-e-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    {isHe ? solution.explanationHe : solution.explanation}
                  </p>
                </div>

                {/* Original formula reference */}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{t('solve.originalFormula')}:</span>
                  <InlineMath math={solution.originalLatex} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
