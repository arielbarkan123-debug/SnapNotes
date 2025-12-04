'use client'

import { useMemo } from 'react'
import { formatMathInText } from '@/lib/utils/math-format'

interface MathTextProps {
  /** The text content that may contain math expressions */
  children: string
  /** Additional CSS classes */
  className?: string
  /** HTML tag to use for rendering */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label'
}

/**
 * MathText Component
 *
 * Renders text with properly formatted mathematical expressions.
 * Converts plain text notation like x^2, a_1, sqrt(x) into proper
 * Unicode mathematical symbols.
 *
 * @example
 * <MathText>Using the formula x^2 + y^2 = r^2</MathText>
 * // Renders: Using the formula x² + y² = r²
 *
 * @example
 * <MathText>If x >= 5, then x^(n+1) is valid</MathText>
 * // Renders: If x ≥ 5, then x⁽ⁿ⁺¹⁾ is valid
 */
export default function MathText({
  children,
  className = '',
  as: Component = 'span',
}: MathTextProps) {
  const formattedText = useMemo(() => {
    if (typeof children !== 'string') return children
    return formatMathInText(children)
  }, [children])

  return <Component className={className}>{formattedText}</Component>
}

/**
 * Hook to format math in text
 * Useful when you need the formatted string without a component
 */
export function useMathText(text: string): string {
  return useMemo(() => {
    if (typeof text !== 'string') return text
    return formatMathInText(text)
  }, [text])
}
