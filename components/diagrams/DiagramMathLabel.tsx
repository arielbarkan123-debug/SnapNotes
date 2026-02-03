'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import katex from 'katex'
import DOMPurify from 'dompurify'
import { TYPOGRAPHY, COLORS, type ColorMode } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// ============================================================================
// Types
// ============================================================================

export interface DiagramMathLabelProps {
  /** The LaTeX expression to render */
  latex: string
  /** X position in SVG coordinates */
  x: number
  /** Y position in SVG coordinates */
  y: number
  /** Font size in pixels (default: 14) */
  fontSize?: number
  /** Text color (default: gray-700) */
  color?: string
  /** Text anchor alignment */
  textAnchor?: 'start' | 'middle' | 'end'
  /** Vertical alignment */
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'text-top' | 'text-bottom'
  /** Optional animation delay in ms */
  animationDelay?: number
  /** Whether to animate the label appearing */
  animate?: boolean
  /** Color mode for themed colors */
  colorMode?: ColorMode
  /** Additional className for the foreignObject */
  className?: string
  /** Background color for better readability */
  backgroundColor?: string
  /** Padding around the label */
  padding?: number
  /** Whether this is a subscript/superscript (smaller size) */
  isSubscript?: boolean
  /** Custom width for foreignObject (auto-calculated if not provided) */
  width?: number
  /** Custom height for foreignObject (auto-calculated if not provided) */
  height?: number
  /** RTL support - flip text direction */
  rtl?: boolean
}

// ============================================================================
// Animation Variants
// ============================================================================

const labelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Safely sanitize KaTeX HTML output
 * KaTeX output is generally safe, but we sanitize as defense-in-depth
 */
function sanitizeKatexHtml(html: string): string {
  // Configure DOMPurify to allow KaTeX-specific elements and attributes
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'span', 'div', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
      'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd',
      'mtext', 'mspace', 'menclose', 'annotation', 'semantics', 'svg',
      'line', 'path', 'rect', 'g',
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'aria-hidden', 'data-*', 'xmlns', 'mathvariant',
      'height', 'width', 'viewBox', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
      'stroke', 'stroke-width', 'fill', 'transform',
    ],
    ALLOW_DATA_ATTR: true,
  })
}

// ============================================================================
// Component
// ============================================================================

/**
 * DiagramMathLabel - Renders KaTeX math expressions inside SVG diagrams
 *
 * Uses SVG foreignObject to embed HTML (KaTeX-rendered) content within SVG.
 * This allows for beautiful mathematical typography in all diagram types.
 *
 * @example
 * // Simple fraction
 * <DiagramMathLabel latex="\\frac{1}{2}" x={100} y={50} />
 *
 * // Force label with subscript
 * <DiagramMathLabel latex="F_N" x={150} y={75} color="#3b82f6" />
 *
 * // Quadratic equation
 * <DiagramMathLabel latex="y = ax^2 + bx + c" x={200} y={30} fontSize={16} />
 */
