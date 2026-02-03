/**
 * Visual Complexity System
 *
 * Defines complexity levels for adaptive visual content based on user's
 * age/grade level. This allows the same concept to be presented differently
 * to elementary students vs. advanced learners.
 *
 * | Level        | Equations | Animation | Concrete Examples | Label Style |
 * |--------------|-----------|-----------|-------------------|-------------|
 * | Elementary   | Hide      | Slow      | Show (objects)    | Simple      |
 * | Middle School| Show      | Normal    | Hide              | Standard    |
 * | High School  | Show      | Fast      | Hide              | Standard    |
 * | Advanced     | Show      | Instant   | Hide (formal)     | Detailed    |
 */

// ============================================================================
// Types
// ============================================================================

export type VisualComplexityLevel = 'elementary' | 'middle_school' | 'high_school' | 'advanced'

export interface ComplexityLevelConfig {
  /** Display name for the level */
  name: string
  /** Description for settings UI */
  description: string
  /** Grade range (for display) */
  gradeRange: string
  /** Whether to show mathematical equations */
  showEquations: boolean
  /** Whether to show concrete examples (apples, objects, etc.) */
  showConcreteExamples: boolean
  /** Default animation speed for this level */
  defaultAnimationSpeed: 'slow' | 'normal' | 'fast' | 'instant'
  /** Animation duration multiplier (2.0 = slow, 0.5 = fast, 0 = instant) */
  animationMultiplier: number
  /** Label style: simple (single word), standard (phrase), detailed (full description) */
  labelStyle: 'simple' | 'standard' | 'detailed'
  /** Font sizes (larger for younger students) */
  fontSize: {
    small: number
    normal: number
    large: number
    title: number
  }
  /** Colors - brighter/more saturated for younger students */
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  /** Whether to use icons in labels */
  useIcons: boolean
  /** Whether to show step-by-step breakdowns */
  showStepByStep: boolean
  /** Number of steps to show at once */
  stepsAtOnce: number
  /** Concrete example style */
  concreteExampleStyle: 'objects' | 'icons' | 'none'
  /** Math notation style */
  mathNotation: 'simple' | 'standard' | 'formal'
}

export interface ConcreteExample {
  /** Type of concrete representation */
  type: 'objects' | 'icons' | 'number_line' | 'blocks'
  /** Number of items to show */
  count: number
  /** Icon or image identifier */
  icon: string
  /** Label for the example */
  label?: string
}

// ============================================================================
// Complexity Level Configurations
// ============================================================================

export const COMPLEXITY_LEVELS: Record<VisualComplexityLevel, ComplexityLevelConfig> = {
  elementary: {
    name: 'Elementary',
    description: 'Ages 5-10, Grades K-5',
    gradeRange: 'K-5',
    showEquations: false,
    showConcreteExamples: true,
    defaultAnimationSpeed: 'slow',
    animationMultiplier: 2.0,
    labelStyle: 'simple',
    fontSize: {
      small: 14,
      normal: 18,
      large: 24,
      title: 32,
    },
    colors: {
      primary: '#8B5CF6', // Bright purple
      secondary: '#F59E0B', // Warm orange
      accent: '#10B981', // Green
      background: '#FEF3C7', // Warm cream
    },
    useIcons: true,
    showStepByStep: true,
    stepsAtOnce: 1,
    concreteExampleStyle: 'objects',
    mathNotation: 'simple',
  },
  middle_school: {
    name: 'Middle School',
    description: 'Ages 11-13, Grades 6-8',
    gradeRange: '6-8',
    showEquations: true,
    showConcreteExamples: false,
    defaultAnimationSpeed: 'normal',
    animationMultiplier: 1.0,
    labelStyle: 'standard',
    fontSize: {
      small: 12,
      normal: 16,
      large: 20,
      title: 28,
    },
    colors: {
      primary: '#6366F1', // Indigo
      secondary: '#8B5CF6', // Purple
      accent: '#06B6D4', // Cyan
      background: '#F8FAFC', // Light gray
    },
    useIcons: true,
    showStepByStep: true,
    stepsAtOnce: 2,
    concreteExampleStyle: 'icons',
    mathNotation: 'standard',
  },
  high_school: {
    name: 'High School',
    description: 'Ages 14-17, Grades 9-12',
    gradeRange: '9-12',
    showEquations: true,
    showConcreteExamples: false,
    defaultAnimationSpeed: 'fast',
    animationMultiplier: 0.5,
    labelStyle: 'standard',
    fontSize: {
      small: 11,
      normal: 14,
      large: 18,
      title: 24,
    },
    colors: {
      primary: '#4F46E5', // Deep indigo
      secondary: '#7C3AED', // Violet
      accent: '#0EA5E9', // Sky blue
      background: '#F1F5F9', // Slate
    },
    useIcons: false,
    showStepByStep: false,
    stepsAtOnce: 3,
    concreteExampleStyle: 'none',
    mathNotation: 'standard',
  },
  advanced: {
    name: 'Advanced',
    description: 'University, AP, Advanced courses',
    gradeRange: 'College+',
    showEquations: true,
    showConcreteExamples: false,
    defaultAnimationSpeed: 'instant',
    animationMultiplier: 0,
    labelStyle: 'detailed',
    fontSize: {
      small: 10,
      normal: 13,
      large: 16,
      title: 20,
    },
    colors: {
      primary: '#3730A3', // Dark indigo
      secondary: '#5B21B6', // Dark violet
      accent: '#0369A1', // Dark sky
      background: '#E2E8F0', // Gray
    },
    useIcons: false,
    showStepByStep: false,
    stepsAtOnce: 5,
    concreteExampleStyle: 'none',
    mathNotation: 'formal',
  },
}

