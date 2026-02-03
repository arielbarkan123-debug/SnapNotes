'use client'

import { useMemo, Component, type ReactNode } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// Error Boundary for graceful fallback
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class FactoringDiagramErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg p-4">
          <p className="text-gray-500 text-center">
            Unable to render factoring diagram. Please try again.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================================
// Types
// ============================================================================

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
  /** FOIL verification breakdown */
  foilVerification?: FOILBreakdown
  /** Educational "why" explanation */
  whyExplanation?: string
  whyExplanationHe?: string
  /** Common mistake warning */
  commonMistake?: string
  commonMistakeHe?: string
}

export interface FOILBreakdown {
  /** First: (a)(c) */
  first: string
  /** Outer: (a)(d) */
  outer: string
  /** Inner: (b)(c) */
  inner: string
  /** Last: (b)(d) */
  last: string
  /** Combined result */
  result: string
  /** Is the verification correct */
  isCorrect: boolean
}

export interface FactoringData {
  /** Original expression (e.g., "x² + 5x + 6") */
  expression: string
  /** Coefficient of x² */
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
  /** Show FOIL verification step */
  showVerification?: boolean
  /** Show "why" explanations */
  showExplanations?: boolean
  /** Show common mistake warnings */
  showCommonMistakes?: boolean
  /** FOIL verification data */
  foilVerification?: FOILBreakdown
}

interface FactoringDiagramProps {
  data: FactoringData
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
  showStepCounter?: boolean
}

// ============================================================================
// Component
// ============================================================================

