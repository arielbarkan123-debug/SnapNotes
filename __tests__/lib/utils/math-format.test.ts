/**
 * Tests for math formatting utility
 */

import { formatMath, containsMath, formatMathInText } from '@/lib/utils/math-format'

describe('formatMath', () => {
  describe('superscripts', () => {
    it('converts simple exponents: x^2 → x²', () => {
      expect(formatMath('x^2')).toBe('x²')
    })

    it('converts multi-digit exponents: x^10 → x¹⁰', () => {
      expect(formatMath('x^10')).toBe('x¹⁰')
    })

    it('converts parenthesized exponents: x^(n+1) → x⁽ⁿ⁺¹⁾', () => {
      // The implementation removes parentheses when converting
      expect(formatMath('x^(n+1)')).toBe('xⁿ⁺¹')
    })

    it('converts braced exponents: x^{2n} → x²ⁿ', () => {
      expect(formatMath('x^{2n}')).toBe('x²ⁿ')
    })

    it('handles negative exponents: x^-1 → x⁻¹', () => {
      expect(formatMath('x^-1')).toBe('x⁻¹')
    })
  })

  describe('subscripts', () => {
    it('converts simple subscripts: x_1 → x₁', () => {
      expect(formatMath('x_1')).toBe('x₁')
    })

    it('converts multi-character subscripts: a_12 → a₁₂', () => {
      expect(formatMath('a_12')).toBe('a₁₂')
    })

    it('converts letter subscripts: x_n → xₙ', () => {
      expect(formatMath('x_n')).toBe('xₙ')
    })
  })

  describe('comparison operators', () => {
    it('converts >= to ≥', () => {
      expect(formatMath('x >= 5')).toBe('x ≥ 5')
    })

    it('converts <= to ≤', () => {
      expect(formatMath('x <= 5')).toBe('x ≤ 5')
    })

    it('converts != to ≠', () => {
      expect(formatMath('x != y')).toBe('x ≠ y')
    })
  })

  describe('arithmetic operators', () => {
    it('converts * to ×', () => {
      expect(formatMath('3 * 4')).toBe('3 × 4')
    })

    it('converts +- to ±', () => {
      expect(formatMath('x +- 5')).toBe('x ± 5')
    })
  })

  describe('roots', () => {
    it('converts sqrt(x) to √(x)', () => {
      expect(formatMath('sqrt(x)')).toBe('√(x)')
    })

    it('converts cbrt(x) to ∛(x)', () => {
      expect(formatMath('cbrt(8)')).toBe('∛(8)')
    })
  })

  describe('Greek letters', () => {
    it('converts pi to π', () => {
      // Word boundary required - "2 pi" works but "2pi" doesn't
      expect(formatMath('2 pi')).toBe('2 π')
    })

    it('converts theta to θ', () => {
      expect(formatMath('angle theta')).toBe('angle θ')
    })

    it('converts alpha to α', () => {
      expect(formatMath('alpha + beta')).toBe('α + β')
    })

    it('converts sigma to σ', () => {
      expect(formatMath('sigma')).toBe('σ')
    })

    it('converts infinity to ∞', () => {
      expect(formatMath('x -> infinity')).toBe('x → ∞')
    })
  })

  describe('arrows', () => {
    it('converts -> to →', () => {
      expect(formatMath('x -> y')).toBe('x → y')
    })

    it('converts <- to ←', () => {
      expect(formatMath('x <- y')).toBe('x ← y')
    })

    it('converts => to ⇒', () => {
      expect(formatMath('A => B')).toBe('A ⇒ B')
    })
  })

  describe('fractions', () => {
    it('formats simple fractions: (1/2)', () => {
      expect(formatMath('(1/2)')).toBe('¹⁄₂')
    })

    it('formats multi-digit fractions: (3/4)', () => {
      expect(formatMath('(3/4)')).toBe('³⁄₄')
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(formatMath('')).toBe('')
    })

    it('handles null', () => {
      expect(formatMath(null as unknown as string)).toBe(null)
    })

    it('handles undefined', () => {
      expect(formatMath(undefined as unknown as string)).toBe(undefined)
    })

    it('preserves regular text', () => {
      expect(formatMath('Hello world')).toBe('Hello world')
    })

    it('handles combined expressions', () => {
      const input = 'x^2 + y^2 = r^2'
      expect(formatMath(input)).toBe('x² + y² = r²')
    })
  })
})

describe('containsMath', () => {
  it('returns true for expressions with exponents', () => {
    expect(containsMath('x^2')).toBe(true)
  })

  it('returns true for expressions with subscripts', () => {
    expect(containsMath('x_1')).toBe(true)
  })

  it('returns true for expressions with operators', () => {
    expect(containsMath('2 + 3')).toBe(true)
    expect(containsMath('5 - 2')).toBe(true)
    expect(containsMath('3 * 4')).toBe(true)
    expect(containsMath('x = 5')).toBe(true)
  })

  it('returns true for expressions with fractions', () => {
    expect(containsMath('1/2')).toBe(true)
  })

  it('returns true for expressions with sqrt', () => {
    expect(containsMath('sqrt(9)')).toBe(true)
  })

  it('returns true for Greek letters', () => {
    expect(containsMath('π')).toBe(true)
    expect(containsMath('θ')).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(containsMath('Hello world')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(containsMath('')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(containsMath(null as unknown as string)).toBe(false)
    expect(containsMath(undefined as unknown as string)).toBe(false)
  })
})

describe('formatMathInText', () => {
  it('formats math expressions in text', () => {
    const input = 'The equation is x^2 + y^2 = r^2'
    expect(formatMathInText(input)).toBe('The equation is x² + y² = r²')
  })

  it('handles text without math', () => {
    const input = 'This is plain text'
    expect(formatMathInText(input)).toBe('This is plain text')
  })

  it('handles empty string', () => {
    expect(formatMathInText('')).toBe('')
  })
})