// ============================================================================
// Concrete Example Generators
// ============================================================================

/**
 * Object icons for concrete examples (elementary level)
 */
export const CONCRETE_ICONS = {
  // Counting objects
  apple: '🍎',
  orange: '🍊',
  banana: '🍌',
  cookie: '🍪',
  star: '⭐',
  heart: '❤️',
  ball: '🔵',
  block: '🟦',
  // For fractions
  pizza: '🍕',
  pie: '🥧',
  cake: '🎂',
  // For money/value
  coin: '🪙',
  dollar: '💵',
  // For grouping
  box: '📦',
  basket: '🧺',
  // For measurement
  ruler: '📏',
  cup: '🥤',
}

/**
 * Generate concrete examples for a number
 */
export function generateConcreteExample(
  value: number,
  context: 'counting' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fraction' = 'counting'
): ConcreteExample {
  // Pick appropriate icon based on context
  const iconMap: Record<string, string> = {
    counting: CONCRETE_ICONS.apple,
    addition: CONCRETE_ICONS.star,
    subtraction: CONCRETE_ICONS.cookie,
    multiplication: CONCRETE_ICONS.block,
    division: CONCRETE_ICONS.pizza,
    fraction: CONCRETE_ICONS.pie,
  }

  return {
    type: 'objects',
    count: Math.min(Math.abs(Math.round(value)), 20), // Cap at 20 for visual clarity
    icon: iconMap[context] || CONCRETE_ICONS.star,
    label: context === 'fraction' ? `${value} pieces` : `${value} items`,
  }
}

/**
 * Generate visual representation for a fraction
 */
export function generateFractionVisual(
  numerator: number,
  denominator: number
): {
  totalParts: number
  filledParts: number
  icon: string
  description: string
} {
  return {
    totalParts: denominator,
    filledParts: numerator,
    icon: denominator <= 8 ? CONCRETE_ICONS.pizza : CONCRETE_ICONS.block,
    description: `${numerator} out of ${denominator} parts`,
  }
}

// ============================================================================
// Label Transformation Functions
// ============================================================================

/**
 * Transform a technical label based on complexity level
 */
