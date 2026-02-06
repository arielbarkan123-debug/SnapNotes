/**
 * Shared test setup for diagram component render tests.
 *
 * Import this file at the top of every diagram test to get the standard mocks
 * for framer-motion, next-intl, useDiagramBase, and DiagramStepControls.
 */
import React from 'react'

// ---------------------------------------------------------------------------
// Mock framer-motion
// ---------------------------------------------------------------------------
jest.mock('framer-motion', () => {
  const R = require('react')
  const createMotionComponent = (tag: string) =>
    R.forwardRef((props: any, ref: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, whileInView, whileFocus, whileDrag,
        onAnimationStart, onAnimationComplete,
        layout, layoutId,
        drag, dragConstraints, dragElastic, dragMomentum,
        ...rest
      } = props
      return R.createElement(tag, { ...rest, ref })
    })

  return {
    __esModule: true,
    motion: new Proxy(
      {},
      { get: (_: unknown, tag: string) => createMotionComponent(tag) },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
    useMotionValue: (v: number) => ({ get: () => v, set: jest.fn() }),
    useTransform: () => ({ get: () => 0, set: jest.fn() }),
    useSpring: () => ({ get: () => 0, set: jest.fn() }),
  }
})

// ---------------------------------------------------------------------------
// Mock next-intl
// ---------------------------------------------------------------------------
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// ---------------------------------------------------------------------------
// Mock useDiagramBase hook
// ---------------------------------------------------------------------------
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => ({
    currentStep: opts.initialStep ?? 0,
    totalSteps: opts.totalSteps ?? 3,
    next: jest.fn(),
    prev: jest.fn(),
    goToStep: jest.fn(),
    isFirstStep: (opts.initialStep ?? 0) === 0,
    isLastStep: (opts.initialStep ?? 0) === (opts.totalSteps ?? 3) - 1,
    progress: 0,
    spotlightElement: null,
    isRTL: opts.language === 'he',
    lineWeight: 2,
    colors: {
      primary: '#6366f1',
      dark: '#4338ca',
      light: '#c7d2fe',
      bg: '#eef2ff',
      accent: '#f59e0b',
      highlight: '#fbbf24',
    },
  }),
}))

// ---------------------------------------------------------------------------
// Mock DiagramStepControls (renders nothing meaningful in unit tests)
// ---------------------------------------------------------------------------
jest.mock('@/components/diagrams/DiagramStepControls', () => ({
  DiagramStepControls: () => null,
}))

// ---------------------------------------------------------------------------
// Mock diagram-animations (return simple variant objects)
// ---------------------------------------------------------------------------
jest.mock('@/lib/diagram-animations', () => ({
  createSpotlightVariants: () => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    spotlight: { opacity: 1 },
  }),
  lineDrawVariants: { hidden: { pathLength: 0 }, visible: { pathLength: 1 } },
  labelAppearVariants: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  createPathDrawVariants: () => ({
    hidden: { pathLength: 0 },
    visible: { pathLength: 1 },
  }),
}))

// ---------------------------------------------------------------------------
// Mock diagram-theme (re-export real colors used by tests)
// ---------------------------------------------------------------------------
jest.mock('@/lib/diagram-theme', () => ({
  SUBJECT_COLORS: {
    math: {
      primary: '#6366f1',
      dark: '#4338ca',
      light: '#c7d2fe',
      bg: '#eef2ff',
      accent: '#f59e0b',
      highlight: '#fbbf24',
    },
    science: {
      primary: '#10b981',
      dark: '#059669',
      light: '#a7f3d0',
      bg: '#ecfdf5',
      accent: '#3b82f6',
      highlight: '#93c5fd',
    },
  },
  getAdaptiveLineWeight: () => 2,
  DIAGRAM_BACKGROUNDS: {},
  hexToRgba: (hex: string, alpha: number) => `rgba(99,102,241,${alpha})`,
}))

// ---------------------------------------------------------------------------
// Mock visual-complexity
// ---------------------------------------------------------------------------
jest.mock('@/lib/visual-complexity', () => ({}))

// ---------------------------------------------------------------------------
// Mock mathjs (used by LimitVisualization and ParametricCurve)
// ---------------------------------------------------------------------------
jest.mock('mathjs', () => ({
  evaluate: (expr: string, scope: Record<string, number>) => {
    // Minimal safe evaluator for test data
    const x = scope.x ?? scope.t ?? 0
    try {
      // Handle common expressions used in test data
      if (expr === 'x^2') return x * x
      if (expr === '2*cos(t)') return 2 * Math.cos(x)
      if (expr === '2*sin(t)') return 2 * Math.sin(x)
      if (expr === '(x^2 - 1)/(x - 1)') {
        if (x === 1) return Infinity
        return (x * x - 1) / (x - 1)
      }
      // Fallback: return x for unknown expressions
      return x
    } catch {
      return 0
    }
  },
}))
