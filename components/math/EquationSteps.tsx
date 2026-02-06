'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EquationData, EquationStep } from '@/types/math'
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

interface EquationErrorHighlight {
  message?: string
  messageHe?: string
  wrongStep?: number
  correctEquation?: string
}

interface EquationDataWithErrors extends EquationData {
  errorHighlight?: EquationErrorHighlight
}

interface EquationStepsProps {
  data: EquationDataWithErrors
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
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Operation display helpers
// ---------------------------------------------------------------------------

function getOperationLabel(operation: EquationStep['operation'], language: 'en' | 'he'): string {
  const labels: Record<string, { en: string; he: string }> = {
    initial: { en: 'Start', he: 'התחלה' },
    add: { en: 'Add', he: 'חיבור' },
    subtract: { en: 'Subtract', he: 'חיסור' },
    multiply: { en: 'Multiply', he: 'כפל' },
    divide: { en: 'Divide', he: 'חילוק' },
    simplify: { en: 'Simplify', he: 'פישוט' },
    combine: { en: 'Combine', he: 'איחוד' },
    distribute: { en: 'Distribute', he: 'פיזור' },
    factor: { en: 'Factor', he: 'פירוק' },
  }
  const entry = operation ? labels[operation] : undefined
  return entry ? entry[language] : (language === 'he' ? 'שלב' : 'Step')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquationSteps({
  data,
  className = '',
  width = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: EquationStepsProps) {
  const { variable, solution, steps, title, errorHighlight } = data

  const hasErrors = !!(
    errorHighlight?.message ||
    errorHighlight?.wrongStep !== undefined
  )

  // Build step definitions — one step per equation step
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = steps.map((step, i) => {
      const opLabel = getOperationLabel(step.operation, 'en')
      const opLabelHe = getOperationLabel(step.operation, 'he')
      return {
        id: `step-${i}`,
        label: step.description || `${opLabel}: ${step.equation}`,
        labelHe: step.descriptionHe || step.description || `${opLabelHe}: ${step.equation}`,
      }
    })
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [steps, hasErrors])

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

  // Spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Is the last equation step visible (for showing solution)?
  const isComplete = diagram.currentStep >= steps.length - 1

  return (
    <div
      data-testid="equation-steps"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="es-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* Equation steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const stepId = `step-${index}`
          const stepInfo = step as EquationStep
          const isCurrentStep = isCurrent(stepId)

          return (
            <AnimatePresence key={stepId}>
              {isVisible(stepId) && (
                <motion.div
                  data-testid={`es-step-${index}`}
                  initial="hidden"
                  animate={isCurrentStep ? 'spotlight' : 'visible'}
                  variants={spotlight}
                >
                  <div
                    className={`
                      relative p-4 rounded-xl transition-colors duration-300
                      ${isCurrentStep
                        ? 'border-2 shadow-md'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                      }
                    `}
                    style={isCurrentStep ? {
                      borderColor: diagram.colors.primary,
                      backgroundColor: `${diagram.colors.primary}08`,
                    } : undefined}
                  >
                    {/* Step number badge */}
                    <motion.div
                      className="absolute -left-2 -top-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                      style={{
                        backgroundColor: isCurrentStep ? diagram.colors.primary : '#e5e7eb',
                        color: isCurrentStep ? 'white' : '#6b7280',
                      }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {index + 1}
                    </motion.div>

                    {/* Equation display */}
                    <motion.div
                      className="flex items-center justify-center gap-3 text-xl mt-1"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      <span
                        className={isCurrentStep ? 'font-bold' : 'text-gray-700 dark:text-gray-300'}
                        style={isCurrentStep ? { color: diagram.colors.primary } : undefined}
                      >
                        <MathText>{`$${normalizeToLatex(stepInfo.leftSide)}$`}</MathText>
                      </span>
                      <span className="text-gray-500 text-2xl">=</span>
                      <span
                        className={isCurrentStep ? 'font-bold' : 'text-gray-700 dark:text-gray-300'}
                        style={isCurrentStep ? { color: diagram.colors.primary } : undefined}
                      >
                        <MathText>{`$${normalizeToLatex(stepInfo.rightSide)}$`}</MathText>
                      </span>
                    </motion.div>

                    {/* Operation label */}
                    {stepInfo.operation && stepInfo.operation !== 'initial' && isCurrentStep && (
                      <motion.div
                        className="flex items-center justify-center gap-2 mt-3"
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: diagram.colors.primary }}
                        >
                          {getOperationLabel(stepInfo.operation, language)}
                          {stepInfo.calculation && (
                            <span className="ml-1 opacity-80">
                              <MathText>{`$${normalizeToLatex(stepInfo.calculation)}$`}</MathText>
                            </span>
                          )}
                        </span>
                      </motion.div>
                    )}

                    {/* Description */}
                    {(stepInfo.description || stepInfo.descriptionHe) && isCurrentStep && (
                      <motion.p
                        className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 italic"
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {language === 'he'
                          ? stepInfo.descriptionHe || stepInfo.description
                          : stepInfo.description}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* Solution highlight */}
      {isComplete && !hasErrors && (
        <motion.div
          className="mt-4 p-4 rounded-xl text-center bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
        >
          <p className="text-sm text-green-600 dark:text-green-400 mb-1 font-medium">
            {language === 'he' ? '\u05E4\u05EA\u05E8\u05D5\u05DF:' : 'Solution:'}
          </p>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
            <MathText>{`$${normalizeToLatex(variable)} = ${normalizeToLatex(String(solution))}$`}</MathText>
          </p>
        </motion.div>
      )}

      {/* ── Errors Step ──────────────────────────────────── */}
      <AnimatePresence>
        {hasErrors && isVisible('errors') && (
          <motion.div
            data-testid="es-errors"
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
              {errorHighlight?.correctEquation && (
                <p className="mt-2 text-sm font-mono text-green-600 dark:text-green-400">
                  {language === 'he' ? '\u05E0\u05DB\u05D5\u05DF:' : 'Correct:'}{' '}
                  <MathText>{`$${normalizeToLatex(errorHighlight.correctEquation)}$`}</MathText>
                </p>
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default EquationSteps
