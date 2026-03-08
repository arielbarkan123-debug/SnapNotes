/**
 * Smart Solver — Step 4: Auto-Retry on Mismatch
 *
 * When E2B compute verification disagrees with the AI's answer,
 * this module tells the AI exactly what went wrong and asks it
 * to re-solve the problem with the error feedback.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import type { SolvedDecomposedProblem, ComputeVerificationResult, RetryResult } from './types'

const MAX_TOKENS = 4096

/**
 * Ask Claude to re-solve a problem after a compute verification mismatch.
 *
 * Provides the AI with:
 * - The original problem
 * - Its previous decomposition and solution
 * - The independently computed answer
 * - Common error types to check for
 *
 * Returns null if the retry fails (Claude API error, bad JSON, etc.)
 */
export async function retryWithFeedback(
  client: Anthropic,
  problem: SolvedDecomposedProblem,
  computeResult: ComputeVerificationResult,
  attempt: number
): Promise<RetryResult | null> {
  try {
    const subProblemDetails = problem.subProblemSolutions
      .map(s => `  ${s.subProblemId}: ${s.result}\n    Work: ${s.workShown}`)
      .join('\n')

    const prompt = `You solved this problem but your answer DISAGREES with an independent computation. Find and fix the error.

## ORIGINAL PROBLEM:
${problem.questionText}

## YOUR DECOMPOSITION:
${problem.subProblems.map(sp => `  ${sp.id}: ${sp.description} (method: ${sp.formulaOrMethod})`).join('\n')}

## YOUR SUB-PROBLEM SOLUTIONS:
${subProblemDetails}

## YOUR FINAL ANSWER: ${problem.finalAnswer}

## COMPUTED ANSWER (from independent SymPy computation): ${computeResult.computedAnswer}

## COMMON ERROR TYPES TO CHECK:
1. Wrong formula selected for the problem type
2. Arithmetic mistake in a calculation step
3. Wrong value extraction from the problem text
4. Unit conversion error (e.g., cm to m, degrees to radians)
5. Sign error (positive vs negative)
6. Order of operations mistake
7. Missing a step or skipping a required operation

## YOUR TASK:
1. Identify which sub-problem(s) went wrong and why
2. Re-solve the problem step by step with the error corrected
3. Verify your new answer is consistent with the computed answer

Respond with ONLY valid JSON:
{
  "errorIdentified": "clear explanation of what went wrong",
  "failingSubProblemId": "which sub-problem had the error",
  "correctAnswer": "the corrected final answer",
  "solutionSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}`

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find(b => b.type === 'text')
    if (!textContent || textContent.type !== 'text') return null

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    const correctedAnswer = String(parsed.correctAnswer || '')
    if (!correctedAnswer) return null

    console.log(
      `[SmartSolver/Retry] Problem ${problem.id} (attempt ${attempt}): ` +
      `error="${String(parsed.errorIdentified || '').slice(0, 80)}", ` +
      `corrected="${correctedAnswer.slice(0, 50)}"`
    )

    return {
      problemId: problem.id,
      originalAnswer: problem.finalAnswer,
      correctedAnswer,
      correctedSteps: Array.isArray(parsed.solutionSteps)
        ? parsed.solutionSteps.map(String)
        : [],
      retryAttempt: attempt,
      resolvedVia: 'ai_correction',
    }
  } catch (err) {
    console.warn(`[SmartSolver/Retry] Retry failed for problem ${problem.id}:`, err)
    return null
  }
}
