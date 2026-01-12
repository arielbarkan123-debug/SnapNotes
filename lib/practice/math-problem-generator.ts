/**
 * Math Problem Generator
 *
 * Generates random math problems for step-by-step practice:
 * - Long division
 * - Fraction operations (simplify, add, multiply)
 * - Linear equations
 */

import { MathProblemType, MathDifficulty } from './types'

// ============================================================================
// Types
// ============================================================================

export interface LongDivisionProblem {
  type: 'long_division'
  dividend: number
  divisor: number
  quotient: number
  remainder: number
}

export interface FractionProblem {
  type: 'fraction_simplify' | 'fraction_add' | 'fraction_multiply'
  operation: 'simplify' | 'add' | 'multiply'
  fraction1: { numerator: number; denominator: number }
  fraction2?: { numerator: number; denominator: number }
}

export interface EquationProblem {
  type: 'equation_linear'
  a: number  // coefficient of x
  b: number  // constant on left side
  c: number  // right side
  solution: number
}

export type MathProblem = LongDivisionProblem | FractionProblem | EquationProblem

// ============================================================================
// Utility Functions
// ============================================================================

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
}

// ============================================================================
// Long Division Generator
// ============================================================================

export function generateLongDivision(difficulty: MathDifficulty): LongDivisionProblem {
  let divisor: number
  let dividend: number

  switch (difficulty) {
    case 'easy':
      // Simple: 2-digit ÷ 1-digit, clean division
      divisor = randomInt(2, 9)
      const quotientEasy = randomInt(10, 30)
      dividend = divisor * quotientEasy + randomInt(0, divisor - 1)
      break

    case 'medium':
      // Medium: 3-digit ÷ 1-digit
      divisor = randomInt(3, 9)
      const quotientMedium = randomInt(50, 150)
      dividend = divisor * quotientMedium + randomInt(0, divisor - 1)
      break

    case 'hard':
    default:
      // Hard: 3-4 digit ÷ 2-digit
      divisor = randomInt(11, 25)
      const quotientHard = randomInt(20, 100)
      dividend = divisor * quotientHard + randomInt(0, divisor - 1)
      break
  }

  return {
    type: 'long_division',
    dividend,
    divisor,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  }
}

// ============================================================================
// Fraction Generator
// ============================================================================

export function generateFractionSimplify(difficulty: MathDifficulty): FractionProblem {
  let numerator: number
  let denominator: number
  let multiplier: number

  switch (difficulty) {
    case 'easy':
      // Simple: small numbers, obvious GCD
      multiplier = randomInt(2, 5)
      numerator = randomInt(1, 5) * multiplier
      denominator = randomInt(2, 6) * multiplier
      break

    case 'medium':
      // Medium: larger numbers
      multiplier = randomInt(2, 7)
      numerator = randomInt(2, 10) * multiplier
      denominator = randomInt(3, 12) * multiplier
      break

    case 'hard':
    default:
      // Hard: larger numbers, less obvious GCD
      multiplier = randomInt(3, 11)
      numerator = randomInt(5, 15) * multiplier
      denominator = randomInt(7, 20) * multiplier
      break
  }

  // Ensure numerator < denominator for proper fractions
  if (numerator >= denominator) {
    [numerator, denominator] = [denominator, numerator]
  }

  return {
    type: 'fraction_simplify',
    operation: 'simplify',
    fraction1: { numerator, denominator },
  }
}

export function generateFractionAdd(difficulty: MathDifficulty): FractionProblem {
  let num1: number, den1: number, num2: number, den2: number

  switch (difficulty) {
    case 'easy':
      // Same denominator
      den1 = randomInt(3, 8)
      den2 = den1
      num1 = randomInt(1, den1 - 1)
      num2 = randomInt(1, den1 - num1)
      break

    case 'medium':
      // Different but related denominators (one divides the other)
      den1 = randomInt(2, 6)
      den2 = den1 * randomInt(2, 3)
      num1 = randomInt(1, den1 - 1)
      num2 = randomInt(1, den2 - 1)
      break

    case 'hard':
    default:
      // Different denominators
      den1 = randomInt(3, 8)
      den2 = randomInt(3, 8)
      while (den2 === den1 || gcd(den1, den2) === Math.min(den1, den2)) {
        den2 = randomInt(3, 8)
      }
      num1 = randomInt(1, den1 - 1)
      num2 = randomInt(1, den2 - 1)
      break
  }

  return {
    type: 'fraction_add',
    operation: 'add',
    fraction1: { numerator: num1, denominator: den1 },
    fraction2: { numerator: num2, denominator: den2 },
  }
}

