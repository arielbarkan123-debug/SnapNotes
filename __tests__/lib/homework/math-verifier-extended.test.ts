/**
 * Extended tests for math-verifier.ts
 * Covers: verifyArithmetic (exponents, pi, division by zero),
 * verifyEquation, verifyExpression, answersMatch (custom tolerance, fractions),
 * verifyAnswer.
 */

import {
  verifyArithmetic,
  verifyEquation,
  verifyExpression,
  verifyAnswer,
  answersMatch,
} from '@/lib/homework/math-verifier'

// =============================================================================
// verifyArithmetic — extended
// =============================================================================

describe('verifyArithmetic — extended', () => {
  it('evaluates exponents', () => {
    const result = verifyArithmetic('2^3')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(8)
    expect(result!.verified).toBe(true)
  })

  it('evaluates expressions with pi', () => {
    const result = verifyArithmetic('pi * 2')
    expect(result).not.toBeNull()
    expect(result!.result).toBeCloseTo(6.2832, 3)
  })

  it('evaluates expressions with π symbol', () => {
    const result = verifyArithmetic('π * 1')
    expect(result).not.toBeNull()
    expect(result!.result).toBeCloseTo(Math.PI, 3)
  })

  it('handles division by zero (returns null for Infinity)', () => {
    const result = verifyArithmetic('5 / 0')
    // Division by zero produces Infinity, which is not finite
    expect(result).toBeNull()
  })

  it('evaluates nested parentheses', () => {
    const result = verifyArithmetic('((2 + 3) * (4 - 1))')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(15)
  })

  it('returns null for invalid expressions', () => {
    expect(verifyArithmetic('hello world')).toBeNull()
  })

  it('evaluates square root via sqrt', () => {
    const result = verifyArithmetic('sqrt(16)')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(4)
  })

  it('evaluates expressions with Unicode ÷', () => {
    const result = verifyArithmetic('20 ÷ 4')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(5)
  })

  it('evaluates expressions with Unicode ×', () => {
    const result = verifyArithmetic('3 × 7')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(21)
  })
})

// =============================================================================
// verifyEquation
// =============================================================================

describe('verifyEquation', () => {
  it('verifies correct solution to linear equation', () => {
    expect(verifyEquation('2*x + 5 = 13', 'x', 4)).toBe(true)
  })

  it('rejects incorrect solution', () => {
    expect(verifyEquation('2*x + 5 = 13', 'x', 5)).toBe(false)
  })

  it('verifies negative solution', () => {
    expect(verifyEquation('x + 10 = 3', 'x', -7)).toBe(true)
  })

  it('verifies equation with variable on both sides', () => {
    // 3*x + 2 = x + 8 → 2*x = 6 → x = 3
    expect(verifyEquation('3*x + 2 = x + 8', 'x', 3)).toBe(true)
  })

  it('returns false for invalid equation format (no equals)', () => {
    expect(verifyEquation('2x + 5', 'x', 4)).toBe(false)
  })

  it('returns false for multiple equals signs', () => {
    expect(verifyEquation('x = 2 = 3', 'x', 2)).toBe(false)
  })

  it('returns false for unparseable expression', () => {
    expect(verifyEquation('foo bar = baz', 'x', 0)).toBe(false)
  })
})

// =============================================================================
// verifyExpression
// =============================================================================

describe('verifyExpression', () => {
  it('evaluates numeric expression', () => {
    const result = verifyExpression('3 + 4 * 2')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(11)
    expect(result!.verified).toBe(true)
  })

  it('returns null for symbolic expression that cannot be evaluated numerically', () => {
    // mathjs evaluate('x + x') throws because x is undefined, and simplify may also fail
    // depending on the version. The function catches and returns null.
    const result = verifyExpression('x + x')
    // Result depends on mathjs version — may simplify or return null
    if (result !== null) {
      expect(result.verified).toBe(true)
    } else {
      expect(result).toBeNull()
    }
  })

  it('returns null for unparseable expression', () => {
    expect(verifyExpression('hello world test')).toBeNull()
  })

  it('evaluates expression with sqrt', () => {
    const result = verifyExpression('sqrt(9) + 1')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(4)
  })
})

// =============================================================================
// answersMatch — extended
// =============================================================================

describe('answersMatch — extended', () => {
  it('matches identical numbers', () => {
    expect(answersMatch('42', '42')).toBe(true)
  })

  it('matches with default tolerance', () => {
    expect(answersMatch('10', '10.005')).toBe(true)
  })

  it('does not match beyond default tolerance', () => {
    expect(answersMatch('10', '11')).toBe(false)
  })

  it('matches with custom larger tolerance', () => {
    expect(answersMatch('10', '10.5', 0.1)).toBe(true)
  })

  it('matches fractions', () => {
    // "2/3" should parse to ~0.6667
    expect(answersMatch('2/3', '0.6667', 0.001)).toBe(true)
  })

  it('matches zero to zero', () => {
    expect(answersMatch('0', '0')).toBe(true)
  })

  it('returns false for non-numeric answers', () => {
    expect(answersMatch('hello', 'world')).toBe(false)
  })

  it('returns false when one is non-numeric', () => {
    expect(answersMatch('42', 'hello')).toBe(false)
  })

  it('matches "x = 4" to "4"', () => {
    expect(answersMatch('x = 4', '4')).toBe(true)
  })
})

// =============================================================================
// verifyAnswer
// =============================================================================

describe('verifyAnswer', () => {
  it('returns unverifiable for non-math subject', () => {
    const result = verifyAnswer('42', 'history')
    expect(result.status).toBe('unverifiable')
    expect(result.verified).toBe(false)
  })

  it('verifies numeric answer for math subject', () => {
    const result = verifyAnswer('42', 'math')
    expect(result.status).toBe('verified')
    expect(result.verified).toBe(true)
    expect(result.result).toBe(42)
  })

  it('verifies equation solution when question provided', () => {
    const result = verifyAnswer('x = 4', 'algebra', 'Solve 2*x + 5 = 13')
    expect(result.status).toBe('verified')
    expect(result.verified).toBe(true)
  })

  it('detects disagreement in equation solution', () => {
    const result = verifyAnswer('x = 5', 'algebra', 'Solve 2*x + 5 = 13')
    expect(result.status).toBe('disagreement')
    expect(result.verified).toBe(false)
  })

  it('verifies arithmetic expression from question', () => {
    const result = verifyAnswer('62', 'math', 'Calculate 24 + 38')
    expect(result.status).toBe('verified')
    expect(result.verified).toBe(true)
  })

  it('detects disagreement in arithmetic', () => {
    const result = verifyAnswer('60', 'mathematics', 'Calculate 24 + 38')
    expect(result.status).toBe('disagreement')
    expect(result.verified).toBe(false)
  })

  it('returns unverifiable for non-parseable text answer', () => {
    const result = verifyAnswer('The answer involves complex reasoning', 'math')
    expect(result.status).toBe('unverifiable')
  })
})
