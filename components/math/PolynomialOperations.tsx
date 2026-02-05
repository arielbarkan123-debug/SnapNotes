'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS, getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// ============================================================================
// Types
// ============================================================================

export interface PolynomialTerm {
  coefficient: number
  exponent: number
  variable?: string
  color?: string
}

export interface PolynomialStep {
  step: number
  type: 'setup' | 'align' | 'combine' | 'distribute' | 'multiply_terms' | 'collect' | 'simplify' | 'complete'
  description: string
  descriptionHe?: string
  /** Terms being operated on in this step */
  terms1?: PolynomialTerm[]
  terms2?: PolynomialTerm[]
  /** Result terms after this step */
  resultTerms?: PolynomialTerm[]
  /** Calculation to highlight */
  calculation?: string
  /** Highlighted exponent group */
  highlightExponent?: number
  highlighted?: boolean
}

export interface PolynomialOperationsData {
  /** First polynomial (e.g., "3x² + 2x - 5") */
  polynomial1: string
  /** Second polynomial (e.g., "x² - 4x + 1") */
  polynomial2: string
  /** Operation type */
  operation: 'add' | 'subtract' | 'multiply'
  /** Result polynomial */
  result: string
  /** Parsed terms of first polynomial */
  terms1: PolynomialTerm[]
  /** Parsed terms of second polynomial */
  terms2: PolynomialTerm[]
  /** Result terms */
  resultTerms: PolynomialTerm[]
  /** Variable used (default 'x') */
  variable?: string
  /** All steps */
  steps: PolynomialStep[]
  /** Title */
  title?: string
}

