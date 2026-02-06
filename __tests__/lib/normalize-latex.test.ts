import { normalizeToLatex, fractionToLatex, radianToLatex } from '@/lib/normalize-latex'

describe('normalizeToLatex', () => {
  it('returns empty string for falsy input', () => {
    expect(normalizeToLatex('')).toBe('')
    expect(normalizeToLatex(undefined as unknown as string)).toBe('')
  })

  it('passes through simple text unchanged', () => {
    expect(normalizeToLatex('x + 1')).toBe('x + 1')
    expect(normalizeToLatex('2x - 3')).toBe('2x - 3')
  })

  // Exponents
  it('wraps multi-digit exponents in braces', () => {
    expect(normalizeToLatex('x^10')).toBe('x^{10}')
    expect(normalizeToLatex('x^23')).toBe('x^{23}')
  })

  it('leaves single-digit exponents unchanged', () => {
    expect(normalizeToLatex('x^2')).toBe('x^2')
    expect(normalizeToLatex('x^3 + y^9')).toBe('x^3 + y^9')
  })

  it('wraps parenthesized exponents', () => {
    expect(normalizeToLatex('x^(2n+1)')).toBe('x^{2n+1}')
  })

  // sqrt
  it('converts sqrt() to \\sqrt{}', () => {
    expect(normalizeToLatex('sqrt(x)')).toBe('\\sqrt{x}')
    expect(normalizeToLatex('sqrt(16)')).toBe('\\sqrt{16}')
  })

  it('handles nested parens in sqrt', () => {
    expect(normalizeToLatex('sqrt(f(x))')).toBe('\\sqrt{f(x)}')
    expect(normalizeToLatex('sqrt(a(b+c))')).toBe('\\sqrt{a(b+c)}')
  })

  it('handles multiple sqrt calls in one string', () => {
    expect(normalizeToLatex('sqrt(4) + sqrt(9)')).toBe('\\sqrt{4} + \\sqrt{9}')
    expect(normalizeToLatex('sqrt(x) * sqrt(y)')).toBe('\\sqrt{x} * \\sqrt{y}')
  })

  it('handles unclosed sqrt gracefully', () => {
    // Unclosed paren should leave the string unchanged from that point
    expect(normalizeToLatex('sqrt(x')).toBe('sqrt(x')
  })

  // Unicode conversions
  it('converts π to \\pi', () => {
    expect(normalizeToLatex('2\u03C0r')).toBe('2\\pir')
    expect(normalizeToLatex('\u03C0')).toBe('\\pi')
  })

  it('converts ∞ to \\infty', () => {
    expect(normalizeToLatex('\u221E')).toBe('\\infty')
    expect(normalizeToLatex('(-\u221E, 2)')).toBe('(-\\infty, 2)')
  })

  it('converts ≥ ≤ ≠ to LaTeX', () => {
    expect(normalizeToLatex('x \u2265 3')).toBe('x \\geq 3')
    expect(normalizeToLatex('y \u2264 5')).toBe('y \\leq 5')
    expect(normalizeToLatex('x \u2260 0')).toBe('x \\neq 0')
  })

  it('converts superscript Unicode ² ³', () => {
    expect(normalizeToLatex('x\u00B2')).toBe('x^{2}')
    expect(normalizeToLatex('x\u00B3')).toBe('x^{3}')
  })

  it('converts × ÷ − to LaTeX', () => {
    expect(normalizeToLatex('3 \u00D7 4')).toBe('3 \\times 4')
    expect(normalizeToLatex('12 \u00F7 3')).toBe('12 \\div 3')
    expect(normalizeToLatex('5 \u2212 2')).toBe('5 - 2')
  })

  it('converts √ prefix to \\sqrt{}', () => {
    expect(normalizeToLatex('\u221A3')).toBe('\\sqrt{3}')
    expect(normalizeToLatex('\u221A16')).toBe('\\sqrt{16}')
  })

  // Comparison operators
  it('converts >= <= != to LaTeX without trailing space', () => {
    expect(normalizeToLatex('x >= 3')).toBe('x \\geq 3')
    expect(normalizeToLatex('y <= 5')).toBe('y \\leq 5')
    expect(normalizeToLatex('x != 0')).toBe('x \\neq 0')
  })

  // Text operators
  it('converts text "infinity" and "inf"', () => {
    expect(normalizeToLatex('(-infinity, 2)')).toBe('(-\\infty, 2)')
    expect(normalizeToLatex('x < inf')).toBe('x < \\infty')
  })
})

describe('fractionToLatex', () => {
  it('returns empty string for falsy input', () => {
    expect(fractionToLatex('')).toBe('')
  })

  it('converts simple fractions', () => {
    expect(fractionToLatex('1/2')).toBe('\\frac{1}{2}')
    expect(fractionToLatex('3/4')).toBe('\\frac{3}{4}')
  })

  it('handles negative fractions', () => {
    expect(fractionToLatex('-1/2')).toBe('-\\frac{1}{2}')
    expect(fractionToLatex('-3/4')).toBe('-\\frac{3}{4}')
  })

  it('normalizes numerator/denominator', () => {
    expect(fractionToLatex('\u221A3/2')).toBe('\\frac{\\sqrt{3}}{2}')
  })

  it('returns normalized input for non-fractions', () => {
    expect(fractionToLatex('x^2')).toBe('x^2')
    expect(fractionToLatex('0')).toBe('0')
  })

  it('returns input as-is for multi-slash', () => {
    // a/b/c has 3 parts, not handled as a fraction
    expect(fractionToLatex('a/b/c')).toBe('a/b/c')
  })
})

describe('radianToLatex', () => {
  it('returns empty string for falsy input', () => {
    expect(radianToLatex('')).toBe('')
  })

  it('handles zero', () => {
    expect(radianToLatex('0')).toBe('0')
  })

  it('handles plain π', () => {
    expect(radianToLatex('\u03C0')).toBe('\\pi')
  })

  it('handles 2π', () => {
    expect(radianToLatex('2\u03C0')).toBe('2\\pi')
  })

  it('converts π/N fractions', () => {
    expect(radianToLatex('\u03C0/6')).toBe('\\frac{\\pi}{6}')
    expect(radianToLatex('\u03C0/4')).toBe('\\frac{\\pi}{4}')
    expect(radianToLatex('\u03C0/3')).toBe('\\frac{\\pi}{3}')
    expect(radianToLatex('\u03C0/2')).toBe('\\frac{\\pi}{2}')
  })

  it('converts Nπ/D fractions', () => {
    expect(radianToLatex('2\u03C0/3')).toBe('\\frac{2\\pi}{3}')
    expect(radianToLatex('3\u03C0/4')).toBe('\\frac{3\\pi}{4}')
    expect(radianToLatex('5\u03C0/6')).toBe('\\frac{5\\pi}{6}')
  })

  it('handles negative radians', () => {
    expect(radianToLatex('-\u03C0/6')).toBe('-\\frac{\\pi}{6}')
    expect(radianToLatex('-2\u03C0/3')).toBe('-\\frac{2\\pi}{3}')
  })
})
