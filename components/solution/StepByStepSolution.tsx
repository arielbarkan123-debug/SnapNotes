'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type Solution,
  type SolutionStep,
  type SolutionDisplayConfig,
  type NavigationState,
  type UserLevel,
  DEFAULT_DISPLAY_CONFIG,
  filterStepsForLevel,
  SUBJECT_COLORS,
} from '@/types/solution'
import { SolutionStepComponent } from './SolutionStep'
import { StepNavigation } from './StepNavigation'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface StepByStepSolutionProps {
  /** The solution to display */
  solution: Solution
  /** Display configuration */
  config?: Partial<SolutionDisplayConfig>
  /** Callback when step changes */
  onStepChange?: (stepIndex: number, step: SolutionStep) => void
  /** Callback when solution is completed */
  onComplete?: () => void
  /** Override current step */
  currentStepOverride?: number
  /** Additional className */
  className?: string
}

/**
 * StepByStepSolution - Main container for visual step-by-step learning
 *
 * Features:
 * - Progressive step reveal with animations
 * - User level-based step filtering
 * - Auto-play mode for passive learning
 * - Diagram integration for visual learning
 * - Multi-language support (EN/HE)
 */
export function StepByStepSolution({
  solution,
  config: configOverride,
  onStepChange,
  onComplete,
  currentStepOverride,
  className = '',
}: StepByStepSolutionProps) {
  // Merge config with defaults
  const config: SolutionDisplayConfig = useMemo(
    () => ({ ...DEFAULT_DISPLAY_CONFIG, ...configOverride }),
    [configOverride]
  )

  const reducedMotion = prefersReducedMotion()
  const subjectColors = SUBJECT_COLORS[solution.subject]

  // Filter steps based on user level
  const visibleSteps = useMemo(
    () => filterStepsForLevel(solution.steps, config.userLevel),
    [solution.steps, config.userLevel]
  )

  // Navigation state
  const [navState, setNavState] = useState<NavigationState>({
    currentStep: currentStepOverride ?? 0,
    totalVisibleSteps: visibleSteps.length,
    isPlaying: false,
    completed: false,
    viewedSteps: new Set([0]),
  })

  // Current step index (use override if provided)
  const currentStepIndex = currentStepOverride ?? navState.currentStep
  const currentStep = visibleSteps[currentStepIndex]

  // Update state when override changes
  useEffect(() => {
    if (currentStepOverride !== undefined) {
      setNavState(prev => ({
        ...prev,
        currentStep: currentStepOverride,
        viewedSteps: new Set([...prev.viewedSteps, currentStepOverride]),
      }))
    }
  }, [currentStepOverride])

  // Update total steps when level changes
  useEffect(() => {
    setNavState(prev => ({
      ...prev,
      totalVisibleSteps: visibleSteps.length,
    }))
  }, [visibleSteps.length])

  // Navigation handlers - defined before the useEffect that uses them
  const goToStep = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, visibleSteps.length - 1))
    const step = visibleSteps[clampedIndex]

    setNavState(prev => ({
      ...prev,
      currentStep: clampedIndex,
      viewedSteps: new Set([...prev.viewedSteps, clampedIndex]),
      completed: clampedIndex === visibleSteps.length - 1,
    }))

    onStepChange?.(clampedIndex, step)
  }, [visibleSteps, onStepChange])

  // Auto-play logic
  useEffect(() => {
    if (!navState.isPlaying) return

    const timer = setTimeout(() => {
      if (currentStepIndex < visibleSteps.length - 1) {
        goToStep(currentStepIndex + 1)
      } else {
        setNavState(prev => ({ ...prev, isPlaying: false, completed: true }))
        onComplete?.()
      }
    }, config.autoPlayDelay)

    return () => clearTimeout(timer)
  }, [navState.isPlaying, currentStepIndex, visibleSteps.length, config.autoPlayDelay, goToStep, onComplete])

  const handleNext = useCallback(() => {
    if (currentStepIndex < visibleSteps.length - 1) {
      goToStep(currentStepIndex + 1)
    } else {
      onComplete?.()
    }
  }, [currentStepIndex, visibleSteps.length, goToStep, onComplete])

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1)
    }
  }, [currentStepIndex, goToStep])

  const handlePlayPause = useCallback(() => {
    setNavState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [])

  const handleStepClick = useCallback((index: number) => {
    goToStep(index)
    setNavState(prev => ({ ...prev, isPlaying: false }))
  }, [goToStep])

  // Level change handler
  const handleLevelChange = useCallback((_level: UserLevel) => {
    // This would typically update config through a parent component
    // For now, we'll just reset to step 0
    setNavState(prev => ({
      ...prev,
      currentStep: 0,
      viewedSteps: new Set([0]),
      completed: false,
    }))
  }, [])

  // Calculate progress
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg ${className}`}>
      {/* Header */}
      <div className="solution-header mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Subject indicator */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: subjectColors.bg }}
            >
              <span
                className="text-lg font-bold"
                style={{ color: subjectColors.primary }}
              >
                {solution.subject[0].toUpperCase()}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                {config.language === 'he' ? solution.problemHe || solution.problem : solution.problem}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.language === 'he' ? 'שלב' : 'Step'} {currentStepIndex + 1} / {visibleSteps.length}
              </p>
            </div>
          </div>

          {/* User level selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {config.language === 'he' ? 'רמה:' : 'Level:'}
            </span>
            <select
              value={config.userLevel}
              onChange={(e) => handleLevelChange(e.target.value as UserLevel)}
              className="text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-md px-2 py-1"
            >
              <option value="beginner">{config.language === 'he' ? 'מתחיל' : 'Beginner'}</option>
              <option value="intermediate">{config.language === 'he' ? 'בינוני' : 'Intermediate'}</option>
              <option value="advanced">{config.language === 'he' ? 'מתקדם' : 'Advanced'}</option>
            </select>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: subjectColors.primary }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="solution-content">
        <AnimatePresence mode="wait">
          {currentStep && (
            <SolutionStepComponent
              key={currentStep.id}
              step={currentStep}
              subject={solution.subject}
              language={config.language}
              animate={config.animate && !reducedMotion}
              animationDuration={config.animationDuration}
              showHint={config.showHints}
              showEstimatedTime={config.showEstimatedTime}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <StepNavigation
        currentStep={currentStepIndex}
        totalSteps={visibleSteps.length}
        isPlaying={navState.isPlaying}
        completed={navState.completed}
        viewedSteps={navState.viewedSteps}
        subjectColor={subjectColors.primary}
        language={config.language}
        onPrev={handlePrev}
        onNext={handleNext}
        onPlayPause={handlePlayPause}
        onStepClick={handleStepClick}
      />

      {/* Answer reveal (on completion) */}
      <AnimatePresence>
        {navState.completed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-lg"
            style={{ backgroundColor: subjectColors.bg }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-lg"
                style={{ color: subjectColors.primary }}
              >
                {config.language === 'he' ? 'תשובה סופית:' : 'Final Answer:'}
              </span>
            </div>
            <p
              className="text-xl font-bold"
              style={{ color: subjectColors.primary }}
            >
              {config.language === 'he' ? solution.answerHe || solution.answer : solution.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default StepByStepSolution
