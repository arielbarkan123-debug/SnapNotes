'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LongDivisionData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LongDivisionErrorHighlight {
  message?: string
  messageHe?: string
  wrongQuotient?: number
  correctQuotient?: number
  wrongRemainder?: number
  correctRemainder?: number
}

interface LongDivisionDataWithErrors extends LongDivisionData {
  errorHighlight?: LongDivisionErrorHighlight
}

interface LongDivisionDiagramProps {
  data: LongDivisionDataWithErrors
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
  setup: { en: 'Set up the problem', he: 'הגדרת התרגיל' },
  division_step: { en: 'Division step', he: 'שלב חילוק' },
  result: { en: 'Show the result', he: 'הצגת התוצאה' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LongDivisionDiagram({
  data,
  className = '',
  width = 500,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: LongDivisionDiagramProps) {
  const { dividend, divisor, quotient, remainder, steps: rawSteps, title, errorHighlight } = data

  const steps = rawSteps ?? []
  const dividendStr = dividend.toString()
  const divisorStr = divisor.toString()
  const quotientStr = quotient.toString()

  // Group raw steps into logical division iterations
  const divisionIterations = useMemo(() => {
    const iterations: Array<{ steps: typeof steps; label: string; labelHe: string }> = []
    let currentIteration: typeof steps = []
    let iterIndex = 0

    for (const step of steps) {
      if (step.type === 'setup') continue // setup is handled separately
      if (step.type === 'divide') {
        if (currentIteration.length > 0) {
          iterations.push({
            steps: currentIteration,
            label: `${STEP_LABELS.division_step.en} ${iterIndex}`,
            labelHe: `${STEP_LABELS.division_step.he} ${iterIndex}`,
          })
        }
        iterIndex++
        currentIteration = [step]
      } else {
        currentIteration.push(step)
      }
    }
    if (currentIteration.length > 0) {
      iterations.push({
        steps: currentIteration,
        label: `${STEP_LABELS.division_step.en} ${iterIndex}`,
        labelHe: `${STEP_LABELS.division_step.he} ${iterIndex}`,
      })
    }
    return iterations
  }, [steps])

  // Determine if errors exist
  const hasErrors = !!(
    errorHighlight?.message ||
    errorHighlight?.wrongQuotient !== undefined ||
    errorHighlight?.wrongRemainder !== undefined
  )

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'setup', label: STEP_LABELS.setup.en, labelHe: STEP_LABELS.setup.he },
    ]
    divisionIterations.forEach((iter, i) => {
      defs.push({
        id: `division-${i}`,
        label: iter.label,
        labelHe: iter.labelHe,
      })
    })
    defs.push({ id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he })
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [divisionIterations, hasErrors])

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

  // Sizing
  const digitWidth = 32
  const digitHeight = 38
  const fontSize = 24

  // Build visible quotient digits and work rows from visible iterations
  const visibleQuotientDigits = useMemo(() => {
    const digits: Array<{ digit: number; position: number }> = []
    divisionIterations.forEach((iter, i) => {
      if (!isVisible(`division-${i}`)) return
      for (const step of iter.steps) {
        if (step.type === 'divide' && step.quotientDigit !== undefined) {
          digits.push({ digit: step.quotientDigit, position: step.position })
        }
      }
    })
    return digits
  }, [divisionIterations, diagram.currentStep, stepDefs])

  const visibleWorkRows = useMemo(() => {
    const rows: Array<{
      position: number
      product?: number
      difference?: number
      workingNumber?: number
      showProduct: boolean
      showDifference: boolean
      showBringDown: boolean
    }> = []

    const allVisibleSteps: typeof steps = []
    divisionIterations.forEach((iter, i) => {
      if (!isVisible(`division-${i}`)) return
      allVisibleSteps.push(...iter.steps)
    })

    let currentPosition = -1
    let currentRow: (typeof rows)[0] | null = null

    for (const step of allVisibleSteps) {
      if (step.position !== currentPosition) {
        if (currentRow) rows.push(currentRow)
        currentPosition = step.position
        currentRow = {
          position: step.position,
          showProduct: false,
          showDifference: false,
          showBringDown: false,
        }
      }
      if (currentRow) {
        if (step.type === 'multiply' && step.product !== undefined) {
          currentRow.product = step.product
          currentRow.showProduct = true
        }
        if (step.type === 'subtract' && step.difference !== undefined) {
          currentRow.difference = step.difference
          currentRow.showDifference = true
        }
        if (step.type === 'bring_down') {
          currentRow.showBringDown = true
          currentRow.workingNumber = step.workingNumber
        }
      }
    }
    if (currentRow) rows.push(currentRow)
    return rows
  }, [divisionIterations, diagram.currentStep, stepDefs])

