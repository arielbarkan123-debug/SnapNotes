/**
 * normalizeToLatex - Converts AI-generated math notation to valid LaTeX.
 *
 * The AI sends expressions like "x^2 + 5x + 6" or "sqrt(x)" that need
 * conversion to proper LaTeX for KaTeX rendering.
 */
export function normalizeToLatex(input: string): string {
  if (!input) return ''

  let result = input

  // Multi-character exponents: x^10 → x^{10}, but keep x^2 as x^2
  result = result.replace(/\^(\d{2,})/g, '^{$1}')
  // Exponents with expressions: x^(2n+1) → x^{2n+1}
  result = result.replace(/\^(\([^)]+\))/g, (_, expr) => `^{${expr.slice(1, -1)}}`)

  // sqrt(...) → \sqrt{...} (handles nested parens and multiple occurrences)
  {
    let idx = result.indexOf('sqrt(')
    while (idx !== -1) {
      const openParen = idx + 4 // index of '('
      let depth = 0
      let closeIdx = -1
      for (let i = openParen; i < result.length; i++) {
        if (result[i] === '(') depth++
        if (result[i] === ')') depth--
        if (depth === 0) { closeIdx = i; break }
      }
      if (closeIdx !== -1) {
        const content = result.slice(openParen + 1, closeIdx)
        result = result.slice(0, idx) + `\\sqrt{${content}}` + result.slice(closeIdx + 1)
        idx = result.indexOf('sqrt(', idx + 6 + content.length) // skip past what we just inserted
      } else {
        break // unclosed paren, stop
      }
    }
  }

  // Unicode → LaTeX
  result = result.replace(/\u221A(\d+)/g, '\\sqrt{$1}')  // √3 → \sqrt{3}
  result = result.replace(/\u221A/g, '\\sqrt{}')
  result = result.replace(/\u03C0/g, '\\pi')               // π → \pi
  result = result.replace(/\u221E/g, '\\infty')             // ∞ → \infty
  result = result.replace(/\u2265/g, '\\geq')               // ≥
  result = result.replace(/\u2264/g, '\\leq')               // ≤
  result = result.replace(/\u2260/g, '\\neq')               // ≠
  result = result.replace(/\u00B2/g, '^{2}')                // ² → ^{2}
  result = result.replace(/\u00B3/g, '^{3}')                // ³ → ^{3}
  result = result.replace(/\u00D7/g, '\\times')             // × → \times
  result = result.replace(/\u00F7/g, '\\div')               // ÷ → \div
  result = result.replace(/\u2212/g, '-')                    // − (minus sign) → -

  // Common text operators (only when standalone words)
  result = result.replace(/\binfinity\b/gi, '\\infty')
  result = result.replace(/\binf\b/g, '\\infty')

  // Comparison operators
  result = result.replace(/>=/g, '\\geq')
  result = result.replace(/<=/g, '\\leq')
  result = result.replace(/!=/g, '\\neq')

  return result
}

/**
 * Converts a fraction string like "√3/2" or "1/2" to LaTeX \frac{}{} notation.
 * Used primarily for unit circle trig values.
 */
export function fractionToLatex(input: string): string {
  if (!input) return ''

  // Handle negative prefix
  const isNegative = input.startsWith('-')
  const abs = isNegative ? input.slice(1) : input

  // Check if it's a simple fraction a/b
  const parts = abs.split('/')
  if (parts.length === 2) {
    const num = normalizeToLatex(parts[0].trim())
    const den = normalizeToLatex(parts[1].trim())
    return `${isNegative ? '-' : ''}\\frac{${num}}{${den}}`
  }

  // Not a fraction, just normalize
  return normalizeToLatex(input)
}

/**
 * Converts a radian string like "π/6" or "2π/3" to LaTeX.
 */
export function radianToLatex(input: string): string {
  if (!input) return ''
  if (input === '0') return '0'

  // Normalize π first
  let result = input.replace(/\u03C0/g, '\\pi')

  // Handle simple cases
  if (result === '\\pi') return '\\pi'
  if (result === '2\\pi') return '2\\pi'

  // Handle fraction form: Xπ/Y or π/Y
  const match = result.match(/^(-?)(\d*)\\pi\/(\d+)$/)
  if (match) {
    const [, sign, coeff, den] = match
    const num = coeff ? `${coeff}\\pi` : '\\pi'
    return `${sign}\\frac{${num}}{${den}}`
  }

  return result
}
