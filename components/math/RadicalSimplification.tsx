'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { prefersReducedMotion } from '@/lib/diagram-animations'
import { MathText } from '@/components/ui/MathRenderer'
import { normalizeToLatex } from '@/lib/normalize-latex'

// ============================================================================
// Types
// ============================================================================

export interface PrimeFactor {
  base: number
  exponent: number
  color?: string
}

export interface RadicalStep {
  step: number
  type: 'identify' | 'factor' | 'group' | 'extract' | 'simplify' | 'rationalize' | 'complete'
  description: string
  descriptionHe?: string
  /** Expression at this step */
  expression: string
  /** Prime factorization shown */
  primeFactors?: PrimeFactor[]
  /** Groups that can be extracted */
  groups?: Array<{ factor: number; count: number; canExtract: boolean }>
  /** Calculation to highlight */
  calculation?: string
  highlighted?: boolean
}

export interface RadicalSimplificationData {
  /** Original expression (e.g., "√72" or "√(50)") */
  originalExpression: string
  /** The radicand (number under the radical) */
  radicand: number
  /** Index of the radical (2 for square root, 3 for cube root, etc.) */
  index: number
  /** Prime factorization of radicand */
  primeFactors: PrimeFactor[]
  /** What comes out of the radical */
  extracted: number
  /** What stays under the radical */
  remaining: number
  /** Final simplified form (e.g., "6√2") */
  simplifiedForm: string
  /** All steps */
  steps: RadicalStep[]
  /** Method used */
  method: 'prime_factorization' | 'perfect_squares' | 'rationalize_denominator'
  /** Title */
  title?: string
}

interface RadicalSimplificationProps {
  data: RadicalSimplificationData
  /** Starting step (0-indexed) */
  initialStep?: number
  /** @deprecated Use initialStep instead. Ignored - step state is managed internally. */
  currentStep?: number
  /** @deprecated Ignored - total steps derived from data.steps */
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
// Helper Components
// ============================================================================

function RadicalSymbol({ 
  children, 
  index = 2,
  size = 'lg',
  color = '#4f46e5',
}: { 
  children: React.ReactNode
  index?: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
}) {
  const sizes = {
    sm: { fontSize: '1rem', height: '1.5rem' },
    md: { fontSize: '1.25rem', height: '2rem' },
    lg: { fontSize: '1.5rem', height: '2.5rem' },
  }
  
  return (
    <span className="inline-flex items-baseline font-mono" style={{ color }}>
      {index > 2 && (
        <sup className="text-xs mr-0.5" style={{ fontSize: '0.6em' }}>{index}</sup>
      )}
      <span style={{ fontSize: sizes[size].fontSize }}>√</span>
      <span 
        className="border-t-2 px-1"
        style={{ 
          borderColor: color,
          minHeight: sizes[size].height,
        }}
      >
        {children}
      </span>
    </span>
  )
}

// Prime colors for visual distinction
const PRIME_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  2: { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', border: '#3b82f6' },
  3: { bg: 'rgba(34, 197, 94, 0.15)', text: '#16a34a', border: '#22c55e' },
  5: { bg: 'rgba(249, 115, 22, 0.15)', text: '#ea580c', border: '#f97316' },
  7: { bg: 'rgba(147, 51, 234, 0.15)', text: '#7c3aed', border: '#9333ea' },
  11: { bg: 'rgba(236, 72, 153, 0.15)', text: '#db2777', border: '#ec4899' },
  13: { bg: 'rgba(20, 184, 166, 0.15)', text: '#0d9488', border: '#14b8a6' },
}

function getPrimeColor(prime: number) {
  return PRIME_COLORS[prime] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#4b5563', border: '#6b7280' }
}

// ============================================================================
// Component
// ============================================================================

export function RadicalSimplification({
  data,
  initialStep,
  animationDuration = 400,
  width = 420,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: RadicalSimplificationProps) {
  const { originalExpression: _originalExpression, radicand, index, primeFactors, extracted, remaining, simplifiedForm, steps, method, title } = data
  const reducedMotion = prefersReducedMotion()
  void animationDuration // reserved for future animation customization

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: steps.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    language,
  })

  const progressPercent = ((diagram.currentStep + 1) / diagram.totalSteps) * 100
  const isComplete = diagram.currentStep >= steps.length - 1

