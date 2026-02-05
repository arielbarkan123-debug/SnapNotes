'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS, getSubjectColor } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// ============================================================================
// Types
// ============================================================================

export interface SystemEquation {
  leftSide: string
  rightSide: string
  color?: string
}

export interface SystemStep {
  step: number
  type: 'setup' | 'multiply' | 'add' | 'subtract' | 'substitute' | 'solve_variable' | 'back_substitute' | 'verify' | 'complete'
  description: string
  descriptionHe?: string
  /** Equations at this step */
  equations: SystemEquation[]
  /** Calculation to highlight */
  calculation?: string
  /** Which equation is being operated on (0-indexed) */
  activeEquation?: number
  /** Variable being solved */
  solvingFor?: string
  /** Result found for a variable */
  found?: { variable: string; value: string }
  highlighted?: boolean
}

export interface SystemsOfEquationsData {
  /** Original equation 1 */
  equation1: string
  /** Original equation 2 */
  equation2: string
  /** Variables being solved */
  variables: string[]
  /** Method used */
  method: 'substitution' | 'elimination' | 'graphical'
  /** Solutions: { x: '2', y: '3' } */
  solutions: Record<string, string>
  /** All steps */
  steps: SystemStep[]
  /** Title */
  title?: string
}

interface SystemsOfEquationsProps {
  data: SystemsOfEquationsData
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
// Component
// ============================================================================

export function SystemsOfEquations({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  animationDuration = 400,
  width = 460,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: SystemsOfEquationsProps) {
  const { equation1, equation2, variables, method, solutions, steps, title } = data
  const reducedMotion = prefersReducedMotion()
  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  void animationDuration // reserved for future animation customization

  const actualTotalSteps = totalStepsProp ?? steps.length
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100
  const isComplete = currentStep >= steps.length - 1

  const visibleSteps = useMemo(() => steps.filter((s) => s.step <= currentStep), [steps, currentStep])
  // currentStepInfo is used for step-specific logic in the render
  const _currentStepInfo = steps[currentStep] || null

  // Found solutions so far
  const foundSolutions = useMemo(() => {
    const found: Record<string, string> = {}
    for (const step of visibleSteps) {
      if (step.found) {
        found[step.found.variable] = step.found.value
      }
    }
    return found
  }, [visibleSteps])

  // Animation variants
  const equationVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 },
    },
    active: {
      scale: 1.02,
      boxShadow: '0 4px 20px rgba(79, 70, 229, 0.2)',
      transition: { type: 'spring', stiffness: 300 },
    },
  }

  const bracketVariants: Variants = {
    hidden: { scaleY: 0, opacity: 0 },
    visible: {
      scaleY: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    },
  }

  // Get method name
  const getMethodName = (): { en: string; he: string } => {
    switch (method) {
      case 'substitution': return { en: 'Substitution Method', he: 'שיטת ההצבה' }
      case 'elimination': return { en: 'Elimination Method', he: 'שיטת החיסור' }
      case 'graphical': return { en: 'Graphical Method', he: 'שיטה גרפית' }
    }
  }

  // Get step type icon
  const getStepIcon = (type: SystemStep['type']): string => {
    const icons: Record<SystemStep['type'], string> = {
      setup: '📝',
      multiply: '✖️',
      add: '➕',
      subtract: '➖',
      substitute: '🔄',
      solve_variable: '🎯',
      back_substitute: '↩️',
      verify: '✅',
      complete: '🎉',
    }
    return icons[type] || '📐'
  }

  // Get step label
  const getStepLabel = (type: SystemStep['type']): { en: string; he: string } => {
    const labels: Record<SystemStep['type'], { en: string; he: string }> = {
      setup: { en: 'Setup', he: 'התחלה' },
      multiply: { en: 'Multiply', he: 'כפל' },
      add: { en: 'Add equations', he: 'חיבור משוואות' },
      subtract: { en: 'Subtract equations', he: 'חיסור משוואות' },
      substitute: { en: 'Substitute', he: 'הצבה' },
      solve_variable: { en: 'Solve for variable', he: 'פתרון למשתנה' },
      back_substitute: { en: 'Back-substitute', he: 'הצבה חוזרת' },
      verify: { en: 'Verify', he: 'אימות' },
      complete: { en: 'Complete!', he: 'הושלם!' },
    }
    return labels[type] || { en: 'Step', he: 'שלב' }
  }

  // Equation colors
  const EQUATION_COLORS = ['#3b82f6', '#8b5cf6'] // blue, purple

  return (
    <div className={`systems-of-equations ${className}`} style={{ width }}>
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
              backgroundColor: method === 'substitution' ? 'rgba(59, 130, 246, 0.15)' : method === 'elimination' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: method === 'substitution' ? '#2563eb' : method === 'elimination' ? '#7c3aed' : '#16a34a',
            }}
          >
            {language === 'he' ? getMethodName().he : getMethodName().en}
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

      {/* Original System */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-5 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
          {language === 'he' ? 'מערכת משוואות:' : 'System of Equations:'}
        </div>

        <div className="flex items-center justify-center gap-4">
          {/* Left bracket */}
          <motion.div
            variants={bracketVariants}
            initial="hidden"
            animate="visible"
            className="text-5xl font-light text-gray-400"
            style={{ lineHeight: 1, marginTop: '-4px' }}
          >
            {'{'}
          </motion.div>

          {/* Equations */}
          <div className="space-y-2">
            <motion.div
              className="font-mono text-lg font-semibold px-3 py-1 rounded-lg"
              style={{ 
                color: EQUATION_COLORS[0],
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {equation1}
            </motion.div>
            <motion.div
              className="font-mono text-lg font-semibold px-3 py-1 rounded-lg"
              style={{ 
                color: EQUATION_COLORS[1],
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {equation2}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Found Solutions Progress */}
      {Object.keys(foundSolutions).length > 0 && (
        <motion.div
          className="flex justify-center gap-4 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {variables.map((v) => (
            <motion.div
              key={v}
              className="text-center"
              layout
            >
              <div
                className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                  foundSolutions[v]
                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700'
                    : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">{v} =</span>
                {foundSolutions[v] ? (
                  <motion.span
                    className="text-lg font-bold text-green-600 dark:text-green-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {foundSolutions[v]}
                  </motion.span>
                ) : (
                  <span className="text-lg text-gray-300 dark:text-gray-500">?</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Steps Card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="space-y-4">
          <AnimatePresence mode="sync">
            {visibleSteps.slice(-3).map((step, _index) => { // Show last 3 steps
              const isCurrentStep = step.step === currentStep
              const stepLabel = getStepLabel(step.type)

              return (
                <motion.div
                  key={`step-${step.step}`}
                  variants={equationVariants}
                  initial="hidden"
                  animate={isCurrentStep ? 'active' : 'visible'}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  className={`
                    relative p-4 rounded-xl transition-all duration-300
                    ${isCurrentStep
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-300 dark:border-violet-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 opacity-70'
                    }
                  `}
                >
                  {/* Step badge */}
                  <motion.div
                    className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    style={{
                      backgroundColor: isCurrentStep ? subjectColors.primary : COLORS.gray[200],
                      color: isCurrentStep ? 'white' : COLORS.gray[500],
                    }}
                  >
                    {getStepIcon(step.type)}
                  </motion.div>

                  {/* Step type label */}
                  {isCurrentStep && (
                    <motion.div
                      className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2 ml-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {language === 'he' ? stepLabel.he : stepLabel.en}
                    </motion.div>
                  )}

                  {/* Equations display */}
                  <div className="space-y-2 mt-2">
                    {step.equations.map((eq, eqIdx) => {
                      const isActive = step.activeEquation === eqIdx
                      const color = eq.color || EQUATION_COLORS[eqIdx] || COLORS.gray[600]

                      return (
                        <motion.div
                          key={`eq-${eqIdx}`}
                          className={`
                            flex items-center justify-center gap-3 font-mono text-base
                            ${isActive && isCurrentStep ? 'font-bold' : ''}
                          `}
                          animate={isActive && isCurrentStep ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <span
                            className={`px-3 py-1 rounded-lg ${
                              isActive && isCurrentStep
                                ? 'bg-violet-100 dark:bg-violet-800/50'
                                : ''
                            }`}
                            style={{ color }}
                          >
                            {eq.leftSide}
                          </span>
                          <span className="text-gray-500">=</span>
                          <span
                            className={`px-3 py-1 rounded-lg ${
                              isActive && isCurrentStep
                                ? 'bg-violet-100 dark:bg-violet-800/50'
                                : ''
                            }`}
                            style={{ color }}
                          >
                            {eq.rightSide}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Variable found indicator */}
                  {step.found && isCurrentStep && (
                    <motion.div
                      className="flex justify-center mt-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700">
                        <span className="text-green-700 dark:text-green-300 font-bold font-mono">
                          {step.found.variable} = {step.found.value}
                        </span>
                        <span className="ml-2">✓</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Calculation */}
                  {step.calculation && isCurrentStep && (
                    <motion.div
                      className="flex justify-center mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="font-mono text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-lg">
                        {step.calculation}
                      </span>
                    </motion.div>
                  )}

                  {/* Description */}
                  {isCurrentStep && (
                    <motion.p
                      className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {language === 'he'
                        ? step.descriptionHe || step.description
                        : step.description}
                    </motion.p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Arrow indicator */}
        {!isComplete && visibleSteps.length > 0 && (
          <motion.div
            className="flex justify-center mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="text-violet-400 text-xl"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ↓
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      {/* Final Solution */}
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
            <p className="text-sm text-green-600 dark:text-green-400 mb-3 font-medium">
              {language === 'he' ? 'פתרון:' : 'Solution:'}
            </p>
            <div className="flex justify-center gap-6">
              {variables.map((v, idx) => (
                <motion.div
                  key={v}
                  className="text-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                    {v} = {solutions[v]}
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {language === 'he' 
                ? `נקודת החיתוך: (${solutions[variables[0]]}, ${solutions[variables[1]]})`
                : `Intersection point: (${solutions[variables[0]]}, ${solutions[variables[1]]})`
              }
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
    </div>
  )
}

export default SystemsOfEquations