export function generateFractionMultiply(difficulty: MathDifficulty): FractionProblem {
  let num1: number, den1: number, num2: number, den2: number

  switch (difficulty) {
    case 'easy':
      // Small numbers
      num1 = randomInt(1, 4)
      den1 = randomInt(2, 5)
      num2 = randomInt(1, 4)
      den2 = randomInt(2, 5)
      break

    case 'medium':
      // Medium numbers
      num1 = randomInt(2, 6)
      den1 = randomInt(3, 8)
      num2 = randomInt(2, 6)
      den2 = randomInt(3, 8)
      break

    case 'hard':
    default:
      // Larger numbers that may need simplification
      num1 = randomInt(3, 9)
      den1 = randomInt(4, 12)
      num2 = randomInt(3, 9)
      den2 = randomInt(4, 12)
      break
  }

  return {
    type: 'fraction_multiply',
    operation: 'multiply',
    fraction1: { numerator: num1, denominator: den1 },
    fraction2: { numerator: num2, denominator: den2 },
  }
}

// ============================================================================
// Equation Generator
// ============================================================================

export function generateLinearEquation(difficulty: MathDifficulty): EquationProblem {
  let a: number, b: number, solution: number

  switch (difficulty) {
    case 'easy':
      // Simple: x + b = c (a=1, small numbers)
      a = 1
      solution = randomInt(1, 10)
      b = randomInt(-5, 10)
      break

    case 'medium':
      // Medium: ax + b = c (small coefficient)
      a = randomInt(2, 5)
      solution = randomInt(-5, 10)
      b = randomInt(-10, 10)
      break

    case 'hard':
    default:
      // Hard: ax + b = c (larger numbers, may include negative coefficient)
      a = randomInt(2, 8) * (Math.random() > 0.3 ? 1 : -1)
      solution = randomInt(-10, 10)
      b = randomInt(-15, 15)
      break
  }

  // Calculate c from solution
  const c = a * solution + b

  return {
    type: 'equation_linear',
    a,
    b,
    c,
    solution,
  }
}

// ============================================================================
// Main Generator Function
// ============================================================================

export function generateMathProblem(
  type: MathProblemType,
  difficulty: MathDifficulty
): MathProblem {
  switch (type) {
    case 'long_division':
      return generateLongDivision(difficulty)

    case 'fraction_simplify':
      return generateFractionSimplify(difficulty)

    case 'fraction_add':
      return generateFractionAdd(difficulty)

    case 'fraction_multiply':
      return generateFractionMultiply(difficulty)

    case 'equation_linear':
      return generateLinearEquation(difficulty)

    default:
      // Default to long division for unsupported types
      return generateLongDivision(difficulty)
  }
}

// ============================================================================
// Problem Description Generator (for display)
// ============================================================================

export function getProblemDescription(problem: MathProblem, language: 'en' | 'he' = 'en'): string {
  const isHebrew = language === 'he'

  switch (problem.type) {
    case 'long_division':
      return isHebrew
        ? `חשב: ${problem.dividend} ÷ ${problem.divisor}`
        : `Calculate: ${problem.dividend} ÷ ${problem.divisor}`

    case 'fraction_simplify':
      return isHebrew
        ? `צמצם: ${problem.fraction1.numerator}/${problem.fraction1.denominator}`
        : `Simplify: ${problem.fraction1.numerator}/${problem.fraction1.denominator}`

    case 'fraction_add':
      return isHebrew
        ? `חבר: ${problem.fraction1.numerator}/${problem.fraction1.denominator} + ${problem.fraction2?.numerator}/${problem.fraction2?.denominator}`
        : `Add: ${problem.fraction1.numerator}/${problem.fraction1.denominator} + ${problem.fraction2?.numerator}/${problem.fraction2?.denominator}`

    case 'fraction_multiply':
      return isHebrew
        ? `הכפל: ${problem.fraction1.numerator}/${problem.fraction1.denominator} × ${problem.fraction2?.numerator}/${problem.fraction2?.denominator}`
        : `Multiply: ${problem.fraction1.numerator}/${problem.fraction1.denominator} × ${problem.fraction2?.numerator}/${problem.fraction2?.denominator}`

    case 'equation_linear':
      const eqProblem = problem as EquationProblem
      let equation = ''
      if (eqProblem.a === 1) equation = 'x'
      else if (eqProblem.a === -1) equation = '-x'
      else equation = `${eqProblem.a}x`

      if (eqProblem.b > 0) equation += ` + ${eqProblem.b}`
      else if (eqProblem.b < 0) equation += ` - ${Math.abs(eqProblem.b)}`

      equation += ` = ${eqProblem.c}`

      return isHebrew
        ? `פתור: ${equation}`
        : `Solve: ${equation}`

    default:
      return ''
  }
}