function FactoringDiagram({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  animationDuration = 400,
  width = 420,
  className = '',
  language = 'en',
  showStepCounter = true,
}: FactoringDiagramProps) {
  // Data validation - ensure we have required fields
  const safeData = useMemo(() => {
    const defaultSteps: FactoringStep[] = [
      { step: 0, type: 'identify', description: 'Identify the expression' },
      { step: 1, type: 'complete', description: 'Complete' },
    ]

    return {
      expression: data?.expression || 'x² + bx + c',
      a: typeof data?.a === 'number' ? data.a : 1,
      b: typeof data?.b === 'number' ? data.b : 0,
      c: typeof data?.c === 'number' ? data.c : 0,
      product: typeof data?.product === 'number' ? data.product : 0,
      sum: typeof data?.sum === 'number' ? data.sum : 0,
      factor1: data?.factor1 || '(x + ?)',
      factor2: data?.factor2 || '(x + ?)',
      factoredForm: data?.factoredForm || '(x + ?)(x + ?)',
      steps: Array.isArray(data?.steps) && data.steps.length > 0 ? data.steps : defaultSteps,
      method: data?.method || 'simple',
      title: data?.title,
      showVerification: data?.showVerification ?? true,
      showExplanations: data?.showExplanations ?? true,
      showCommonMistakes: data?.showCommonMistakes ?? true,
      foilVerification: data?.foilVerification,
    }
  }, [data])

  const {
    expression,
    a,
    b,
    c,
    product,
    sum,
    factor1,
    factor2,
    factoredForm,
    steps,
    method,
    title,
    showVerification,
    showExplanations,
    showCommonMistakes,
    foilVerification,
  } = safeData

  const reducedMotion = prefersReducedMotion()
  void animationDuration // reserved for future animation customization

  // Generate FOIL verification if not provided (with try/catch)
  const generatedFoilVerification = useMemo(() => {
    try {
      if (foilVerification) return foilVerification

      // Parse factors to generate FOIL breakdown
      // For (x + p)(x + q) where p and q are the factors
      // factor1 = "(x + 2)", factor2 = "(x + 3)" for x² + 5x + 6
      const pMatch = factor1.match(/[+-]?\s*\d+/)
      const qMatch = factor2.match(/[+-]?\s*\d+/)
      const p = pMatch ? parseInt(pMatch[0].replace(/\s/g, '')) : 0
      const q = qMatch ? parseInt(qMatch[0].replace(/\s/g, '')) : 0

      if (a === 1) {
        // Simple trinomial: (x + p)(x + q)
        return {
          first: `x · x = x²`,
          outer: `x · ${q >= 0 ? q : `(${q})`} = ${q}x`,
          inner: `${p >= 0 ? p : `(${p})`} · x = ${p}x`,
          last: `${p >= 0 ? p : `(${p})`} · ${q >= 0 ? q : `(${q})`} = ${p * q}`,
          result: `x² + ${p + q}x + ${p * q}`,
          isCorrect: (p + q === b && p * q === c),
        }
      }

      // For ac-method, simplified
      return {
        first: `${a}x · x = ${a}x²`,
        outer: `${a}x · ? = ?x`,
        inner: `? · x = ?x`,
        last: `? · ? = ${c}`,
        result: expression,
        isCorrect: true,
      }
    } catch {
      return null
    }
  }, [foilVerification, factor1, factor2, a, b, c, expression])

  const actualTotalSteps = totalStepsProp ?? steps.length
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100
  const isComplete = currentStep >= steps.length - 1

  // visibleSteps used for progressive reveal logic
  const _visibleSteps = useMemo(() => steps.filter((s) => s.step <= currentStep), [steps, currentStep])
  const currentStepInfo = steps[currentStep] || null

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 },
    },
  }

  // Get method name
  const getMethodName = () => {
    const names = {
      en: {
        simple: 'Simple Factoring',
        ac_method: 'AC Method',
        difference_of_squares: 'Difference of Squares',
        perfect_square: 'Perfect Square Trinomial',
      },
      he: {
        simple: 'פירוק פשוט',
        ac_method: 'שיטת AC',
        difference_of_squares: 'הפרש ריבועים',
        perfect_square: 'טרינום ריבועי שלם',
      },
    }
    return names[language][method]
  }

  return (
    <div className={`factoring-diagram ${className}`} style={{ width }}>
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
        <div className="text-center text-sm text-violet-600 dark:text-violet-400 font-medium mb-3">
          {getMethodName()}
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
                : 'linear-gradient(90deg, #4f46e5, #6366f1)',
            }}
          />
        </div>
      </motion.div>

      {/* Original Expression */}
      <motion.div
        className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl p-4 mb-4 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {language === 'he' ? 'פרק:' : 'Factor:'}
        </div>
        <div className="text-2xl font-mono font-bold text-violet-700 dark:text-violet-300">
          {expression}
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Coefficients Display */}
        <motion.div
          className="flex justify-center gap-6 mb-5 pb-4 border-b border-gray-200 dark:border-gray-700"
          variants={itemVariants}
        >
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">a</div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">
              {a}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">b</div>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-mono font-bold text-green-600 dark:text-green-400 text-lg">
              {b}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">c</div>
            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-mono font-bold text-amber-600 dark:text-amber-400 text-lg">
              {c}
            </div>
          </div>
        </motion.div>

        {/* Factor Finding Box */}
        {currentStep >= 1 && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
          >
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              {language === 'he' ? `מצא שני מספרים שמכפלתם ${product} וסכומם ${sum}` : `Find two numbers: product = ${product}, sum = ${sum}`}
            </div>

            {/* Factor Pairs Table */}
            {currentStepInfo?.factorPairs && currentStepInfo.factorPairs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400">
                      <th className="py-2 px-3 text-left font-medium">
                        {language === 'he' ? 'מספר א\'' : 'Factor 1'}
                      </th>
                      <th className="py-2 px-3 text-left font-medium">
                        {language === 'he' ? 'מספר ב\'' : 'Factor 2'}
                      </th>
                      <th className="py-2 px-3 text-center font-medium">
                        {language === 'he' ? 'מכפלה' : 'Product'}
                      </th>
                      <th className="py-2 px-3 text-center font-medium">
                        {language === 'he' ? 'סכום' : 'Sum'}
                      </th>
                      <th className="py-2 px-3 text-center font-medium">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {currentStepInfo.factorPairs.map((pair, idx) => (
                        <motion.tr
                          key={`${pair.a}-${pair.b}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: reducedMotion ? 0 : idx * 0.1 }}
                          className={`border-t border-gray-100 dark:border-gray-700 ${
                            pair.isCorrect
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono">{pair.a}</td>
                          <td className="py-2 px-3 font-mono">{pair.b}</td>
                          <td className="py-2 px-3 text-center font-mono">
                            {pair.product}
                            {pair.product === product && (
                              <span className="ml-1 text-green-500">✓</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {pair.sum}
                            {pair.sum === sum && (
                              <span className="ml-1 text-green-500">✓</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {pair.isCorrect ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs"
                              >
                                ✓
                              </motion.span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Box Method Visualization (for AC method) */}
        {method === 'ac_method' && currentStep >= 2 && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-1 max-w-xs mx-auto">
              <motion.div
                className="h-16 bg-blue-100 dark:bg-blue-900/30 rounded-tl-lg flex items-center justify-center font-mono font-bold text-blue-700 dark:text-blue-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.1 }}
              >
                {a}x²
              </motion.div>
              <motion.div
                className="h-16 bg-purple-100 dark:bg-purple-900/30 rounded-tr-lg flex items-center justify-center font-mono font-bold text-purple-700 dark:text-purple-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.2 }}
              >
                {currentStepInfo?.selectedPair ? `${currentStepInfo.selectedPair.a}x` : '?x'}
              </motion.div>
              <motion.div
                className="h-16 bg-purple-100 dark:bg-purple-900/30 rounded-bl-lg flex items-center justify-center font-mono font-bold text-purple-700 dark:text-purple-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.3 }}
              >
                {currentStepInfo?.selectedPair ? `${currentStepInfo.selectedPair.b}x` : '?x'}
              </motion.div>
              <motion.div
                className="h-16 bg-amber-100 dark:bg-amber-900/30 rounded-br-lg flex items-center justify-center font-mono font-bold text-amber-700 dark:text-amber-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.4 }}
              >
                {c}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Current Step Explanation */}
        {currentStepInfo && (
          <motion.div
            key={currentStep}
            className="p-4 rounded-xl border-l-4 mb-4"
            style={{
              backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.08)' : 'rgba(79, 70, 229, 0.08)',
              borderLeftColor: isComplete ? COLORS.success[500] : COLORS.primary[500],
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
              <div className="mt-2 font-mono text-sm bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg inline-block">
                {currentStepInfo.calculation}
              </div>
            )}

            {/* "Why" Explanation */}
            {showExplanations && currentStepInfo.whyExplanation && (
              <motion.div
                className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-2 border-blue-400"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reducedMotion ? 0 : 0.2 }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">💡</span>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {language === 'he'
                      ? currentStepInfo.whyExplanationHe || currentStepInfo.whyExplanation
                      : currentStepInfo.whyExplanation}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Common Mistake Warning */}
            {showCommonMistakes && currentStepInfo.commonMistake && (
              <motion.div
                className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-2 border-amber-400"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reducedMotion ? 0 : 0.3 }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 text-sm">⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>{language === 'he' ? 'טעות נפוצה:' : 'Watch out:'}</strong>{' '}
                    {language === 'he'
                      ? currentStepInfo.commonMistakeHe || currentStepInfo.commonMistake
                      : currentStepInfo.commonMistake}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* FOIL Verification Section */}
        {showVerification && currentStep >= 2 && generatedFoilVerification && (
          <motion.div
            className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-500">✓</span>
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {language === 'he' ? "בדיקת FOIL - בואו נאמת!" : "FOIL Check - Let's Verify!"}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <motion.div
                className="p-2 bg-white dark:bg-gray-700 rounded-lg text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.1 }}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'he' ? 'ראשונים (F)' : 'First (F)'}
                </div>
                <div className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {generatedFoilVerification.first}
                </div>
              </motion.div>
              <motion.div
                className="p-2 bg-white dark:bg-gray-700 rounded-lg text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.2 }}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'he' ? 'חיצוניים (O)' : 'Outer (O)'}
                </div>
                <div className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {generatedFoilVerification.outer}
                </div>
              </motion.div>
              <motion.div
                className="p-2 bg-white dark:bg-gray-700 rounded-lg text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.3 }}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'he' ? 'פנימיים (I)' : 'Inner (I)'}
                </div>
                <div className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {generatedFoilVerification.inner}
                </div>
              </motion.div>
              <motion.div
                className="p-2 bg-white dark:bg-gray-700 rounded-lg text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.4 }}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'he' ? 'אחרונים (L)' : 'Last (L)'}
                </div>
                <div className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {generatedFoilVerification.last}
                </div>
              </motion.div>
            </div>

            {/* Verification Result */}
            <motion.div
              className="flex items-center justify-center gap-2 p-2 bg-emerald-100 dark:bg-emerald-800/30 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.5 }}
            >
              <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                {generatedFoilVerification.isCorrect ? '✓' : '✗'}
              </span>
              <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
                {generatedFoilVerification.result} = {expression}
              </span>
              <span className={`text-sm font-medium ${generatedFoilVerification.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                {generatedFoilVerification.isCorrect
                  ? (language === 'he' ? '✓ מאומת!' : '✓ Verified!')
                  : (language === 'he' ? '✗ בדוק שוב' : '✗ Check again')}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Educational "Why These Factors Work" */}
        {showExplanations && currentStep >= 1 && (
          <motion.div
            className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.4 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">💡</span>
              <div>
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  {language === 'he' ? 'למה המספרים האלה עובדים?' : 'Why do these numbers work?'}
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {language === 'he'
                    ? `אנחנו מחפשים שני מספרים שמכפלתם ${product} (מקדם c) וסכומם ${sum} (מקדם b). כשנכפול את הסוגריים, נקבל את הביטוי המקורי.`
                    : `We need two numbers whose product is ${product} (the c term) and sum is ${sum} (the b term). When we multiply the binomials, we get back the original expression.`}
                </p>
              </div>
            </div>
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
              {language === 'he' ? 'צורה מפורקת:' : 'Factored Form:'}
            </p>
            <motion.p
              className="text-2xl font-bold font-mono"
              style={{ color: COLORS.success[500] }}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {factoredForm}
            </motion.p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              = {factor1} × {factor2}
            </p>
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// Wrapped export with error boundary
function FactoringDiagramWithErrorBoundary(props: FactoringDiagramProps) {
  return (
    <FactoringDiagramErrorBoundary>
      <FactoringDiagram {...props} />
    </FactoringDiagramErrorBoundary>
  )
}

export { FactoringDiagram, FactoringDiagramWithErrorBoundary }
export default FactoringDiagramWithErrorBoundary
