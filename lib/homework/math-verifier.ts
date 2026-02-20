/**
 * Math Verifier — mathjs-based computational verification
 *
 * Used by the three-phase grading pipeline to independently verify
 * Claude's solutions for arithmetic, algebra, and expression problems.
 * Gracefully returns 'unverifiable' for anything mathjs can't parse
 * (proofs, word problems, conceptual answers, etc.).
 */

import { evaluate, simplify } from 'mathjs'

// ============================================================================
// Types
// ============================================================================

export interface VerificationResult {
  verified: boolean
  result?: string | number
  status: 'verified' | 'unverifiable' | 'disagreement'
  details?: string
}

// ============================================================================
// Core Verification Functions
// ============================================================================

/**
 * Verify an arithmetic expression (e.g., "24 + 38", "7 * 8", "144 / 12")
 * Returns the evaluated result or null if the expression can't be parsed.
 */
export function verifyArithmetic(expression: string): { result: number; verified: boolean } | null {
  try {
    const cleaned = cleanExpression(expression)
    const result = evaluate(cleaned)
    if (typeof result === 'number' && isFinite(result)) {
      return { result, verified: true }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Verify that a claimed solution satisfies an equation.
 * e.g., verifyEquation("2x + 5 = 13", "x", 4) → true
 */
export function verifyEquation(
  equation: string,
  variable: string,
  claimedSolution: number
): boolean {
  try {
    const cleaned = cleanExpression(equation)
    // Split on '='
    const parts = cleaned.split('=')
    if (parts.length !== 2) return false

    const [lhs, rhs] = parts.map(p => p.trim())

    // Substitute the variable and evaluate both sides
    const scope: Record<string, number> = { [variable]: claimedSolution }
    const lhsResult = evaluate(lhs, scope)
    const rhsResult = evaluate(rhs, scope)

    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return Math.abs(lhsResult - rhsResult) < 0.001
    }
    return false
  } catch {
    return false
  }
}

/**
 * Verify/simplify an expression and return a canonical result.
 * Handles both numeric expressions and symbolic simplification.
 */
export function verifyExpression(expr: string): { result: string | number; verified: boolean } | null {
  try {
    const cleaned = cleanExpression(expr)

    // First try numeric evaluation
    const numResult = evaluate(cleaned)
    if (typeof numResult === 'number' && isFinite(numResult)) {
      return { result: numResult, verified: true }
    }

    // Try symbolic simplification
    const simplified = simplify(cleaned)
    return { result: simplified.toString(), verified: true }
  } catch {
    return null
  }
}

/**
 * Main entry point: verify a claimed answer against the problem.
 * Tries multiple strategies and returns the best result.
 *
 * @param claimedAnswer - Claude's answer (or student's answer)
 * @param subject - The subject area (used to skip non-math subjects)
 * @param questionText - Optional: the original question text for equation verification
 */
export function verifyAnswer(
  claimedAnswer: string,
  subject: string,
  questionText?: string
): VerificationResult {
  // Skip non-math subjects entirely
  const mathSubjects = ['math', 'mathematics', 'algebra', 'geometry', 'calculus', 'arithmetic', 'trigonometry']
  const isMath = mathSubjects.some(s => subject.toLowerCase().includes(s))

  if (!isMath) {
    return { verified: false, status: 'unverifiable', details: 'Non-math subject' }
  }

  // Extract numeric value from the claimed answer
  const numericAnswer = extractNumericValue(claimedAnswer)

  // Strategy 1: If the question is an equation, verify the solution satisfies it
  if (questionText) {
    const equationResult = tryVerifyEquationSolution(questionText, claimedAnswer)
    if (equationResult) return equationResult
  }

  // Strategy 2: If the question contains a computable expression, evaluate it
  if (questionText) {
    const exprResult = tryVerifyExpressionResult(questionText, numericAnswer)
    if (exprResult) return exprResult
  }

  // Strategy 3: Try to evaluate the answer itself as an expression
  if (numericAnswer !== null) {
    return {
      verified: true,
      result: numericAnswer,
      status: 'verified',
      details: 'Numeric answer parsed successfully',
    }
  }

  // Can't verify — not necessarily wrong, just can't be checked computationally
  return { verified: false, status: 'unverifiable', details: 'Cannot parse as computable expression' }
}

/**
 * Compare two answers for numeric equivalence within tolerance (0.1%)
 */
export function answersMatch(answer1: string, answer2: string, tolerance: number = 0.001): boolean {
  const num1 = extractNumericValue(answer1)
  const num2 = extractNumericValue(answer2)

  if (num1 === null || num2 === null) return false
  if (num1 === 0 && num2 === 0) return true

  const absTolerance = Math.max(tolerance, Math.abs(num1) * tolerance, Math.abs(num2) * tolerance)
  return Math.abs(num1 - num2) <= absTolerance
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean an expression for mathjs parsing:
 * - Replace × with *, ÷ with /, etc.
 * - Strip units (kg, m, N, cm, etc.)
 * - Handle implicit multiplication (e.g., "2x" → "2*x")
 */
function cleanExpression(expr: string): string {
  let cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    // Strip common units
    .replace(/\s*(kg|g|m|cm|mm|km|N|J|W|s|ms|Hz|°C|°F|K|mol|L|mL)\b/gi, '')
    // Strip Hebrew units
    .replace(/\s*(ניוטון|מטר|ק"מ|ס"מ|ג'אול|וואט|שניות|דקות)/g, '')
    .trim()

  // Handle implicit multiplication: "2x" → "2*x", "3(..." → "3*(...)"
  cleaned = cleaned.replace(/(\d)([a-zA-Z(])/g, '$1*$2')

  return cleaned
}

/**
 * Extract the first numeric value from a string.
 * Handles formats like "42", "x = 4", "F = 50N", "-3.14", "2/3"
 */
function extractNumericValue(text: string): number | null {
  if (!text || typeof text !== 'string') return null

  const cleaned = text.trim()

  // Try: fraction like "2/3"
  const fractionMatch = cleaned.match(/^[+-]?\s*(\d+)\s*\/\s*(\d+)$/)
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1])
    const den = parseInt(fractionMatch[2])
    if (den !== 0) return num / den
  }

  // Try: "variable = number" pattern (e.g., "x = 4", "F = 50N")
  const assignMatch = cleaned.match(/=\s*([+-]?\d+\.?\d*)/g)
  if (assignMatch) {
    const lastAssign = assignMatch[assignMatch.length - 1]
    const numStr = lastAssign.replace('=', '').trim()
    const val = parseFloat(numStr)
    if (!isNaN(val)) return val
  }

  // Try: plain number (possibly with units stripped)
  const plainMatch = cleaned.replace(/[^0-9.eE+-]/g, ' ').trim().split(/\s+/)
  for (const part of plainMatch) {
    const val = parseFloat(part)
    if (!isNaN(val) && isFinite(val)) return val
  }

  // Try: evaluate as expression
  try {
    const result = evaluate(cleanExpression(cleaned))
    if (typeof result === 'number' && isFinite(result)) return result
  } catch {
    // ignore
  }

  return null
}

/**
 * Try to verify that a claimed answer satisfies an equation in the question.
 * e.g., question = "Solve 2x + 5 = 13", answer = "x = 4"
 */
function tryVerifyEquationSolution(question: string, answer: string): VerificationResult | null {
  // Look for equation patterns in the question
  const equationMatch = question.match(/(?:solve|find|calculate)?\s*:?\s*([^=]+=[^=,;.]+)/i)
  if (!equationMatch) return null

  const equation = equationMatch[1].trim()

  // Determine the variable from the answer
  const varMatch = answer.match(/([a-zA-Z])\s*=/)
  if (!varMatch) return null

  const variable = varMatch[1]
  const numericValue = extractNumericValue(answer)
  if (numericValue === null) return null

  try {
    const satisfied = verifyEquation(equation, variable, numericValue)
    if (satisfied) {
      return {
        verified: true,
        result: numericValue,
        status: 'verified',
        details: `${variable} = ${numericValue} satisfies ${equation}`,
      }
    } else {
      return {
        verified: false,
        result: numericValue,
        status: 'disagreement',
        details: `${variable} = ${numericValue} does NOT satisfy ${equation}`,
      }
    }
  } catch {
    return null
  }
}

/**
 * Try to verify a numeric answer by evaluating an expression from the question.
 * e.g., question = "Calculate 24 + 38", answer = "62"
 */
function tryVerifyExpressionResult(question: string, claimedNumeric: number | null): VerificationResult | null {
  if (claimedNumeric === null) return null

  // Look for computable expressions in the question
  const exprPatterns = [
    /(?:calculate|compute|evaluate|what is|find)\s*:?\s*([\d\s+\-*/×÷().^]+)/i,
    /([\d]+\s*[+\-*/×÷]\s*[\d+\-*/×÷\s.()]+)/,
  ]

  for (const pattern of exprPatterns) {
    const match = question.match(pattern)
    if (!match) continue

    const exprText = match[1].trim()
    const result = verifyArithmetic(exprText)
    if (result && result.verified) {
      const matches = Math.abs(result.result - claimedNumeric) < 0.001 * Math.max(1, Math.abs(result.result))
      return {
        verified: matches,
        result: result.result,
        status: matches ? 'verified' : 'disagreement',
        details: matches
          ? `Expression evaluates to ${result.result}, matches claimed ${claimedNumeric}`
          : `Expression evaluates to ${result.result}, but claimed answer is ${claimedNumeric}`,
      }
    }
  }

  return null
}
