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
  find_lcd: { en: 'Find LCD', he: 'מציאת מכנה משותף' },
  convert: { en: 'Convert fractions', he: 'המרת השברים' },
  operation: { en: 'Calculate', he: 'חישוב' },
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
    default: return '?'
  }
}

function getOperationName(operationType: FractionOperationData['operationType'], language: 'en' | 'he'): string {
  const names: Record<string, { en: string; he: string }> = {
    add: { en: 'Addition', he: 'חיבור' },
    subtract: { en: 'Subtraction', he: 'חיסור' },
    multiply: { en: 'Multiplication', he: 'כפל' },
    divide: { en: 'Division', he: 'חילוק' },
  }
  return names[operationType]?.[language] ?? (language === 'he' ? 'פעולה' : 'Operation')
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
  // ---------------------------------------------------------------------------
  // Normalize AI data: the tutor may send either the canonical schema
  // ({ fraction1, fraction2, operationType, steps }) or an alternate format
  // ({ fractions: [...], operation: "addition", commonDenominator }).
  // We reconcile both into the canonical form here.
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any

  // operationType: canonical "add" | AI might send "addition", "operation" key, etc.
  const normalizeOp = (op: string | undefined): FractionOperationData['operationType'] => {
    if (!op) return 'add'
    const map: Record<string, FractionOperationData['operationType']> = {
      add: 'add', addition: 'add', subtract: 'subtract', subtraction: 'subtract',
      multiply: 'multiply', multiplication: 'multiply', divide: 'divide', division: 'divide',
    }
    return map[op.toLowerCase()] ?? 'add'
  }
  const operationType = normalizeOp(raw?.operationType ?? raw?.operation)

  // fractions: AI may send `fractions` array instead of `fraction1`/`fraction2`
  const altFractions = Array.isArray(raw?.fractions) ? raw.fractions : []
  const fraction1: Fraction = raw?.fraction1 ?? altFractions[0] ?? { numerator: 0, denominator: 1 }
  const fraction2: Fraction = raw?.fraction2 ?? altFractions[1] ?? { numerator: 0, denominator: 1 }
  const result: Fraction = raw?.result ?? { numerator: 0, denominator: 1 }
  const steps = Array.isArray(raw?.steps) ? raw.steps : []
  const title = raw?.title as string | undefined
  const errorHighlight = raw?.errorHighlight as FractionErrorHighlight | undefined

  const hasErrors = !!(
    errorHighlight?.message ||
    errorHighlight?.wrongResult
  )

  // Check if this operation needs LCD (add/subtract with different denominators)
  const needsLCD = (operationType === 'add' || operationType === 'subtract') &&
    fraction1.denominator !== fraction2.denominator

  // Find LCD-related steps from data
  const lcdStep = steps.find((s: { type?: string }) => s.type === 'find_lcd')
  const convertStep = steps.find((s: { type?: string }) => s.type === 'convert')

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'operands', label: STEP_LABELS.operands.en, labelHe: STEP_LABELS.operands.he },
    ]
    if (needsLCD) {
      defs.push({ id: 'find_lcd', label: STEP_LABELS.find_lcd.en, labelHe: STEP_LABELS.find_lcd.he })
      defs.push({ id: 'convert', label: STEP_LABELS.convert.en, labelHe: STEP_LABELS.convert.he })
    }
    defs.push({ id: 'operation', label: STEP_LABELS.operation.en, labelHe: STEP_LABELS.operation.he })
    defs.push({ id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he })
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasErrors, needsLCD])

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

      {/* ── Step: Find LCD ───────────────────────────────── */}
      <AnimatePresence>
        {needsLCD && isVisible('find_lcd') && (
          <motion.div
            data-testid="fo-find-lcd"
            initial="hidden"
            animate={isCurrent('find_lcd') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <motion.div
                className="text-center mb-2"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: diagram.colors.primary }}
                >
                  {language === 'he' ? 'מציאת מכנה משותף (מ.מ.מ)' : 'Find Lowest Common Denominator (LCD)'}
                </span>
              </motion.div>

              {/* Show multiples of each denominator */}
              <motion.div
                className="mt-3 space-y-2"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {(() => {
                  const lcd = lcdStep?.lcd ?? result.denominator
                  const d1 = fraction1.denominator
                  const d2 = fraction2.denominator
                  // Generate multiples up to LCD
                  const multiples1: number[] = []
                  const multiples2: number[] = []
                  for (let i = 1; i * d1 <= lcd; i++) multiples1.push(i * d1)
                  for (let i = 1; i * d2 <= lcd; i++) multiples2.push(i * d2)
                  // Ensure LCD is included
                  if (!multiples1.includes(lcd)) multiples1.push(lcd)
                  if (!multiples2.includes(lcd)) multiples2.push(lcd)

                  return (
                    <>
                      <div className="flex items-center gap-2 justify-center flex-wrap">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {language === 'he' ? `כפולות של ${d1}:` : `Multiples of ${d1}:`}
                        </span>
                        {multiples1.map((m) => (
                          <span
                            key={m}
                            className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${
                              m === lcd
                                ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 ring-2 ring-green-500'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 justify-center flex-wrap">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {language === 'he' ? `כפולות של ${d2}:` : `Multiples of ${d2}:`}
                        </span>
                        {multiples2.map((m) => (
                          <span
                            key={m}
                            className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${
                              m === lcd
                                ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 ring-2 ring-green-500'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          LCD = {lcd}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step: Convert fractions ───────────────────────── */}
      <AnimatePresence>
        {needsLCD && isVisible('convert') && (
          <motion.div
            data-testid="fo-convert"
            initial="hidden"
            animate={isCurrent('convert') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <div className="mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <motion.div
                className="text-center mb-3"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {language === 'he' ? 'המרה למכנה משותף' : 'Convert to Common Denominator'}
                </span>
              </motion.div>

              {/* Show the conversion for each fraction */}
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {(() => {
                  const lcd = lcdStep?.lcd ?? result.denominator
                  const multiplier1 = lcd / fraction1.denominator
                  const multiplier2 = lcd / fraction2.denominator
                  const converted1Num = fraction1.numerator * multiplier1
                  const converted2Num = fraction2.numerator * multiplier2

                  return (
                    <>
                      {/* Fraction 1 conversion */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <FractionDisplay
                          fraction={fraction1}
                          color={primaryColor}
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                        <span className="text-lg text-gray-500">×</span>
                        <FractionDisplay
                          fraction={{ numerator: multiplier1, denominator: multiplier1 }}
                          color="#6b7280"
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                        <span className="text-lg text-gray-500">=</span>
                        <FractionDisplay
                          fraction={{ numerator: converted1Num, denominator: lcd }}
                          color={primaryColor}
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                      </div>

                      {/* Fraction 2 conversion */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <FractionDisplay
                          fraction={fraction2}
                          color={accentColor}
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                        <span className="text-lg text-gray-500">×</span>
                        <FractionDisplay
                          fraction={{ numerator: multiplier2, denominator: multiplier2 }}
                          color="#6b7280"
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                        <span className="text-lg text-gray-500">=</span>
                        <FractionDisplay
                          fraction={{ numerator: converted2Num, denominator: lcd }}
                          color={accentColor}
                          lineWeight={diagram.lineWeight}
                          size="small"
                        />
                      </div>
                    </>
                  )
                })()}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step: Calculate ───────────────────────────────── */}
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
                className="text-center mb-2"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: diagram.colors.primary }}
                >
                  {getOperationName(operationType, language)}
                </span>
              </motion.div>

              {/* Show the actual calculation with converted fractions */}
              <motion.div
                className="flex items-center justify-center gap-3 py-2"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {(() => {
                  if (needsLCD) {
                    const lcd = lcdStep?.lcd ?? result.denominator
                    const converted1Num = fraction1.numerator * (lcd / fraction1.denominator)
                    const converted2Num = fraction2.numerator * (lcd / fraction2.denominator)
                    return (
                      <>
                        <FractionDisplay
                          fraction={{ numerator: converted1Num, denominator: lcd }}
                          color={primaryColor}
                          lineWeight={diagram.lineWeight}
                        />
                        <span className="text-2xl text-gray-500 font-medium">{operatorSymbol}</span>
                        <FractionDisplay
                          fraction={{ numerator: converted2Num, denominator: lcd }}
                          color={accentColor}
                          lineWeight={diagram.lineWeight}
                        />
                        <span className="text-2xl text-gray-500 font-medium">=</span>
                        <FractionDisplay
                          fraction={result}
                          color="#22c55e"
                          lineWeight={diagram.lineWeight}
                        />
                      </>
                    )
                  }
                  // For multiply/divide, show directly
                  return (
                    <>
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
                      <span className="text-2xl text-gray-500 font-medium">=</span>
                      <FractionDisplay
                        fraction={result}
                        color="#22c55e"
                        lineWeight={diagram.lineWeight}
                      />
                    </>
                  )
                })()}
              </motion.div>

              {/* Show description from step data */}
              {convertStep?.description && (
                <motion.p
                  className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1 italic"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he'
                    ? convertStep.descriptionHe || convertStep.description
                    : convertStep.description}
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
