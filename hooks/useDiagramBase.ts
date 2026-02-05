'use client'

import { useState, useCallback, useMemo } from 'react'
import { SUBJECT_COLORS, getAdaptiveLineWeight, DIAGRAM_BACKGROUNDS } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'

type DiagramComplexity = 'elementary' | 'middle' | 'high' | 'advanced'

interface UseDiagramBaseOptions {
  totalSteps: number
  subject: SubjectKey
  complexity?: DiagramComplexity
  initialStep?: number
  stepSpotlights?: string[]
  language?: 'en' | 'he'
  onStepChange?: (step: number) => void
}

export function useDiagramBase({
  totalSteps,
  subject,
  complexity = 'middle',
  initialStep = 0,
  stepSpotlights = [],
  language = 'en',
  onStepChange,
}: UseDiagramBaseOptions) {
  const [currentStep, setCurrentStep] = useState(initialStep)

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, totalSteps - 1)
      if (next !== prev) onStepChange?.(next)
      return next
    })
  }, [totalSteps, onStepChange])

  const prev = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0)
      if (next !== prev) onStepChange?.(next)
      return next
    })
  }, [onStepChange])

  const goToStep = useCallback(
    (step: number) => {
      const clamped = Math.max(0, Math.min(step, totalSteps - 1))
      setCurrentStep(clamped)
      onStepChange?.(clamped)
    },
    [totalSteps, onStepChange]
  )

  const colors = useMemo(() => SUBJECT_COLORS[subject], [subject])
  const lineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])
  const isRTL = language === 'he'
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const spotlightElement = stepSpotlights[currentStep] ?? null
  const progress = totalSteps > 1 ? currentStep / (totalSteps - 1) : 1

  return {
    currentStep,
    totalSteps,
    next,
    prev,
    goToStep,
    colors,
    lineWeight,
    isRTL,
    isFirstStep,
    isLastStep,
    spotlightElement,
    progress,
    subject,
    complexity,
    backgrounds: DIAGRAM_BACKGROUNDS,
  }
}
