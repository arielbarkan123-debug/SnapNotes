'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BookOpen, FlaskConical, Calculator } from 'lucide-react'
import { useTranslations } from 'next-intl'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import type { FormulaAnalysis } from '@/lib/formula-scanner/analyzer'

interface FormulaBreakdownProps {
  analysis: FormulaAnalysis
  language?: 'en' | 'he'
}

export default function FormulaBreakdown({ analysis, language = 'en' }: FormulaBreakdownProps) {
  const t = useTranslations('formulaScanner')
  const isHe = language === 'he'
  const [showDerivation, setShowDerivation] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div className="space-y-6" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Formula Display */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {isHe ? analysis.nameHe : analysis.name}
        </p>
        <div className="text-3xl md:text-4xl py-4">
          <BlockMath math={analysis.latex} />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 rounded-full text-xs text-violet-600 dark:text-violet-400">
          <FlaskConical className="w-3 h-3" />
          {analysis.subject}
        </span>
      </div>

      {/* Symbol Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          {t('symbols')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysis.symbols.map((sym, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg text-lg">
                  <InlineMath math={sym.latex} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {isHe ? sym.nameHe : sym.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isHe ? sym.meaningHe : sym.meaning}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    {sym.units}
                  </p>
                  {sym.typicalRange && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t('range')}: {sym.typicalRange}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Derivation (expandable) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowDerivation(!showDerivation)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('derivation')}
          </span>
          {showDerivation ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <AnimatePresence>
          {showDerivation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                {isHe ? analysis.derivationHe : analysis.derivation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Related Formulas */}
      {analysis.relatedFormulas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('relatedFormulas')}
          </h3>
          <div className="space-y-2">
            {analysis.relatedFormulas.map((rf, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="text-sm">
                  <InlineMath math={rf.latex} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {isHe ? rf.nameHe : rf.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Question */}
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
        <button
          onClick={() => setShowPractice(!showPractice)}
          className="w-full flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
            <Calculator className="w-4 h-4" />
            {t('practiceQuestion')}
          </span>
          {showPractice ? (
            <ChevronUp className="w-4 h-4 text-violet-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-violet-400" />
          )}
        </button>

        <AnimatePresence>
          {showPractice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-800 dark:text-violet-200 mb-3">
                  {isHe ? analysis.practiceQuestionHe : analysis.practiceQuestion}
                </p>

                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {t('showAnswer')}
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                  >
                    {isHe ? analysis.practiceAnswerHe : analysis.practiceAnswer}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
