'use client'

import { useMemo, useCallback } from 'react'
import { useVisuals, type VisualComplexity } from '@/contexts/VisualsContext'
import {
  COMPLEXITY_LEVELS,
  type VisualComplexityLevel,
  type ComplexityLevelConfig,
  type ConcreteExample,
  generateConcreteExample,
  generateFractionVisual,
  transformLabel,
  transformMathNotation,
  getAnimationSettings,
} from '@/lib/visual-complexity'

// ============================================================================
// Types
// ============================================================================

export interface UseVisualComplexityOptions {
  /** Override the complexity level */
  forceComplexity?: VisualComplexity
}

export interface UseVisualComplexityReturn {
  /** Current complexity level */
  complexity: VisualComplexityLevel
  /** Full configuration for the current level */
  config: ComplexityLevelConfig
  /** Whether to show equations */
  showEquations: boolean
  /** Whether to show concrete examples */
  showConcreteExamples: boolean
  /** Font sizes for the current level */
  fontSize: ComplexityLevelConfig['fontSize']
  /** Colors for the current level */
  colors: ComplexityLevelConfig['colors']
  /** Label style for the current level */
  labelStyle: ComplexityLevelConfig['labelStyle']
  /** Whether to use icons in labels */
  useIcons: boolean
  /** Whether to show step-by-step breakdowns */
  showStepByStep: boolean
  /** Number of steps to show at once */
  stepsAtOnce: number
  /** Concrete example style */
  concreteExampleStyle: ComplexityLevelConfig['concreteExampleStyle']
  /** Math notation style */
  mathNotation: ComplexityLevelConfig['mathNotation']
  /** Animation settings for the current level */
  animation: {
    baseDuration: number
    stagger: number
    enabled: boolean
    springTension: number
    springFriction: number
    ease: string
  }
  /** Transform a technical label for the current complexity level */
  transformLabel: (technicalLabel: string) => string
  /** Transform math notation for the current complexity level */
  transformMathNotation: (latex: string) => string
  /** Generate concrete example for a number */
  generateConcreteExample: (
    value: number,
    context?: 'counting' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fraction'
  ) => ConcreteExample
  /** Generate visual representation for a fraction */
  generateFractionVisual: (numerator: number, denominator: number) => {
    totalParts: number
    filledParts: number
    icon: string
    description: string
  }
  /** Get scaled animation duration */
  getAnimationDuration: (baseDuration: number) => number
  /** Whether preferences are still loading */
  isLoading: boolean
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useVisualComplexity - Hook for accessing visual complexity settings
 *
 * This hook provides age-adaptive visual settings for diagram components.
 * It automatically selects the appropriate complexity based on user profile
 * and provides helper functions for transforming content.
 *
 * @example
 * const {
 *   complexity,
 *   showEquations,
 *   fontSize,
 *   transformLabel,
 *   generateConcreteExample,
 * } = useVisualComplexity()
 *
 * // Render based on complexity
 * return showEquations
 *   ? <MathEquation latex={equation} />
 *   : <ConcreteExample {...generateConcreteExample(value, 'addition')} />
 *
 * @example
 * // Force a specific complexity level
 * const { config } = useVisualComplexity({ forceComplexity: 'elementary' })
 */
export function useVisualComplexity(
  options: UseVisualComplexityOptions = {}
): UseVisualComplexityReturn {
  const { preferences, isLoading, getAnimationDuration: getAnimDuration } = useVisuals()
  const { forceComplexity } = options

  // Determine effective complexity
  const complexity = (forceComplexity || preferences.complexity) as VisualComplexityLevel

  // Get the full configuration for this level
  const config = COMPLEXITY_LEVELS[complexity]

  // Get animation settings
  const animation = useMemo(() => getAnimationSettings(complexity), [complexity])

  // Memoized transform functions bound to current complexity
  const transformLabelMemo = useCallback(
    (technicalLabel: string) => transformLabel(technicalLabel, complexity),
    [complexity]
  )

  const transformMathNotationMemo = useCallback(
    (latex: string) => transformMathNotation(latex, complexity),
    [complexity]
  )

  // Get animation duration based on user preference (may differ from level default)
  const getAnimationDuration = useCallback(
    (baseDuration: number) => getAnimDuration(baseDuration),
    [getAnimDuration]
  )

  return {
    complexity,
    config,
    showEquations: preferences.showEquations,
    showConcreteExamples: preferences.showConcreteExamples,
    fontSize: config.fontSize,
    colors: config.colors,
    labelStyle: config.labelStyle,
    useIcons: config.useIcons,
    showStepByStep: config.showStepByStep,
    stepsAtOnce: config.stepsAtOnce,
    concreteExampleStyle: config.concreteExampleStyle,
    mathNotation: config.mathNotation,
    animation,
    transformLabel: transformLabelMemo,
    transformMathNotation: transformMathNotationMemo,
    generateConcreteExample,
    generateFractionVisual,
    getAnimationDuration,
    isLoading,
  }
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * useComplexityColors - Get colors appropriate for the complexity level
 */
export function useComplexityColors() {
  const { colors, complexity } = useVisualComplexity()

  return useMemo(() => ({
    ...colors,
    complexity,
    // Derived colors
    primaryLight: colors.primary + '33', // 20% opacity
    primaryDark: colors.primary,
    secondaryLight: colors.secondary + '33',
    secondaryDark: colors.secondary,
  }), [colors, complexity])
}

/**
 * useComplexityFonts - Get font sizes appropriate for the complexity level
 */
export function useComplexityFonts() {
  const { fontSize, complexity } = useVisualComplexity()

  return useMemo(() => ({
    ...fontSize,
    complexity,
    // CSS classes for each size
    smallClass: `text-[${fontSize.small}px]`,
    normalClass: `text-[${fontSize.normal}px]`,
    largeClass: `text-[${fontSize.large}px]`,
    titleClass: `text-[${fontSize.title}px]`,
  }), [fontSize, complexity])
}

/**
 * useComplexityAnimations - Get animation settings for the complexity level
 */
export function useComplexityAnimations(baseDuration = 500, baseStagger = 100) {
  const { animation, getAnimationDuration } = useVisualComplexity()

  return useMemo(() => ({
    ...animation,
    // Calculated values
    duration: getAnimationDuration(baseDuration),
    stagger: getAnimationDuration(baseStagger),
    // Framer Motion spring config
    spring: {
      type: 'spring' as const,
      stiffness: animation.springTension,
      damping: animation.springFriction,
    },
    // Framer Motion transition config
    transition: {
      duration: animation.enabled ? getAnimationDuration(baseDuration) / 1000 : 0,
      ease: animation.ease,
    },
  }), [animation, baseDuration, baseStagger, getAnimationDuration])
}

/**
 * useConcreteExamples - Hook for components that show concrete examples
 */
export function useConcreteExamples() {
  const { showConcreteExamples, concreteExampleStyle, complexity } = useVisualComplexity()

  return useMemo(() => ({
    /** Whether to show concrete examples at all */
    shouldShow: showConcreteExamples && concreteExampleStyle !== 'none',
    /** The style to use */
    style: concreteExampleStyle,
    /** Current complexity level */
    complexity,
    /** Generate example for a value */
    generate: (
      value: number,
      context: 'counting' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fraction' = 'counting'
    ) => generateConcreteExample(value, context),
    /** Generate fraction visual */
    generateFraction: (numerator: number, denominator: number) =>
      generateFractionVisual(numerator, denominator),
  }), [showConcreteExamples, concreteExampleStyle, complexity])
}

/**
 * useMathDisplay - Hook for components that display math notation
 */
export function useMathDisplay() {
  const { showEquations, mathNotation, transformMathNotation, complexity } = useVisualComplexity()

  return useMemo(() => ({
    /** Whether to show equations */
    shouldShow: showEquations,
    /** Math notation style */
    notation: mathNotation,
    /** Current complexity level */
    complexity,
    /** Transform LaTeX for display */
    transform: transformMathNotation,
    /** Whether to use KaTeX (formal notation) or simplified text */
    useKaTeX: mathNotation !== 'simple',
  }), [showEquations, mathNotation, transformMathNotation, complexity])
}

/**
 * useAdaptiveLabels - Hook for components that display technical labels
 */
export function useAdaptiveLabels() {
  const { labelStyle, useIcons, transformLabel, complexity, fontSize } = useVisualComplexity()

  return useMemo(() => ({
    /** Current label style */
    style: labelStyle,
    /** Whether to include icons */
    useIcons,
    /** Current complexity level */
    complexity,
    /** Font size for labels */
    fontSize: fontSize.normal,
    /** Transform a technical label */
    transform: transformLabel,
    /** Get CSS class for label style */
    className: labelStyle === 'simple'
      ? 'font-medium'
      : labelStyle === 'detailed'
        ? 'font-normal text-sm'
        : 'font-medium',
  }), [labelStyle, useIcons, transformLabel, complexity, fontSize])
}

// ============================================================================
// Default Export
// ============================================================================

export default useVisualComplexity
