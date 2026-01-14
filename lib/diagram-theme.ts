/**
 * Unified Diagram Design System
 *
 * Inspired by Desmos, GeoGebra, and modern data visualization tools.
 * Provides consistent visual language across all diagram types.
 *
 * Design Principles:
 * - Professional aesthetics with subtle gradients and shadows
 * - High contrast for readability
 * - Consistent color semantics
 * - Dark mode support
 * - Accessibility considerations
 */

// ============================================================================
// Color Palette
// ============================================================================

export const COLORS = {
  // Primary brand colors
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Base
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Success/positive (answers, completion)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Base
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Error/warning
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Base
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Warning/attention
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Base
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
}

// ============================================================================
// Physics Force Colors (Semantic)
// ============================================================================

export const FORCE_COLORS = {
  // Gravitational/Weight - green (pointing down, natural)
  weight: {
    primary: '#22c55e',
    light: '#4ade80',
    dark: '#15803d',
    gradient: 'linear-gradient(180deg, #4ade80 0%, #15803d 100%)',
  },

  // Normal force - blue (perpendicular, reactive)
  normal: {
    primary: '#3b82f6',
    light: '#60a5fa',
    dark: '#1d4ed8',
    gradient: 'linear-gradient(0deg, #60a5fa 0%, #1d4ed8 100%)',
  },

  // Friction - red (opposing motion)
  friction: {
    primary: '#ef4444',
    light: '#f87171',
    dark: '#b91c1c',
    gradient: 'linear-gradient(90deg, #f87171 0%, #b91c1c 100%)',
  },

  // Tension - amber/gold (pulling, rope-like)
  tension: {
    primary: '#f59e0b',
    light: '#fbbf24',
    dark: '#b45309',
    gradient: 'linear-gradient(45deg, #fbbf24 0%, #b45309 100%)',
  },

  // Applied force - purple (external)
  applied: {
    primary: '#8b5cf6',
    light: '#a78bfa',
    dark: '#6d28d9',
    gradient: 'linear-gradient(45deg, #a78bfa 0%, #6d28d9 100%)',
  },

  // Net force - cyan (resultant)
  net: {
    primary: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    gradient: 'linear-gradient(45deg, #22d3ee 0%, #0891b2 100%)',
  },

  // Spring force - teal
  spring: {
    primary: '#14b8a6',
    light: '#2dd4bf',
    dark: '#0d9488',
    gradient: 'linear-gradient(45deg, #2dd4bf 0%, #0d9488 100%)',
  },
}

// ============================================================================
// Math Operation Colors
// ============================================================================

export const MATH_OPERATION_COLORS = {
  // Addition - blue
  add: {
    primary: '#3b82f6',
    bg: '#dbeafe',
    bgDark: '#1e3a5f',
  },

  // Subtraction - red
  subtract: {
    primary: '#ef4444',
    bg: '#fee2e2',
    bgDark: '#5f1e1e',
  },

  // Multiplication - green
  multiply: {
    primary: '#22c55e',
    bg: '#dcfce7',
    bgDark: '#1e5f2e',
  },

  // Division - amber
  divide: {
    primary: '#f59e0b',
    bg: '#fef3c7',
    bgDark: '#5f4a1e',
  },

  // Equals/result - purple
  equals: {
    primary: '#8b5cf6',
    bg: '#ede9fe',
    bgDark: '#3b2e5f',
  },
}

// ============================================================================
// Geometry Colors
// ============================================================================

export const GEOMETRY_COLORS = {
  // Points
  point: '#6366f1',
  pointHighlight: '#818cf8',

  // Lines and segments
  line: '#374151',
  lineLight: '#6b7280',
  segment: '#3b82f6',

  // Angles
  angle: '#f59e0b',
  angleArc: '#fde68a',

  // Areas/fills
  fill: 'rgba(99, 102, 241, 0.15)',
  fillHighlight: 'rgba(99, 102, 241, 0.25)',

  // Construction (dashed lines, helpers)
  construction: '#9ca3af',
  constructionDark: '#6b7280',

  // Grid
  gridMajor: '#d1d5db',
  gridMinor: '#e5e7eb',
  gridMajorDark: '#374151',
  gridMinorDark: '#4b5563',

  // Axes
  axis: '#374151',
  axisDark: '#d1d5db',
}

