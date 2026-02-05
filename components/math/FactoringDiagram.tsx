'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { MathText } from '@/components/ui/MathRenderer'
import { normalizeToLatex } from '@/lib/normalize-latex'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactorPair {
  a: number
  b: number
  sum: number
  product: number
  isCorrect?: boolean
}

export interface FactoringStep {
  step: number
  type: 'identify' | 'find_factors' | 'test_pair' | 'write_factors' | 'verify' | 'check' | 'complete'
  description: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
  factorPairs?: FactorPair[]
  selectedPair?: FactorPair
}

export interface FactoringData {
  /** Original expression (e.g., "x^2 + 5x + 6") */
  expression: string
  /** Coefficient of x^2 */
  a: number
  /** Coefficient of x */
  b: number
  /** Constant term */
  c: number
  /** Product ac (for ac-method) or c (for simple) */
  product: number
  /** Sum b */
  sum: number
  /** The two factors found */
  factor1: string
  factor2: string
  /** Factored form (e.g., "(x + 2)(x + 3)") */
  factoredForm: string
  /** All steps */
  steps: FactoringStep[]
  /** Method used */
  method: 'simple' | 'ac_method' | 'difference_of_squares' | 'perfect_square'
  /** Title */
  title?: string
  /** Error highlights for corrections */
  errors?: Array<{ message: string; messageHe?: string }>
}

export interface FactoringDiagramProps {
  data: FactoringData
  className?: string
  width?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
  /** Legacy props for MathDiagramRenderer compatibility */
  height?: number
  currentStep?: number
  totalSteps?: number
  showStepCounter?: boolean
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  original: { en: 'Original expression', he: '\u05D1\u05D9\u05D8\u05D5\u05D9 \u05DE\u05E7\u05D5\u05E8\u05D9' },
  step: { en: 'Factoring step', he: '\u05E9\u05DC\u05D1 \u05E4\u05D9\u05E8\u05D5\u05E7' },
  result: { en: 'Factored form', he: '\u05E6\u05D5\u05E8\u05D4 \u05DE\u05E4\u05D5\u05E8\u05E7\u05EA' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FactoringDiagram -- Phase 2 rebuild.
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] labelAppearVariants for HTML elements
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 */
export function FactoringDiagram({
  data,
  className = '',
  width = 500,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: FactoringDiagramProps) {
  const {
    expression,
    a,
    b,
    c,
    factoredForm,
    steps,
    errors,
  } = data

  const hasErrors = !!(errors && errors.length > 0)

  // Build step definitions: original -> one per factoring step -> result -> errors
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    ]
    steps.forEach((s, i) => {
      defs.push({
        id: `step-${i}`,
        label: s.description || `${STEP_LABELS.step.en} ${i + 1}`,
        labelHe: s.descriptionHe || `${STEP_LABELS.step.he} ${i + 1}`,
      })
    })
    defs.push({ id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he })
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [steps, hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="factoring-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
      dir={language === 'he' ? 'rtl' : 'ltr'}
    >
      {/* -- Step 0: Original expression ---------------------------------- */}
      <AnimatePresence>
        {isVisible('original') && (
          <motion.div
            data-testid="fd-original"
            initial="hidden"
            animate={isCurrent('original') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-4"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              {language === 'he' ? '\u05E4\u05E8\u05E7:' : 'Factor:'}
            </div>
            <motion.div
              className="text-2xl font-bold text-center"
              style={{ color: diagram.colors.primary }}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              <MathText>{`$${normalizeToLatex(expression)}$`}</MathText>
            </motion.div>
            {/* Coefficients */}
            <div className="flex justify-center gap-4 mt-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">a</div>
                <div className="font-mono font-bold" style={{ color: diagram.colors.primary }}>{a}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">b</div>
                <div className="font-mono font-bold" style={{ color: diagram.colors.primary }}>{b}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">c</div>
                <div className="font-mono font-bold" style={{ color: diagram.colors.primary }}>{c}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Steps: one per factoring step -------------------------------- */}
      {steps.map((step, i) => {
        const stepId = `step-${i}`
        return (
          <AnimatePresence key={stepId}>
            {isVisible(stepId) && (
              <motion.div
                data-testid={`fd-step-${i}`}
                initial="hidden"
                animate={isCurrent(stepId) ? 'spotlight' : 'visible'}
                variants={spotlight}
                className="mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <motion.p
                  className="text-sm text-gray-700 dark:text-gray-300"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he'
                    ? step.descriptionHe || step.description
                    : step.description}
                </motion.p>
                {step.calculation && (
                  <motion.div
                    className="mt-2 text-sm px-3 py-1.5 rounded-lg inline-block"
                    style={{
                      backgroundColor: `${diagram.colors.primary}15`,
                      color: diagram.colors.primary,
                    }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    <MathText>{`$${normalizeToLatex(step.calculation)}$`}</MathText>
                  </motion.div>
                )}
                {step.factorPairs && step.factorPairs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {step.factorPairs.map((pair, pi) => (
                      <div
                        key={`pair-${pi}`}
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          pair.isCorrect
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <MathText>{`$${pair.a} \\times ${pair.b} = ${pair.product}$`}</MathText>
                        {', '}
                        <MathText>{`$${pair.a} + ${pair.b} = ${pair.sum}$`}</MathText>
                        {pair.isCorrect && ' \u2713'}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )
      })}

      {/* -- Result: Factored form ---------------------------------------- */}
      <AnimatePresence>
        {isVisible('result') && (
          <motion.div
            data-testid="fd-result"
            initial="hidden"
            animate={isCurrent('result') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-3 p-4 rounded-lg text-center"
            style={{
              backgroundColor: `${diagram.colors.primary}10`,
              borderLeft: `4px solid ${diagram.colors.primary}`,
            }}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {language === 'he' ? '\u05E6\u05D5\u05E8\u05D4 \u05DE\u05E4\u05D5\u05E8\u05E7\u05EA:' : 'Factored Form:'}
            </div>
            <motion.div
              className="text-xl font-bold"
              style={{ color: diagram.colors.primary }}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              <MathText>{`$${normalizeToLatex(factoredForm)}$`}</MathText>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Errors / Corrections ----------------------------------------- */}
      <AnimatePresence>
        {hasErrors && isVisible('errors') && (
          <motion.div
            data-testid="fd-errors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            {errors!.map((err, i) => (
              <div key={`err-${i}`} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <span className="text-red-500 mt-0.5">\u2717</span>
                <span>{language === 'he' ? err.messageHe || err.message : err.message}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Controls */}
      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default FactoringDiagram