export function DiagramMathLabel({
  latex,
  x,
  y,
  fontSize = 14,
  color,
  textAnchor = 'middle',
  dominantBaseline = 'middle',
  animationDelay = 0,
  animate = true,
  colorMode = 'light',
  className = '',
  backgroundColor,
  padding = 4,
  isSubscript = false,
  width: customWidth,
  height: customHeight,
  rtl = false,
}: DiagramMathLabelProps) {
  const reducedMotion = prefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 50, height: 24 })

  // Calculate effective font size
  const effectiveFontSize = isSubscript ? fontSize * 0.75 : fontSize

  // Get default color based on color mode
  const effectiveColor = color || (colorMode === 'dark' ? COLORS.gray[200] : COLORS.gray[700])

  // Render KaTeX to HTML string and sanitize
  const renderedLatex = useMemo(() => {
    try {
      const rawHtml = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
        strict: false,
        trust: true,
        macros: {
          // Common physics macros
          '\\vec': '\\overrightarrow{#1}',
          '\\unit': '\\,\\mathrm{#1}',
          // Common math macros
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
        },
      })
      // Sanitize the output for security
      return sanitizeKatexHtml(rawHtml)
    } catch (error) {
      console.warn('KaTeX rendering error:', error)
      // Fallback to sanitized plain text
      const fallbackHtml = `<span style="font-family: ${TYPOGRAPHY.fonts.math}">${latex}</span>`
      return sanitizeKatexHtml(fallbackHtml)
    }
  }, [latex])

  // Measure the rendered content to size foreignObject correctly
  useEffect(() => {
    if (containerRef.current && !customWidth && !customHeight) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.ceil(rect.width) + padding * 2,
        height: Math.ceil(rect.height) + padding * 2,
      })
    }
  }, [renderedLatex, customWidth, customHeight, padding])

  // Calculate final dimensions
  const finalWidth = customWidth || dimensions.width
  const finalHeight = customHeight || dimensions.height

  // Calculate position offset based on text anchor
  const xOffset = textAnchor === 'middle' ? -finalWidth / 2
    : textAnchor === 'end' ? -finalWidth
    : 0

  // Calculate vertical offset based on dominant baseline
  const yOffset = dominantBaseline === 'middle' ? -finalHeight / 2
    : dominantBaseline === 'hanging' || dominantBaseline === 'text-top' ? 0
    : -finalHeight

  return (
    <motion.foreignObject
      x={x + xOffset}
      y={y + yOffset}
      width={finalWidth}
      height={finalHeight}
      className={className}
      variants={labelVariants}
      initial={animate && !reducedMotion ? 'hidden' : 'visible'}
      animate="visible"
      transition={{ delay: reducedMotion ? 0 : animationDelay / 1000 }}
    >
      <div
        ref={containerRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: `${padding}px`,
          fontSize: `${effectiveFontSize}px`,
          fontFamily: TYPOGRAPHY.fonts.math,
          color: effectiveColor,
          backgroundColor: backgroundColor || 'transparent',
          borderRadius: backgroundColor ? '4px' : undefined,
          direction: rtl ? 'rtl' : 'ltr',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
        dangerouslySetInnerHTML={{ __html: renderedLatex }}
      />
    </motion.foreignObject>
  )
}

// ============================================================================
// Helper Functions for Common Math Expressions
// ============================================================================

/**
 * Formats a fraction as LaTeX
 */
export function formatFraction(numerator: number | string, denominator: number | string): string {
  return `\\frac{${numerator}}{${denominator}}`
}

/**
 * Formats a force label with subscript
 */
export function formatForceLabel(symbol: string, subscript?: string): string {
  if (!subscript) return symbol
  return `${symbol}_{${subscript}}`
}

/**
 * Formats a vector with arrow notation
 */
export function formatVector(name: string): string {
  return `\\vec{${name}}`
}

/**
 * Formats a unit with proper spacing
 */
export function formatWithUnit(value: number | string, unit: string): string {
  return `${value}\\,\\text{${unit}}`
}

/**
 * Formats a polynomial expression
 */
export function formatPolynomial(
  coefficients: { a?: number; b?: number; c?: number },
  variable: string = 'x'
): string {
  const { a = 0, b = 0, c = 0 } = coefficients
  const terms: string[] = []

  if (a !== 0) {
    if (a === 1) terms.push(`${variable}^2`)
    else if (a === -1) terms.push(`-${variable}^2`)
    else terms.push(`${a}${variable}^2`)
  }

  if (b !== 0) {
    if (terms.length > 0) {
      if (b > 0) terms.push(`+ ${b === 1 ? '' : b}${variable}`)
      else terms.push(`- ${b === -1 ? '' : Math.abs(b)}${variable}`)
    } else {
      if (b === 1) terms.push(variable)
      else if (b === -1) terms.push(`-${variable}`)
      else terms.push(`${b}${variable}`)
    }
  }

  if (c !== 0) {
    if (terms.length > 0) {
      if (c > 0) terms.push(`+ ${c}`)
      else terms.push(`- ${Math.abs(c)}`)
    } else {
      terms.push(`${c}`)
    }
  }

  return terms.length > 0 ? terms.join(' ') : '0'
}

/**
 * Formats an equation with both sides
 */
export function formatEquation(left: string, right: string): string {
  return `${left} = ${right}`
}

/**
 * Formats angle in degrees with symbol
 */
export function formatAngle(degrees: number): string {
  return `${degrees}°`
}

/**
 * Formats angle in radians
 */
export function formatRadians(radians: string | number): string {
  if (typeof radians === 'number') {
    return `${radians}\\,\\text{rad}`
  }
  return `${radians}\\,\\text{rad}`
}

export default DiagramMathLabel