// ============================================================================
// Shadows (Desmos-style depth)
// ============================================================================

export const SHADOWS = {
  // Subtle elevation
  soft: '0 2px 8px rgba(0, 0, 0, 0.06)',

  // Card-like elevation
  card: '0 4px 20px rgba(0, 0, 0, 0.08)',

  // Prominent elevation
  elevated: '0 8px 30px rgba(0, 0, 0, 0.12)',

  // Inset (for recessed elements)
  inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',

  // Glow effects (for highlights)
  glow: (color: string, intensity: number = 0.4) =>
    `0 0 20px ${hexToRgba(color, intensity)}`,

  // Focus ring
  focus: (color: string = COLORS.primary[500]) =>
    `0 0 0 3px ${hexToRgba(color, 0.3)}`,
}

// ============================================================================
// Gradients
// ============================================================================

export const GRADIENTS = {
  // Subtle background gradients
  background: {
    light: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
    dark: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    paper: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
    paperDark: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
  },

  // Accent gradients
  primary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
}

// ============================================================================
// Typography
// ============================================================================

export const TYPOGRAPHY = {
  fonts: {
    // Math expressions (serif for traditional look)
    math: "'KaTeX_Main', 'Times New Roman', 'Georgia', serif",

    // Labels and UI text
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    // Code and calculations
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
  },

  sizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

// ============================================================================
// Spacing & Sizing
// ============================================================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

export const DIAGRAM_SIZES = {
  // Default diagram dimensions
  default: { width: 400, height: 350 },

  // Compact for inline/mobile
  compact: { width: 300, height: 250 },

  // Large for detail view
  large: { width: 600, height: 500 },

  // Number line (wide, short)
  numberLine: { width: 400, height: 100 },

  // Coordinate plane (square)
  coordinatePlane: { width: 400, height: 400 },
}

// ============================================================================
// Border Radius
// ============================================================================

export const RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
}

// ============================================================================
// Animation Timings
// ============================================================================

export const TIMING = {
  // Quick UI feedback
  fast: 150,

  // Standard transitions
  normal: 300,

  // Drawing/reveal animations
  slow: 600,

  // Complex choreographed animations
  sequence: 800,

  // Delay between sequential elements
  stagger: 150,
}

// ============================================================================
// SVG Stroke Styles
// ============================================================================

export const STROKES = {
  // Line widths
  thin: 1,
  normal: 2,
  thick: 3,
  heavy: 4,

  // Dash patterns
  solid: 'none',
  dashed: '8 4',
  dotted: '2 4',
  dashDot: '8 4 2 4',

  // Line caps
  caps: {
    butt: 'butt' as const,
    round: 'round' as const,
    square: 'square' as const,
  },

  // Line joins
  joins: {
    miter: 'miter' as const,
    round: 'round' as const,
    bevel: 'bevel' as const,
  },
}

// ============================================================================
// Arrow/Vector Styles
// ============================================================================

export const ARROW_STYLES = {
  // Arrowhead dimensions
  head: {
    length: 12,
    width: 8,
  },

  // For larger vectors
  headLarge: {
    length: 16,
    width: 10,
  },

  // Shaft width
  shaft: {
    thin: 2,
    normal: 3,
    thick: 4,
  },
}

// ============================================================================
// Z-Index Layers
// ============================================================================

export const Z_INDEX = {
  grid: 0,
  shapes: 10,
  vectors: 20,
  labels: 30,
  highlights: 40,
  tooltips: 50,
  controls: 60,
}

// ============================================================================
// Dark Mode Support
// ============================================================================

export type ColorMode = 'light' | 'dark'