  const _visibleSteps = useMemo(() => steps.filter((s) => s.step <= diagram.currentStep), [steps, diagram.currentStep])
  const currentStepInfo = steps[diagram.currentStep] || null

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.1 },
    },
  }

  const factorVariants: Variants = {
    hidden: { opacity: 0, scale: 0, rotate: -180 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
  }

  const extractVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 200 },
    },
    extract: {
      y: -30,
      scale: 1.1,
      transition: { type: 'spring', stiffness: 300 },
    },
  }

  // Get method name
  const getMethodName = (): { en: string; he: string } => {
    switch (method) {
      case 'prime_factorization': return { en: 'Prime Factorization', he: 'פירוק לגורמים ראשוניים' }
      case 'perfect_squares': return { en: 'Perfect Squares', he: 'ריבועים שלמים' }
      case 'rationalize_denominator': return { en: 'Rationalize Denominator', he: 'רציונליזציה של מכנה' }
    }
  }

  return (
    <div className={`radical-simplification ${className}`} style={{ width }}>
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
        <div className="text-center text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">
          {language === 'he' ? getMethodName().he : getMethodName().en}
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
                : `linear-gradient(90deg, ${diagram.colors.dark}, ${diagram.colors.primary})`,
            }}
          />
        </div>
      </motion.div>

      {/* Original Expression */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/30 dark:to-violet-900/30 rounded-xl p-5 mb-4 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {language === 'he' ? 'פשט:' : 'Simplify:'}
        </div>
        <div className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-300">
          <RadicalSymbol index={index} color={diagram.colors.primary}>
            {radicand}
          </RadicalSymbol>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Prime Factorization Display */}
        {diagram.currentStep >= 1 && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
          >
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-3">
              {language === 'he' ? 'פירוק לגורמים ראשוניים:' : 'Prime Factorization:'}
            </div>

            {/* Factor Tree Visualization */}
            <div className="flex justify-center items-center gap-2 flex-wrap mb-4">
              <span className="text-lg font-mono text-gray-700 dark:text-gray-300">{radicand} =</span>
              {primeFactors.map((factor, idx) => {
                const colors = getPrimeColor(factor.base)
                return (
                  <motion.div
                    key={`factor-${idx}`}
                    variants={factorVariants}
                    className="flex items-center"
                  >
                    {idx > 0 && <span className="mx-1 text-gray-400">×</span>}
                    <span
                      className="px-3 py-1.5 rounded-lg font-mono font-bold text-lg"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `2px solid ${colors.border}`,
                      }}
                    >
                      {factor.base}
                      {factor.exponent > 1 && (
                        <sup className="text-xs ml-0.5">{factor.exponent}</sup>
                      )}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Expanded form */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-mono">
              = {primeFactors.map(f => Array(f.exponent).fill(f.base).join(' × ')).join(' × ')}
            </div>
          </motion.div>
        )}

        {/* Grouping & Extraction Visualization */}
        {diagram.currentStep >= 2 && (
          <motion.div
            className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-3">
              {language === 'he' ? `קיבוץ זוגות (${index === 2 ? 'שורש ריבועי' : `שורש מסדר ${index}`}):` : `Group pairs (${index === 2 ? 'square root' : `${index}th root`}):`}
            </div>

            <div className="flex justify-center items-end gap-4">
              {/* Factors being extracted */}
              {primeFactors.map((factor, idx) => {
                const colors = getPrimeColor(factor.base)
                const canExtract = factor.exponent >= index
                const extractCount = Math.floor(factor.exponent / index)
                const _remainCount = factor.exponent % index

                return (
                  <motion.div
                    key={`group-${idx}`}
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reducedMotion ? 0 : idx * 0.15 }}
                  >
                    {/* What comes out */}
                    {canExtract && diagram.currentStep >= 3 && (
                      <motion.div
                        className="mb-2"
                        variants={extractVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <span
                          className="inline-block px-2 py-1 rounded-md text-sm font-bold"
                          style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: '#16a34a',
                            border: '2px solid #22c55e',
                          }}
                        >
                          {factor.base}
                          {extractCount > 1 && <sup className="text-xs">{extractCount}</sup>}
                          <span className="ml-1 text-xs">↑</span>
                        </span>
                      </motion.div>
                    )}

                    {/* Grouped factors */}
                    <div className="flex flex-col items-center">
                      <div 
                        className={`px-3 py-2 rounded-lg ${canExtract ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <div className="flex gap-1">
                          {Array(factor.exponent).fill(0).map((_, i) => (
                            <motion.span
                              key={`f-${idx}-${i}`}
                              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: i < extractCount * index ? 'rgba(34, 197, 94, 0.3)' : colors.bg,
                                color: colors.text,
                              }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: reducedMotion ? 0 : 0.1 + i * 0.05 }}
                            >
                              {factor.base}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Label showing grouping */}
                      <div className="text-xs text-gray-500 mt-1">
                        {canExtract 
                          ? (language === 'he' ? `${extractCount} זוג${extractCount > 1 ? 'ות' : ''}` : `${extractCount} pair${extractCount > 1 ? 's' : ''}`)
                          : (language === 'he' ? 'נשאר בפנים' : 'stays inside')
                        }
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Current Step Explanation */}
        {currentStepInfo && (
          <motion.div
            key={diagram.currentStep}
            className="p-4 rounded-xl border-l-4"
            style={{
              backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.08)' : `${diagram.colors.bg}`,
              borderLeftColor: isComplete ? COLORS.success[500] : diagram.colors.primary,
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
            {currentStepInfo.calculation && (
              <div className="mt-2 text-sm bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg inline-block">
                <MathText>{`$${normalizeToLatex(currentStepInfo.calculation)}$`}</MathText>
              </div>
            )}
          </motion.div>
        )}

        {/* Current Expression */}
        {currentStepInfo?.expression && diagram.currentStep > 0 && (
          <motion.div
            className="mt-4 text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-xl font-bold text-violet-700 dark:text-violet-300">
              <MathText>{`$${normalizeToLatex(currentStepInfo.expression)}$`}</MathText>
            </span>
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
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
              {language === 'he' ? 'צורה מפושטת:' : 'Simplified Form:'}
            </p>
            <motion.div
              className="text-3xl font-bold"
              style={{ color: COLORS.success[500] }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MathText>{`$${normalizeToLatex(simplifiedForm)}$`}</MathText>
            </motion.div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {extracted > 1 && (
                <span>
                  {extracted} × <RadicalSymbol index={index} size="sm" color="#6b7280">{remaining}</RadicalSymbol>
                </span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Counter */}
      {showStepCounter && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {language === 'he'
              ? `שלב ${diagram.currentStep + 1} מתוך ${diagram.totalSteps}`
              : `Step ${diagram.currentStep + 1} of ${diagram.totalSteps}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default RadicalSimplification