interface PolynomialOperationsProps {
  data: PolynomialOperationsData
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
  showStepCounter?: boolean
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

// ============================================================================
// Helpers
// ============================================================================

function formatTerm(term: PolynomialTerm, isFirst: boolean = false, variable: string = 'x'): string {
  const { coefficient, exponent } = term
  
  if (coefficient === 0) return ''
  
  let coefStr = ''
  if (isFirst) {
    if (exponent === 0 || Math.abs(coefficient) !== 1) {
      coefStr = coefficient.toString()
    } else if (coefficient === -1) {
      coefStr = '-'
    }
  } else {
    if (coefficient > 0) {
      coefStr = '+ '
      if (exponent === 0 || Math.abs(coefficient) !== 1) {
        coefStr += coefficient
      }
    } else {
      coefStr = '- '
      if (exponent === 0 || Math.abs(coefficient) !== 1) {
        coefStr += Math.abs(coefficient)
      }
    }
  }
  
  if (exponent === 0) return coefStr || coefficient.toString()
  if (exponent === 1) return coefStr + variable
  return coefStr + variable + '²'.repeat(0) + (exponent === 2 ? '²' : `^${exponent}`)
}

// formatPolynomial helper - useful for future extensions
function _formatPolynomial(terms: PolynomialTerm[], variable: string = 'x'): string {
  if (terms.length === 0) return '0'
  const sorted = [...terms].sort((a, b) => b.exponent - a.exponent)
  return sorted.map((t, i) => formatTerm(t, i === 0, variable)).filter(Boolean).join(' ')
}

// Color palette for different exponents
const EXPONENT_COLORS = {
  0: { bg: 'rgba(251, 146, 60, 0.15)', text: '#ea580c', border: '#fb923c' },  // orange - constant
  1: { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', border: '#3b82f6' },  // blue - x
  2: { bg: 'rgba(147, 51, 234, 0.15)', text: '#7c3aed', border: '#9333ea' },  // purple - x²
  3: { bg: 'rgba(236, 72, 153, 0.15)', text: '#db2777', border: '#ec4899' },  // pink - x³
  4: { bg: 'rgba(20, 184, 166, 0.15)', text: '#0d9488', border: '#14b8a6' },  // teal - x⁴
}

function getExponentColor(exp: number) {
  return EXPONENT_COLORS[exp as keyof typeof EXPONENT_COLORS] || EXPONENT_COLORS[4]
}

// ============================================================================
// Component
// ============================================================================

export function PolynomialOperations({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  animationDuration = 400,
  width = 480,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: PolynomialOperationsProps) {
  const { polynomial1: _polynomial1, polynomial2: _polynomial2, operation, result, terms1, terms2, resultTerms, variable = 'x', steps, title } = data
  const reducedMotion = prefersReducedMotion()
  void animationDuration // reserved for future animation customization

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])
  void adaptiveLineWeight // available for future line weight customization

  const actualTotalSteps = totalStepsProp ?? steps.length
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100
  const isComplete = currentStep >= steps.length - 1

  const _visibleSteps = useMemo(() => steps.filter((s) => s.step <= currentStep), [steps, currentStep])
  const currentStepInfo = steps[currentStep] || null

  // Get operation symbol
  const getOperationSymbol = (): string => {
    switch (operation) {
      case 'add': return '+'
      case 'subtract': return '−'
      case 'multiply': return '×'
    }
  }

  // Get operation name
  const getOperationName = (): { en: string; he: string } => {
    switch (operation) {
      case 'add': return { en: 'Addition', he: 'חיבור' }
      case 'subtract': return { en: 'Subtraction', he: 'חיסור' }
      case 'multiply': return { en: 'Multiplication', he: 'כפל' }
    }
  }

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
    },
  }

  const termVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
  }

  return (
    <div className={`polynomial-operations ${className}`} style={{ width }}>
      {/* Header */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
      >
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2">
            {title}
          </h3>
        )}
        <div className="text-center text-sm font-medium mb-3">
          <span 
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: operation === 'add' ? 'rgba(34, 197, 94, 0.15)' : operation === 'subtract' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(147, 51, 234, 0.15)',
              color: operation === 'add' ? '#16a34a' : operation === 'subtract' ? '#dc2626' : '#7c3aed',
            }}
          >
            {language === 'he' ? getOperationName().he : getOperationName().en}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.5 }}
            style={{
              background: isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : `linear-gradient(90deg, ${subjectColors.dark}, ${subjectColors.primary})`,
            }}
          />
        </div>
      </motion.div>

      {/* Problem Display */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="space-y-3">
          {/* First polynomial */}
          <motion.div
            className="flex items-center justify-center gap-2 text-lg font-mono"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="text-gray-400 w-8 text-right">(</span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {terms1.map((term, idx) => {
                const colors = getExponentColor(term.exponent)
                return (
                  <motion.span
                    key={`t1-${idx}`}
                    variants={termVariants}
                    className="px-2 py-1 rounded-md font-semibold"
                    style={{
                      backgroundColor: currentStepInfo?.highlightExponent === term.exponent ? colors.bg : 'transparent',
                      color: colors.text,
                      border: currentStepInfo?.highlightExponent === term.exponent ? `2px solid ${colors.border}` : '2px solid transparent',
                    }}
                  >
                    {formatTerm(term, idx === 0, variable)}
                  </motion.span>
                )
              })}
            </div>
            <span className="text-gray-400">)</span>
          </motion.div>

          {/* Operation symbol */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
          >
            <span 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{
                backgroundColor: operation === 'add' ? '#22c55e' : operation === 'subtract' ? '#ef4444' : '#9333ea',
              }}
            >
              {getOperationSymbol()}
            </span>
          </motion.div>

          {/* Second polynomial */}
          <motion.div
            className="flex items-center justify-center gap-2 text-lg font-mono"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="text-gray-400 w-8 text-right">(</span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {terms2.map((term, idx) => {
                const colors = getExponentColor(term.exponent)
                return (
                  <motion.span
                    key={`t2-${idx}`}
                    variants={termVariants}
                    className="px-2 py-1 rounded-md font-semibold"
                    style={{
                      backgroundColor: currentStepInfo?.highlightExponent === term.exponent ? colors.bg : 'transparent',
                      color: colors.text,
                      border: currentStepInfo?.highlightExponent === term.exponent ? `2px solid ${colors.border}` : '2px solid transparent',
                    }}
                  >
                    {formatTerm(term, idx === 0, variable)}
                  </motion.span>
                )
              })}
            </div>
            <span className="text-gray-400">)</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Steps Card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Aligned terms visualization (for add/subtract) */}
        {(operation === 'add' || operation === 'subtract') && currentStep >= 1 && (
          <motion.div
            className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
              {language === 'he' ? 'יישור לפי מעריכים:' : 'Aligned by degree:'}
            </div>
            
            {/* Column headers */}
            <div className="flex justify-center gap-4 mb-2">
              {[...new Set([...terms1, ...terms2].map(t => t.exponent))].sort((a, b) => b - a).map(exp => {
                const colors = getExponentColor(exp)
                return (
                  <div
                    key={`header-${exp}`}
                    className="w-20 text-center text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {exp === 0 ? (language === 'he' ? 'קבוע' : 'const') : `${variable}${exp > 1 ? (exp === 2 ? '²' : `^${exp}`) : ''}`}
                  </div>
                )
              })}
            </div>

            {/* First row */}
            <div className="flex justify-center gap-4 mb-1">
              {[...new Set([...terms1, ...terms2].map(t => t.exponent))].sort((a, b) => b - a).map(exp => {
                const term = terms1.find(t => t.exponent === exp)
                const colors = getExponentColor(exp)
                const isHighlighted = currentStepInfo?.highlightExponent === exp
                return (
                  <motion.div
                    key={`row1-${exp}`}
                    className="w-20 text-center font-mono font-semibold py-1 rounded"
                    style={{
                      backgroundColor: isHighlighted ? colors.bg : 'transparent',
                      color: term ? colors.text : '#9ca3af',
                      border: isHighlighted ? `2px solid ${colors.border}` : '2px solid transparent',
                    }}
                    animate={isHighlighted ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {term ? (term.coefficient >= 0 ? term.coefficient : term.coefficient) : '0'}
                  </motion.div>
                )
              })}
            </div>

            {/* Operation row */}
            <div className="flex justify-center gap-4 mb-1">
              <div 
                className="w-8 text-center font-bold text-lg"
                style={{ color: operation === 'add' ? '#22c55e' : '#ef4444' }}
              >
                {getOperationSymbol()}
              </div>
            </div>

            {/* Second row */}
            <div className="flex justify-center gap-4 mb-2">
              {[...new Set([...terms1, ...terms2].map(t => t.exponent))].sort((a, b) => b - a).map(exp => {
                const term = terms2.find(t => t.exponent === exp)
                const colors = getExponentColor(exp)
                const isHighlighted = currentStepInfo?.highlightExponent === exp
                return (
                  <motion.div
                    key={`row2-${exp}`}
                    className="w-20 text-center font-mono font-semibold py-1 rounded"
                    style={{
                      backgroundColor: isHighlighted ? colors.bg : 'transparent',
                      color: term ? colors.text : '#9ca3af',
                      border: isHighlighted ? `2px solid ${colors.border}` : '2px solid transparent',
                    }}
                    animate={isHighlighted ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {term ? term.coefficient : '0'}
                  </motion.div>
                )
              })}
            </div>

            {/* Result row */}
            {currentStep >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-2">
                  <div className="flex justify-center gap-4">
                    {[...new Set([...terms1, ...terms2].map(t => t.exponent))].sort((a, b) => b - a).map(exp => {
                      const resTerm = resultTerms.find(t => t.exponent === exp)
                      const colors = getExponentColor(exp)
                      const isHighlighted = currentStepInfo?.highlightExponent === exp
                      return (
                        <motion.div
                          key={`result-${exp}`}
                          className="w-20 text-center font-mono font-bold py-1 rounded"
                          style={{
                            backgroundColor: isHighlighted ? colors.bg : 'rgba(34, 197, 94, 0.1)',
                            color: resTerm && resTerm.coefficient !== 0 ? colors.text : '#9ca3af',
                            border: isHighlighted ? `2px solid ${colors.border}` : '2px solid transparent',
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: reducedMotion ? 0 : 0.1 }}
                        >
                          {resTerm ? resTerm.coefficient : '0'}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* FOIL/Distribution for multiplication */}
        {operation === 'multiply' && currentStep >= 1 && currentStep < steps.length - 1 && (
          <motion.div
            className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 text-center mb-2 font-medium">
              {language === 'he' ? 'הפצה:' : 'Distribution:'}
            </div>
            <div className="text-sm font-mono text-center text-gray-700 dark:text-gray-300">
              {currentStepInfo?.calculation || 'Multiply each term...'}
            </div>
          </motion.div>
        )}

        {/* Current Step Explanation */}
        {currentStepInfo && (
          <motion.div
            key={currentStep}
            className="p-4 rounded-xl border-l-4"
            style={{
              backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.08)' : `${subjectColors.light}33`,
              borderLeftColor: isComplete ? COLORS.success[500] : subjectColors.primary,
            }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {language === 'he'
                ? currentStepInfo.descriptionHe || currentStepInfo.description
                : currentStepInfo.description}
            </p>
            {currentStepInfo.calculation && !['multiply'].includes(operation) && (
              <div className="mt-2 font-mono text-sm bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg inline-block">
                {currentStepInfo.calculation}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Final Result */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mt-4 p-5 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <motion.div
              className="text-2xl mb-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
              {language === 'he' ? 'תוצאה:' : 'Result:'}
            </p>
            <motion.div
              className="text-2xl font-bold font-mono text-green-600 dark:text-green-400"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {result}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Counter */}
      {showStepCounter && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {language === 'he'
              ? `שלב ${currentStep + 1} מתוך ${actualTotalSteps}`
              : `Step ${currentStep + 1} of ${actualTotalSteps}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default PolynomialOperations
