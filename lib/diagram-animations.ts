/**
 * Diagram Animation Utilities
 *
 * Inspired by 3Blue1Brown/Manim principles:
 * - Progressive reveal of elements
 * - Draw animations for paths
 * - Choreographed sequences
 * - Spring physics for natural feel
 *
 * Uses Framer Motion for React integration
 */

import { type Variants, type Transition, type TargetAndTransition } from 'framer-motion'

// ============================================================================
// Animation Types
// ============================================================================

export type AnimationType =
  | 'draw' // Stroke draws progressively (like drawing a line)
  | 'fade' // Opacity transition
  | 'grow' // Scale from center
  | 'growFromPoint' // Scale from specific point
  | 'morph' // Transform between shapes
  | 'highlight' // Pulse/glow effect
  | 'trace' // Follow a path
  | 'cascade' // Sequential multi-element
  | 'slide' // Translate in from direction
  | 'pop' // Scale with overshoot

export type EasingType = 'linear' | 'easeOut' | 'easeInOut' | 'spring' | 'anticipate'

export interface AnimationStep {
  id: string
  type: AnimationType
  delay?: number
  duration?: number
  easing?: EasingType
  target?: string // CSS selector or element ref
}

export interface AnimationSequence {
  steps: AnimationStep[]
  totalDuration: number
  loop?: boolean
}

// ============================================================================
// Framer Motion Transition Presets
// ============================================================================

export const TRANSITIONS = {
  // Spring with slight bounce - great for elements "popping" into place
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 1,
  } as Transition,

  // Gentle spring - for subtle movements
  gentleSpring: {
    type: 'spring',
    stiffness: 150,
    damping: 25,
    mass: 1.2,
  } as Transition,

  // Smooth ease out - for drawing animations
  smooth: {
    type: 'tween',
    duration: 0.6,
    ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
  } as Transition,

  // Fast snap - for UI feedback
  snap: {
    type: 'tween',
    duration: 0.2,
    ease: 'easeOut',
  } as Transition,

  // Draw animation - for SVG paths
  draw: (duration: number = 0.8) =>
    ({
      type: 'tween',
      duration,
      ease: [0.65, 0, 0.35, 1], // easeInOutCubic
    }) as Transition,

  // Anticipation - wind up before action (like 3B1B)
  anticipate: {
    type: 'tween',
    duration: 0.8,
    ease: [0.36, 0, 0.66, -0.56], // with slight anticipation
  } as Transition,

  // Stagger children
  stagger: (staggerChildren: number = 0.1, delayChildren: number = 0) => ({
    staggerChildren,
    delayChildren,
  }),
}

// ============================================================================
// Framer Motion Variants Presets
// ============================================================================

/**
 * Fade in animation variants
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: TRANSITIONS.smooth,
  },
  exit: { opacity: 0 },
}

/**
 * Scale/grow animation variants
 */
export const growVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: TRANSITIONS.spring,
  },
  exit: { scale: 0, opacity: 0 },
}

/**
 * Pop animation with overshoot
 */
export const popVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
  exit: { scale: 0, opacity: 0 },
}

/**
 * Slide animations from different directions
 */
export const slideVariants = {
  fromLeft: {
    hidden: { x: -50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: TRANSITIONS.smooth },
  } as Variants,
  fromRight: {
    hidden: { x: 50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: TRANSITIONS.smooth },
  } as Variants,
  fromTop: {
    hidden: { y: -50, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: TRANSITIONS.smooth },
  } as Variants,
  fromBottom: {
    hidden: { y: 50, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: TRANSITIONS.smooth },
  } as Variants,
}

/**
 * Highlight/pulse animation
 */
export const highlightVariants: Variants = {
  idle: { scale: 1 },
  highlight: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.5, 1],
    },
  },
}

/**
 * Container variants for staggered children
 */
export const containerVariants = (staggerTime: number = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerTime,
      delayChildren: 0.1,
    },
  },
})

// ============================================================================
// SVG Path Animation Utilities
// ============================================================================

/**
 * Calculate path length for stroke animation
 * Must be called after element is mounted
 */
export function getPathLength(pathElement: SVGPathElement | null): number {
  if (!pathElement) return 0
  return pathElement.getTotalLength()
}

/**
 * SVG path draw variants
 * Use with pathLength prop on motion.path
 */
export const pathDrawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: TRANSITIONS.draw(),
  },
}

/**
 * Create custom path draw variants with specific duration
 */