export function getThemedColor(
  lightColor: string,
  darkColor: string,
  mode: ColorMode = 'light'
): string {
  return mode === 'dark' ? darkColor : lightColor
}

export const THEMED = {
  background: (mode: ColorMode) =>
    mode === 'dark' ? COLORS.gray[900] : COLORS.gray[50],

  surface: (mode: ColorMode) =>
    mode === 'dark' ? COLORS.gray[800] : '#ffffff',

  text: (mode: ColorMode) =>
    mode === 'dark' ? COLORS.gray[100] : COLORS.gray[900],

  textMuted: (mode: ColorMode) =>
    mode === 'dark' ? COLORS.gray[400] : COLORS.gray[500],

  border: (mode: ColorMode) =>
    mode === 'dark' ? COLORS.gray[700] : COLORS.gray[200],

  gridMajor: (mode: ColorMode) =>
    mode === 'dark' ? GEOMETRY_COLORS.gridMajorDark : GEOMETRY_COLORS.gridMajor,

  gridMinor: (mode: ColorMode) =>
    mode === 'dark' ? GEOMETRY_COLORS.gridMinorDark : GEOMETRY_COLORS.gridMinor,
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert hex color to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Lighten a color
 */
export function lighten(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = Math.min(255, parseInt(result[1], 16) + Math.round(255 * amount))
  const g = Math.min(255, parseInt(result[2], 16) + Math.round(255 * amount))
  const b = Math.min(255, parseInt(result[3], 16) + Math.round(255 * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Darken a color
 */
export function darken(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = Math.max(0, parseInt(result[1], 16) - Math.round(255 * amount))
  const g = Math.max(0, parseInt(result[2], 16) - Math.round(255 * amount))
  const b = Math.max(0, parseInt(result[3], 16) - Math.round(255 * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Get force color by type
 */
export function getForceColor(forceType: string): typeof FORCE_COLORS.weight {
  const type = forceType.toLowerCase()
  if (type.includes('weight') || type.includes('gravity') || type.includes('mg')) {
    return FORCE_COLORS.weight
  }
  if (type.includes('normal') || type.includes('n')) {
    return FORCE_COLORS.normal
  }
  if (type.includes('friction') || type.includes('f')) {
    return FORCE_COLORS.friction
  }
  if (type.includes('tension') || type.includes('t')) {
    return FORCE_COLORS.tension
  }
  if (type.includes('applied') || type.includes('push') || type.includes('pull')) {
    return FORCE_COLORS.applied
  }
  if (type.includes('net') || type.includes('resultant')) {
    return FORCE_COLORS.net
  }
  if (type.includes('spring') || type.includes('elastic')) {
    return FORCE_COLORS.spring
  }
  // Default to applied
  return FORCE_COLORS.applied
}

/**
 * Create SVG gradient definition
 */
export function createGradientDef(
  id: string,
  startColor: string,
  endColor: string,
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'vertical'
): string {
  const coords = {
    horizontal: { x1: '0%', y1: '50%', x2: '100%', y2: '50%' },
    vertical: { x1: '50%', y1: '0%', x2: '50%', y2: '100%' },
    diagonal: { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
  }[direction]

  return `
    <linearGradient id="${id}" ${Object.entries(coords)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')}>
      <stop offset="0%" stop-color="${startColor}" />
      <stop offset="100%" stop-color="${endColor}" />
    </linearGradient>
  `
}

// ============================================================================
// Theme Export
// ============================================================================

export const DIAGRAM_THEME = {
  colors: COLORS,
  forces: FORCE_COLORS,
  mathOps: MATH_OPERATION_COLORS,
  geometry: GEOMETRY_COLORS,
  shadows: SHADOWS,
  gradients: GRADIENTS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  sizes: DIAGRAM_SIZES,
  radius: RADIUS,
  timing: TIMING,
  strokes: STROKES,
  arrows: ARROW_STYLES,
  zIndex: Z_INDEX,
  themed: THEMED,
}

export default DIAGRAM_THEME