export function transformLabel(
  technicalLabel: string,
  complexity: VisualComplexityLevel
): string {
  const config = COMPLEXITY_LEVELS[complexity]

  // Map of technical terms to simpler alternatives
  const simplifications: Record<string, Record<'simple' | 'standard' | 'detailed', string>> = {
    // Math terms
    'coefficient': { simple: 'number', standard: 'coefficient', detailed: 'coefficient (multiplier)' },
    'variable': { simple: 'letter', standard: 'variable', detailed: 'variable (unknown value)' },
    'equation': { simple: 'math problem', standard: 'equation', detailed: 'equation (mathematical statement)' },
    'expression': { simple: 'math', standard: 'expression', detailed: 'algebraic expression' },
    'polynomial': { simple: 'math problem', standard: 'polynomial', detailed: 'polynomial expression' },
    'quadratic': { simple: 'curved line', standard: 'quadratic', detailed: 'quadratic (x² term)' },
    'linear': { simple: 'straight line', standard: 'linear', detailed: 'linear (constant slope)' },
    'parabola': { simple: 'U-shape', standard: 'parabola', detailed: 'parabola (quadratic curve)' },
    'vertex': { simple: 'tip', standard: 'vertex', detailed: 'vertex (turning point)' },
    'slope': { simple: 'steepness', standard: 'slope', detailed: 'slope (rate of change)' },
    'intercept': { simple: 'crossing', standard: 'intercept', detailed: 'intercept (axis crossing)' },
    // Physics terms
    'velocity': { simple: 'speed', standard: 'velocity', detailed: 'velocity (speed + direction)' },
    'acceleration': { simple: 'speeding up', standard: 'acceleration', detailed: 'acceleration (velocity change rate)' },
    'momentum': { simple: 'push', standard: 'momentum', detailed: 'momentum (mass × velocity)' },
    'friction': { simple: 'rubbing', standard: 'friction', detailed: 'friction (resistance force)' },
    'normal force': { simple: 'push back', standard: 'normal force', detailed: 'normal force (perpendicular to surface)' },
    'gravitational': { simple: 'pulling down', standard: 'gravitational', detailed: 'gravitational (due to gravity)' },
    // Geometry terms
    'perpendicular': { simple: 'straight up', standard: 'perpendicular', detailed: 'perpendicular (90° angle)' },
    'parallel': { simple: 'same direction', standard: 'parallel', detailed: 'parallel (never intersecting)' },
    'congruent': { simple: 'same size', standard: 'congruent', detailed: 'congruent (identical in shape and size)' },
    'similar': { simple: 'same shape', standard: 'similar', detailed: 'similar (proportional sides)' },
    'hypotenuse': { simple: 'longest side', standard: 'hypotenuse', detailed: 'hypotenuse (opposite right angle)' },
  }

  // Check if we have a simplification for this label
  const key = technicalLabel.toLowerCase()
  if (simplifications[key]) {
    return simplifications[key][config.labelStyle]
  }

  // If no simplification found, return as-is
  return technicalLabel
}

/**
 * Transform math notation based on complexity level
 */
export function transformMathNotation(
  latex: string,
  complexity: VisualComplexityLevel
): string {
  const config = COMPLEXITY_LEVELS[complexity]

  if (config.mathNotation === 'simple') {
    // Simplify notation for elementary level
    return latex
      .replace(/\\cdot/g, '×') // Use × instead of ·
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 ÷ $2') // Fractions as division
      .replace(/\^2/g, ' squared')
      .replace(/\^3/g, ' cubed')
      .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
  }

  // Standard and formal keep LaTeX as-is
  return latex
}

// ============================================================================
// Grade Detection
// ============================================================================

/**
 * Detect complexity level from grade string
 */
export function detectComplexityFromGrade(grade: string): VisualComplexityLevel | null {
  const gradeNormalized = grade.toLowerCase().trim()

  // Elementary: grades K-5 or year 1-6
  if (/^(k|kindergarten|[1-5]|year\s*[1-6]|grade\s*[1-5]|primary|reception)/i.test(gradeNormalized)) {
    return 'elementary'
  }

  // Middle school: grades 6-8 or year 7-9
  if (/^([6-8]|year\s*(7|8|9)|grade\s*[6-8]|middle|junior)/i.test(gradeNormalized)) {
    return 'middle_school'
  }

  // High school: grades 9-12 or year 10-13
  if (/^(9|1[0-2]|year\s*(1[0-3])|grade\s*(9|1[0-2])|high|ib|a-level|bagrut|gcse)/i.test(gradeNormalized)) {
    return 'high_school'
  }

  // Advanced: university, college, AP
  if (/^(university|college|ap\s|advanced|undergrad|grad|master|phd|freshman|sophomore|junior|senior)/i.test(gradeNormalized)) {
    return 'advanced'
  }

  return null
}

/**
 * Detect complexity level from age
 */
export function detectComplexityFromAge(age: number): VisualComplexityLevel {
  if (age < 11) return 'elementary'
  if (age < 14) return 'middle_school'
  if (age < 18) return 'high_school'
  return 'advanced'
}

// ============================================================================
// Animation Settings
// ============================================================================

/**
 * Get animation settings for a complexity level
 */
export function getAnimationSettings(complexity: VisualComplexityLevel) {
  const config = COMPLEXITY_LEVELS[complexity]

  return {
    /** Base duration in ms */
    baseDuration: 500 * config.animationMultiplier,
    /** Stagger delay between elements */
    stagger: 100 * config.animationMultiplier,
    /** Whether animations are enabled */
    enabled: config.animationMultiplier > 0,
    /** Spring tension (lower = bouncier for kids) */
    springTension: config.animationMultiplier > 1 ? 170 : 300,
    /** Spring friction */
    springFriction: config.animationMultiplier > 1 ? 20 : 26,
    /** Ease function name */
    ease: config.animationMultiplier > 1 ? 'easeOut' : 'easeInOut',
  }
}

// ============================================================================
// Exports
// ============================================================================

export default COMPLEXITY_LEVELS