  // Line color for subtraction lines etc.
  const lineColor = diagram.colors.primary

  return (
    <div
      data-testid="long-division"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="ld-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* ── Step 0: Setup ───────────────────────────────────── */}
      <AnimatePresence>
        {isVisible('setup') && (
          <motion.div
            data-testid="ld-setup"
            initial="hidden"
            animate={isCurrent('setup') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div
              className="relative"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize }}
              dir="ltr"
            >
              {/* Quotient row */}
              <div className="flex mb-1" style={{ height: digitHeight }}>
                <div style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                <div className="flex">
                  {dividendStr.split('').map((_, i) => {
                    const qDigit = visibleQuotientDigits.find((d) => d.position === i)
                    return (
                      <motion.div
                        key={i}
                        className="text-center font-bold"
                        style={{
                          width: digitWidth,
                          color: qDigit ? diagram.colors.primary : 'transparent',
                          lineHeight: `${digitHeight}px`,
                        }}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {qDigit !== undefined ? qDigit.digit : '\u00A0'}
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Division bracket row: divisor ) dividend */}
              <div className="flex items-center" style={{ height: digitHeight }}>
                <div
                  className="text-right font-semibold pr-1 text-gray-700 dark:text-gray-300"
                  style={{
                    width: divisorStr.length * digitWidth * 0.6,
                    lineHeight: `${digitHeight}px`,
                  }}
                >
                  {divisorStr}
                </div>
                <div className="relative flex-shrink-0" style={{ width: 16, height: digitHeight }}>
                  <svg width="16" height={digitHeight} style={{ overflow: 'visible' }}>
                    <path
                      d={`M 2 0 Q 14 ${digitHeight / 2} 2 ${digitHeight}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                    />
                    <line
                      x1="2"
                      y1="2"
                      x2={dividendStr.length * digitWidth + 8}
                      y2="2"
                      stroke={lineColor}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex">
                  {dividendStr.split('').map((digit, i) => (
                    <div
                      key={i}
                      className="text-center font-semibold text-gray-800 dark:text-gray-200"
                      style={{
                        width: digitWidth,
                        lineHeight: `${digitHeight}px`,
                      }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Division Steps ────────────────────────────────── */}
      {divisionIterations.map((iter, i) => (
        <AnimatePresence key={`division-${i}`}>
          {isVisible(`division-${i}`) && (
            <motion.div
              data-testid={`ld-step-${i}`}
              initial="hidden"
              animate={isCurrent(`division-${i}`) ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <div
                style={{ fontFamily: 'ui-monospace, monospace', fontSize }}
                dir="ltr"
              >
                {visibleWorkRows
                  .filter((row) => {
                    // Only show rows belonging to this iteration
                    return iter.steps.some((s) => s.position === row.position)
                  })
                  .map((row, rowIndex) => {
                    const nextRow = visibleWorkRows[visibleWorkRows.indexOf(row) + 1]
                    const skipDifference = nextRow?.showBringDown && nextRow?.workingNumber !== undefined

                    return (
                      <motion.div
                        key={rowIndex}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {/* Product line */}
                        {row.showProduct && row.product !== undefined && (
                          <div className="flex" style={{ height: digitHeight }}>
                            <div
                              className="flex-shrink-0 flex items-center justify-end pr-1"
                              style={{ width: divisorStr.length * digitWidth * 0.6 }}
                            >
                              <span className="text-gray-600 dark:text-gray-400">{'\u2212'}</span>
                            </div>
                            <div className="flex-shrink-0" style={{ width: 16 }} />
                            <div className="flex">
                              {dividendStr.split('').map((_, ci) => {
                                const productStr = row.product!.toString()
                                const endCol = row.position
                                const startCol = endCol - productStr.length + 1
                                const digitIndex = ci - startCol
                                const showDigit = digitIndex >= 0 && digitIndex < productStr.length
                                return (
                                  <div
                                    key={ci}
                                    className="text-center font-semibold flex-shrink-0 text-gray-800 dark:text-gray-200"
                                    style={{
                                      width: digitWidth,
                                      color: showDigit ? undefined : 'transparent',
                                      lineHeight: `${digitHeight}px`,
                                    }}
                                  >
                                    {showDigit ? productStr[digitIndex] : '\u00A0'}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Subtraction line */}
                        {row.showProduct && (
                          <div className="flex" style={{ height: 3 }}>
                            <div
                              className="flex-shrink-0"
                              style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }}
                            />
                            <div
                              style={{
                                background: lineColor,
                                borderRadius: 2,
                                width: (row.position + 1) * digitWidth,
                                height: diagram.lineWeight,
                              }}
                            />
                          </div>
                        )}

                        {/* Difference */}
                        {row.showDifference && row.difference !== undefined && !skipDifference && (
                          <div className="flex" style={{ height: digitHeight }}>
                            <div
                              className="flex-shrink-0"
                              style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }}
                            />
                            <div className="flex">
                              {dividendStr.split('').map((_, ci) => {
                                const diffStr = row.difference!.toString()
                                const endCol = row.position
                                const startCol = endCol - diffStr.length + 1
                                const digitIndex = ci - startCol
                                const showDigit = digitIndex >= 0 && digitIndex < diffStr.length
                                return (
                                  <div
                                    key={ci}
                                    className="text-center font-semibold flex-shrink-0 text-gray-800 dark:text-gray-200"
                                    style={{
                                      width: digitWidth,
                                      color: showDigit ? undefined : 'transparent',
                                      lineHeight: `${digitHeight}px`,
                                    }}
                                  >
                                    {showDigit ? diffStr[digitIndex] : '\u00A0'}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Bring down */}
                        {row.showBringDown && row.workingNumber !== undefined && (
                          <div className="flex" style={{ height: digitHeight }}>
                            <div
                              className="flex-shrink-0"
                              style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }}
                            />
                            <div className="flex">
                              {dividendStr.split('').map((_, ci) => {
                                const workStr = row.workingNumber!.toString()
                                const endCol = row.position
                                const startCol = endCol - workStr.length + 1
                                const digitIndex = ci - startCol
                                const showDigit = digitIndex >= 0 && digitIndex < workStr.length
                                return (
                                  <div
                                    key={ci}
                                    className="text-center font-semibold flex-shrink-0 text-gray-800 dark:text-gray-200"
                                    style={{
                                      width: digitWidth,
                                      color: showDigit ? undefined : 'transparent',
                                      lineHeight: `${digitHeight}px`,
                                    }}
                                  >
                                    {showDigit ? workStr[digitIndex] : '\u00A0'}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      {/* ── Result Step ──────────────────────────────────── */}
      <AnimatePresence>
        {isVisible('result') && (
          <motion.div
            data-testid="ld-result"
            initial="hidden"
            animate={isCurrent('result') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="mt-4 p-4 rounded-xl text-center bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {dividend} {'\u00F7'} {divisor} ={' '}
                <span className="font-bold" style={{ color: diagram.colors.primary }}>
                  {quotientStr}
                </span>
                {remainder > 0 && (
                  <span className="text-gray-500 ml-2">
                    {language === 'he' ? `\u05E9\u05D0\u05E8\u05D9\u05EA ${remainder}` : `R ${remainder}`}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Errors Step ──────────────────────────────────── */}
      <AnimatePresence>
        {hasErrors && isVisible('errors') && (
          <motion.div
            data-testid="ld-errors"
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
              {errorHighlight?.wrongQuotient !== undefined && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-red-500 line-through">{errorHighlight.wrongQuotient}</span>
                  <span className="text-gray-400">{'\u2192'}</span>
                  <span className="text-green-600 font-bold">{errorHighlight.correctQuotient}</span>
                </div>
              )}
              {errorHighlight?.wrongRemainder !== undefined && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{language === 'he' ? '\u05E9\u05D0\u05E8\u05D9\u05EA:' : 'Remainder:'}</span>
                  <span className="text-red-500 line-through">{errorHighlight.wrongRemainder}</span>
                  <span className="text-gray-400">{'\u2192'}</span>
                  <span className="text-green-600 font-bold">{errorHighlight.correctRemainder}</span>
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default LongDivisionDiagram
