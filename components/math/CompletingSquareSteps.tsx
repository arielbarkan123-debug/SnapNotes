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
import { InlineMath } from '@/components/ui/MathRenderer'
import { normalizeToLatex } from '@/lib/normalize-latex'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletingSquareStep {
  step: number
  type: 'identify' | 'isolate' | 'half_b' | 'square_it' | 'add_both' | 'factor_left' | 'sqrt_both' | 'solve' | 'complete'
  description: string
  descriptionHe?: string
  leftSide: string
  rightSide: string
  calculation?: string
  highlightValue?: string
  highlighted?: boolean
}

export interface CompletingSquareData {
  /** Original equation (e.g., "x^2 + 6x + 5 = 0") */
  originalEquation: string
  /** Coefficient of x^2 (should be 1 after normalization) */
  a: number
  /** Coefficient of x */
  b: number
  /** Constant term */
  c: number
  /** Half of b: b/2 */
  halfB: number
  /** (b/2)^2 -- the number we add to both sides */
  squaredHalfB: number
  /** Variable being solved */
  variable: string
  /** Solutions (could be 1 or 2) */
  solutions: string[]
  /** Vertex form result (e.g., "(x + 3)^2 = 4") */
  vertexForm: string
  /** All steps */
  steps: CompletingSquareStep[]
  /** Title */
  title?: string
  /** Error highlights for corrections */
  errors?: Array<{ message: string; messageHe?: string }>
}

export interface CompletingSquareStepsProps {
  data: CompletingSquareData
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
  equation: { en: 'Start with the equation', he: '\u05D4\u05EA\u05D7\u05DC \u05E2\u05DD \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4' },
  coefficients: { en: 'Identify coefficients', he: '\u05D6\u05D4\u05D4 \u05DE\u05E7\u05D3\u05DE\u05D9\u05DD' },
  square: { en: 'Add the square term', he: '\u05D4\u05D5\u05E1\u05E3 \u05D0\u05EA \u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D9\u05D1\u05D5\u05E2' },
  result: { en: 'Rewrite as perfect square', he: '\u05E8\u05E9\u05D5\u05DD \u05DB\u05E8\u05D9\u05D1\u05D5\u05E2 \u05E9\u05DC\u05DD' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CompletingSquareSteps -- Phase 2 rebuild.
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
export function CompletingSquareSteps({
  data,
  className = '',
  width = 500,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: CompletingSquareStepsProps) {
  const {
    originalEquation,
    a,
    b,
    c,
    halfB,
    squaredHalfB,
    vertexForm,
    solutions,
    variable,
    errors,
  } = data

  const hasErrors = !!(errors && errors.length > 0)

  // Build step definitions following the mandated order
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he },
      { id: 'coefficients', label: STEP_LABELS.coefficients.en, labelHe: STEP_LABELS.coefficients.he },
      { id: 'square', label: STEP_LABELS.square.en, labelHe: STEP_LABELS.square.he },
      { id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he },
    ]
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasErrors])

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
      data-testid="completing-square"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
      dir={language === 'he' ? 'rtl' : 'ltr'}
    >
      {/* -- Step 0: Start with the equation ------------------------------ */}
      <AnimatePresence>
        {isVisible('equation') && (
          <motion.div
            data-testid="cs-equation"
            initial="hidden"
            animate={isCurrent('equation') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-4"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              {language === 'he' ? '\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4:' : 'Equation:'}
            </div>
            <motion.div
              className="text-2xl font-bold text-center"
              style={{ color: diagram.colors.primary }}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              <InlineMath>{normalizeToLatex(originalEquation)}</InlineMath>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Step 1: Identify coefficients -------------------------------- */}
      <AnimatePresence>
        {isVisible('coefficients') && (
          <motion.div
            data-testid="cs-coefficients"
            initial="hidden"
            animate={isCurrent('coefficients') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <motion.div
              className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center"
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              {language === 'he' ? '\u05DE\u05E7\u05D3\u05DE\u05D9\u05DD:' : 'Coefficients:'}
            </motion.div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">a</div>
                <div className="font-mono font-bold text-lg" style={{ color: diagram.colors.primary }}>{a}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">b</div>
                <div className="font-mono font-bold text-lg" style={{ color: diagram.colors.primary }}>{b}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">c</div>
                <div className="font-mono font-bold text-lg" style={{ color: diagram.colors.primary }}>{c}</div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">b/2</div>
                <div className="font-mono font-bold" style={{ color: diagram.colors.primary }}>{halfB}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400"><InlineMath>{'(b/2)^{2}'}</InlineMath></div>
                <div className="font-mono font-bold" style={{ color: diagram.colors.primary }}>{squaredHalfB}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Step 2: Add the square term ---------------------------------- */}
      <AnimatePresence>
        {isVisible('square') && (
          <motion.div
            data-testid="cs-square"
            initial="hidden"
            animate={isCurrent('square') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <motion.div
              className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center"
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              {language === 'he'
                ? `\u05D4\u05D5\u05E1\u05E3 ${squaredHalfB} \u05DC\u05E9\u05E0\u05D9 \u05D4\u05E6\u05D3\u05D3\u05D9\u05DD`
                : `Add ${squaredHalfB} to both sides`}
            </motion.div>
            <motion.div
              className="text-center text-lg"
              style={{ color: diagram.colors.primary }}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              <InlineMath>{`${variable}^{2} + ${b}${variable} + ${squaredHalfB} = ${squaredHalfB - c}`}</InlineMath>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Step 3: Rewrite as perfect square / Result -------------------- */}
      <AnimatePresence>
        {isVisible('result') && (
          <motion.div
            data-testid="cs-result"
            initial="hidden"
            animate={isCurrent('result') ? 'spotlight' : 'visible'}
            variants={spotlight}
            className="mb-4 p-4 rounded-lg text-center"
            style={{
              backgroundColor: `${diagram.colors.primary}10`,
              borderLeft: `4px solid ${diagram.colors.primary}`,
            }}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {language === 'he' ? '\u05E6\u05D5\u05E8\u05EA \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3:' : 'Vertex Form:'}
            </div>
            <motion.div
              className="text-xl font-bold"
              style={{ color: diagram.colors.primary }}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              <InlineMath>{normalizeToLatex(vertexForm)}</InlineMath>
            </motion.div>
            {solutions.length > 0 && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {language === 'he'
                  ? (solutions.length > 1 ? '\u05E4\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA:' : '\u05E4\u05EA\u05E8\u05D5\u05DF:')
                  : (solutions.length > 1 ? 'Solutions:' : 'Solution:')}
                {' '}
                <span className="font-bold" style={{ color: diagram.colors.primary }}>
                  {solutions.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <InlineMath>{normalizeToLatex(`${variable} = ${s}`)}</InlineMath>
                    </span>
                  ))}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Errors / Corrections ----------------------------------------- */}
      <AnimatePresence>
        {hasErrors && isVisible('errors') && (
          <motion.div
            data-testid="cs-errors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            {errors!.map((err, i) => (
              <div key={`err-${i}`} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <span className="text-red-500 mt-0.5">{'\u2717'}</span>
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

export default CompletingSquareSteps
