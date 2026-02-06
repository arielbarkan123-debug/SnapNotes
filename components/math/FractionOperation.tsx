'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionOperationData, Fraction } from '@/types/math'
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

interface FractionErrorHighlight {
  message?: string
  messageHe?: string
  wrongResult?: Fraction
  correctResult?: Fraction
}

interface FractionOperationDataWithErrors extends FractionOperationData {
  errorHighlight?: FractionErrorHighlight
}

interface FractionOperationProps {
  data: FractionOperationDataWithErrors
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  /** Legacy props for MathDiagramRenderer compatibility */
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
  operands: { en: 'Show the fractions', he: 'הצגת השברים' },
  operation: { en: 'Apply the operation', he: 'ביצוע הפעולה' },
  result: { en: 'Show the result', he: 'הצגת התוצאה' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOperatorSymbol(operationType: FractionOperationData['operationType']): string {
  switch (operationType) {
    case 'add': return '+'
    case 'subtract': return '\u2212'
    case 'multiply': return '\u00D7'
    case 'divide': return '\u00F7'
  }
}

function getOperationName(operationType: FractionOperationData['operationType'], language: 'en' | 'he'): string {
  const names: Record<string, { en: string; he: string }> = {
    add: { en: 'Addition', he: 'חיבור' },
    subtract: { en: 'Subtraction', he: 'חיסור' },
    multiply: { en: 'Multiplication', he: 'כפל' },
    divide: { en: 'Division', he: 'חילוק' },
  }
  return names[operationType][language]
}

// ---------------------------------------------------------------------------
// FractionDisplay sub-component
// ---------------------------------------------------------------------------

function FractionDisplay({
  fraction,
  color,
  lineWeight,
  size = 'normal',
}: {
  fraction: Fraction
  color: string
  lineWeight: number
  size?: 'small' | 'normal' | 'large'
}) {
  const textSize = size === 'small' ? 'text-base' : size === 'large' ? 'text-3xl' : 'text-xl'

  if (fraction.wholeNumber !== undefined && fraction.wholeNumber !== 0) {
    return (
      <div className={`inline-flex items-center gap-1 ${textSize} font-semibold`} style={{ color }}>
        <span>{fraction.wholeNumber}</span>
        <div className="flex flex-col items-center">
          <span
            className="px-1"
            style={{ borderBottom: `${lineWeight}px solid ${color}` }}
          >
            {fraction.numerator}
          </span>
          <span>{fraction.denominator}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex flex-col items-center ${textSize} font-semibold`} style={{ color }}>
      <span
        className="px-2"
        style={{ borderBottom: `${lineWeight}px solid ${color}` }}
      >
        {fraction.numerator}
      </span>
      <span>{fraction.denominator}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionOperation({
  data,
  className = '',
  width = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionOperationProps) {
  const { operationType, fraction1, fraction2, result, steps, title, errorHighlight } = data

  const hasErrors = !!(
    errorHighlight?.message ||
    errorHighlight?.wrongResult
  )

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'operands', label: STEP_LABELS.operands.en, labelHe: STEP_LABELS.operands.he },
      { id: 'operation', label: STEP_LABELS.operation.en, labelHe: STEP_LABELS.operation.he },
      { id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he },
    ]
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasErrors])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Extract colors for use in JSX (avoids TS narrowing issue with `as const` literal unions)
  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  // Spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const operatorSymbol = getOperatorSymbol(operationType)

  // Get the intermediate step info from the steps array
  const intermediateStep = steps.find((s) => s.type === 'operate' || s.type === 'convert' || s.type === 'find_lcd')

  return (
    <div
      data-testid="fraction-operation"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="fo-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* ── Step 0: Show the fractions ─────────────────────── */}
      <AnimatePresence>
        {isVisible('operands') && (
          <motion.div
            data-testid="fo-operands"
            initial="hidden"
            animate={isCurrent('operands') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="flex items-center justify-center gap-4 py-4">
              <FractionDisplay
                fraction={fraction1}
                color={primaryColor}
                lineWeight={diagram.lineWeight}
              />
              <span className="text-2xl text-gray-500 font-medium">{operatorSymbol}</span>
              <FractionDisplay
                fraction={fraction2}
                color={accentColor}
                lineWeight={diagram.lineWeight}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 1: Apply the operation ────────────────────── */}
      <AnimatePresence>
        {isVisible('operation') && (
          <motion.div
            data-testid="fo-operation"
            initial="hidden"
            animate={isCurrent('operation') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <motion.div
                className="text-center"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-2"
                  style={{ backgroundColor: diagram.colors.primary }}
                >
                  {getOperationName(operationType, language)}
                </span>
              </motion.div>

              {/* Show intermediate calculation if available */}
              {intermediateStep?.calculation && (
                <motion.div
                  className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  <MathText>{`$${normalizeToLatex(intermediateStep.calculation)}$`}</MathText>
                </motion.div>
              )}

              {/* Show LCD if available */}
              {intermediateStep?.lcd && (
                <motion.p
                  className="text-center text-sm font-medium mt-1"
                  style={{ color: diagram.colors.primary }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  LCD = {intermediateStep.lcd}
                </motion.p>
              )}

              {/* Show description */}
              {intermediateStep?.description && (
                <motion.p
                  className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1 italic"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he'
                    ? intermediateStep.descriptionHe || intermediateStep.description
                    : intermediateStep.description}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 2: Show the result ──────────────────────── */}
      <AnimatePresence>
        {isVisible('result') && (
          <motion.div
            data-testid="fo-result"
            initial="hidden"
            animate={isCurrent('result') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="mt-4 p-4 rounded-xl text-center bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
              <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
                {language === 'he' ? '\u05EA\u05E9\u05D5\u05D1\u05D4:' : 'Answer:'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <FractionDisplay
                  fraction={fraction1}
                  color={primaryColor}
                  lineWeight={diagram.lineWeight}
                  size="small"
                />
                <span className="text-lg text-gray-500">{operatorSymbol}</span>
                <FractionDisplay
                  fraction={fraction2}
                  color={accentColor}
                  lineWeight={diagram.lineWeight}
                  size="small"
                />
                <span className="text-lg text-gray-500">=</span>
                <FractionDisplay
                  fraction={result}
                  color="#22c55e"
                  lineWeight={diagram.lineWeight}
                  size="large"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Errors Step ──────────────────────────────────── */}
      <AnimatePresence>
        {hasErrors && isVisible('errors') && (
          <motion.div
            data-testid="fo-errors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700">
              {errorHighlight?.message && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {language === 'he' ? (errorHighlight.messageHe || errorHighlight.message) : errorHighlight.message}
                </p>
              )}
              {errorHighlight?.wrongResult && errorHighlight?.correctResult && (
                <div className="flex items-center justify-center gap-3 mt-2">
                  <FractionDisplay
                    fraction={errorHighlight.wrongResult}
                    color="#ef4444"
                    lineWeight={diagram.lineWeight}
                    size="small"
                  />
                  <span className="text-gray-400">{'\u2192'}</span>
                  <FractionDisplay
                    fraction={errorHighlight.correctResult}
                    color="#22c55e"
                    lineWeight={diagram.lineWeight}
                    size="small"
                  />
                </div>
              )}
            </div>
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default FractionOperation