export function createPathDrawVariants(duration: number, delay: number = 0): Variants {
  return {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          type: 'tween',
          duration,
          delay,
          ease: [0.65, 0, 0.35, 1],
        },
        opacity: {
          duration: 0.1,
          delay,
        },
      },
    },
  }
}

// ============================================================================
// Animation Orchestration
// ============================================================================

/**
 * Create a choreographed animation sequence
 * Returns delay values for each element
 */
export function createAnimationSequence(
  elements: string[],
  baseDuration: number = 0.3,
  staggerDelay: number = 0.15
): Map<string, { delay: number; duration: number }> {
  const sequence = new Map<string, { delay: number; duration: number }>()
  elements.forEach((element, index) => {
    sequence.set(element, {
      delay: index * staggerDelay,
      duration: baseDuration,
    })
  })
  return sequence
}

/**
 * Physics diagram animation sequence
 * Forces appear in educational order
 */
export const FORCE_ANIMATION_ORDER = ['object', 'weight', 'normal', 'friction', 'tension', 'net']

export function createForceAnimationSequence(
  forces: string[],
  baseDuration: number = 0.4
): Map<string, { delay: number; duration: number }> {
  const ordered = forces.sort((a, b) => {
    const aIndex = FORCE_ANIMATION_ORDER.indexOf(a.toLowerCase())
    const bIndex = FORCE_ANIMATION_ORDER.indexOf(b.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
  return createAnimationSequence(ordered, baseDuration, 0.25)
}

// ============================================================================
// Number/Value Morphing
// ============================================================================

/**
 * Animate between two numbers
 * Uses Framer Motion's animate utility
 */
export function createNumberMorphVariants(
  from: number,
  to: number,
  duration: number = 0.5
): TargetAndTransition {
  return {
    transition: {
      type: 'tween',
      duration,
      ease: 'easeInOut',
    },
  }
}

// ============================================================================
// Glow/Highlight Effects
// ============================================================================

export interface GlowConfig {
  color: string
  intensity?: 'soft' | 'medium' | 'strong'
  animated?: boolean
}

export function createGlowStyle(config: GlowConfig): React.CSSProperties {
  const { color, intensity = 'medium', animated = false } = config

  const shadows = {
    soft: `0 0 10px ${color}40, 0 0 20px ${color}20`,
    medium: `0 0 15px ${color}60, 0 0 30px ${color}30`,
    strong: `0 0 20px ${color}80, 0 0 40px ${color}50, 0 0 60px ${color}30`,
  }

  return {
    filter: `drop-shadow(${shadows[intensity]})`,
    ...(animated && {
      animation: 'glow-pulse 2s ease-in-out infinite',
    }),
  }
}

/**
 * CSS keyframes for glow pulse (add to component style)
 */
export const glowPulseKeyframes = `
  @keyframes glow-pulse {
    0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.4)); }
    50% { filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.7)); }
  }
`

// ============================================================================
// Education-Specific Animations
// ============================================================================

/**
 * "What changed" highlight animation
 * Use when advancing to a new step
 */
export const changeHighlightVariants: Variants = {
  unchanged: { scale: 1, filter: 'brightness(1)' },
  changed: {
    scale: [1, 1.02, 1],
    filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
    transition: {
      duration: 0.5,
      times: [0, 0.3, 1],
    },
  },
}

/**
 * Step reveal animation for progressive disclosure
 */
export const stepRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
}

/**
 * Arrow/vector draw animation
 * Draws the shaft first, then pops the arrowhead
 */
export const arrowVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'tween', duration: 0.5, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
}

export const arrowheadVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
      delay: 0.4, // After shaft draws
    },
  },
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate animation delay based on step index
 */
export function getStepDelay(stepIndex: number, baseDelay: number = 0.1): number {
  return stepIndex * baseDelay
}

/**
 * Check if animations should be reduced (accessibility)
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get transition based on reduced motion preference
 */
export function getAccessibleTransition(
  normalTransition: Transition,
  reducedTransition: Transition = { duration: 0 }
): Transition {
  return prefersReducedMotion() ? reducedTransition : normalTransition
}

const diagramAnimations = {
  TRANSITIONS,
  fadeVariants,
  growVariants,
  popVariants,
  slideVariants,
  highlightVariants,
  containerVariants,
  pathDrawVariants,
  createPathDrawVariants,
  createAnimationSequence,
  createForceAnimationSequence,
  createGlowStyle,
  changeHighlightVariants,
  stepRevealVariants,
  arrowVariants,
  arrowheadVariants,
  getStepDelay,
  prefersReducedMotion,
  getAccessibleTransition,
}

export default diagramAnimations
