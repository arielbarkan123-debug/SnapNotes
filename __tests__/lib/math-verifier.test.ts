import {
  verifyArithmetic,
  verifyEquation,
  verifyExpression,
  verifyAnswer,
  answersMatch,
} from '@/lib/homework/math-verifier'

// =============================================================================
// verifyArithmetic
// =============================================================================

describe('verifyArithmetic', () => {
  it('evaluates basic addition', () => {
    const result = verifyArithmetic('24 + 38')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(62)
    expect(result!.verified).toBe(true)
  })

  it('evaluates multiplication', () => {
    const result = verifyArithmetic('7 * 8')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(56)
  })

  it('evaluates division', () => {
    const result = verifyArithmetic('144 / 12')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(12)
  })

  it('evaluates complex expressions', () => {
    const result = verifyArithmetic('(3 + 4) * 2 - 1')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(13)
  })

  it('handles Unicode operators', () => {
    const result = verifyArithmetic('5 × 6')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(30)
  })

  it('handles Unicode division', () => {
    const result = verifyArithmetic('20 ÷ 4')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(5)
  })

  it('returns null for invalid expressions', () => {
    expect(verifyArithmetic('hello world')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(verifyArithmetic('')).toBeNull()
  })

  it('handles negative results', () => {
    const result = verifyArithmetic('3 - 10')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(-7)
  })

  it('handles decimal results', () => {
    const result = verifyArithmetic('7 / 3')
    expect(result).not.toBeNull()
    expect(result!.result).toBeCloseTo(2.333, 2)
  })
})

// =============================================================================
// verifyEquation
// =============================================================================

describe('verifyEquation', () => {
  it('verifies correct solution to linear equation', () => {
    expect(verifyEquation('2*x + 5 = 13', 'x', 4)).toBe(true)
  })

  it('rejects wrong solution', () => {
    expect(verifyEquation('2*x + 5 = 13', 'x', 5)).toBe(false)
  })

  it('verifies equation with negative solution', () => {
    expect(verifyEquation('3*x + 9 = 0', 'x', -3)).toBe(true)
  })

  it('verifies equation with decimal solution', () => {
    expect(verifyEquation('4*x = 10', 'x', 2.5)).toBe(true)
  })

  it('returns false for unparseable equations', () => {
    expect(verifyEquation('not an equation', 'x', 0)).toBe(false)
  })

  it('returns false for equations without =', () => {
    expect(verifyEquation('2x + 5', 'x', 4)).toBe(false)
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

  it('returns null for unparseable expressions', () => {
    expect(verifyExpression('this is not math')).toBeNull()
  })

  it('handles parentheses', () => {
    const result = verifyExpression('(3 + 4) * 2')
    expect(result).not.toBeNull()
    expect(result!.result).toBe(14)
  })
})

// =============================================================================
// verifyAnswer
// =============================================================================

describe('verifyAnswer', () => {
  it('returns unverifiable for non-math subjects', () => {
    const result = verifyAnswer('42', 'History')
    expect(result.status).toBe('unverifiable')
    expect(result.details).toBe('Non-math subject')
  })

  it('returns unverifiable for science', () => {
    const result = verifyAnswer('50N', 'Physics')
    expect(result.status).toBe('unverifiable')
  })

  it('verifies numeric math answer', () => {
    const result = verifyAnswer('42', 'Math')
    expect(result.status).toBe('verified')
    expect(result.result).toBe(42)
  })

  it('verifies equation solution with question context', () => {
    const result = verifyAnswer('x = 4', 'Algebra', 'Solve 2*x + 5 = 13')
    expect(result.status).toBe('verified')
    expect(result.result).toBe(4)
  })

  it('detects disagreement for wrong equation solution', () => {
    const result = verifyAnswer('x = 5', 'Algebra', 'Solve 2*x + 5 = 13')
    expect(result.status).toBe('disagreement')
  })

  it('verifies arithmetic expression from question', () => {
    const result = verifyAnswer('62', 'Math', 'Calculate 24 + 38')
    expect(result.status).toBe('verified')
  })

  it('detects disagreement for wrong arithmetic', () => {
    const result = verifyAnswer('63', 'Math', 'Calculate 24 + 38')
    expect(result.status).toBe('disagreement')
  })

  it('returns unverifiable for conceptual answers', () => {
    const result = verifyAnswer('The triangle is isosceles', 'Geometry')
    expect(result.status).toBe('unverifiable')
  })

  it('handles answer with units', () => {
    const result = verifyAnswer('50 kg', 'Math')
    expect(result.status).toBe('verified')
    expect(result.result).toBe(50)
  })

  it('handles "variable = value" format', () => {
    const result = verifyAnswer('F = 50', 'Math')
    expect(result.status).toBe('verified')
    expect(result.result).toBe(50)
  })
})

// =============================================================================
// answersMatch
// =============================================================================

describe('answersMatch', () => {
  it('matches identical numbers', () => {
    expect(answersMatch('42', '42')).toBe(true)
  })

  it('matches within default tolerance', () => {
    expect(answersMatch('42.001', '42')).toBe(true)
  })

  it('rejects numbers outside tolerance', () => {
    expect(answersMatch('42', '43')).toBe(false)
  })

  it('matches zero to zero', () => {
    expect(answersMatch('0', '0')).toBe(true)
  })

  it('matches negative numbers', () => {
    expect(answersMatch('-5', '-5')).toBe(true)
  })

  it('returns false for non-numeric strings', () => {
    expect(answersMatch('hello', 'world')).toBe(false)
  })

  it('matches "x = 4" to "4"', () => {
    expect(answersMatch('x = 4', '4')).toBe(true)
  })

  it('matches "F = 50N" to "50"', () => {
    expect(answersMatch('F = 50N', '50')).toBe(true)
  })

  it('handles decimal precision', () => {
    expect(answersMatch('0.333', '1/3')).toBe(true)
  })

  it('rejects clearly different values', () => {
    expect(answersMatch('10', '100')).toBe(false)
  })
})
