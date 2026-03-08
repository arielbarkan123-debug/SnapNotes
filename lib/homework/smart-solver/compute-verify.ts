/**
 * Smart Solver — Step 3: Compute-Verify
 *
 * For math/physics problems, generates independent SymPy code to solve
 * the problem from scratch, executes it in E2B sandbox, and compares
 * the result with the AI's answer.
 *
 * Reuses existing E2B infrastructure from the diagram engine's smart pipeline.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { computeWithRetry } from '@/lib/diagram-engine/smart-pipeline/compute'
import { verifyComputed } from '@/lib/diagram-engine/smart-pipeline/verify'
import { answersMatch } from '@/lib/homework/math-verifier'
import type { AnalysisResult } from '@/lib/diagram-engine/smart-pipeline/types'
import type { SolvedDecomposedProblem, ComputeVerificationResult } from './types'
// subject-utils used by index.ts orchestrator

const MAX_TOKENS = 2048

/**
 * Map SubjectCategory to AnalysisResult.domain for the existing
 * smart pipeline infrastructure.
 */
function mapToDomain(category: string): AnalysisResult['domain'] {
  switch (category) {
    case 'physics': return 'mechanics'
    case 'math_algebra': return 'algebra'
    case 'math_calculus': return 'calculus'
    case 'math_trigonometry': return 'trigonometry'
    case 'math_statistics': return 'statistics'
    case 'math_geometry': return 'geometry'
    default: return 'general_math'
  }
}

/**
 * Generate SymPy verification code for a solved problem.
 *
 * Asks Claude to write Python/SymPy code that independently solves
 * the problem from scratch — NOT by reproducing the AI's steps,
 * but by approaching it fresh.
 */
async function generateVerificationCode(
  client: Anthropic,
  problem: SolvedDecomposedProblem
): Promise<AnalysisResult | null> {
  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `Write Python code using SymPy to independently solve this problem. Do NOT simply reproduce the answer — solve it from scratch.

PROBLEM: ${problem.questionText}

REQUIREMENTS:
- Use sympy for symbolic math (import sympy, not just math)
- Convert all SymPy objects to float() before putting in JSON
- Use sympy.rad() for degree-to-radian conversion
- The output must be a JSON object printed with json.dumps()
- Format: {"values": {"answer": {"name": "answer", "value": <number>, "unit": "<unit>", "formula": "<formula used>", "step": "<calculation shown>"}}, "solutionSteps": ["step 1", "step 2"]}
- Handle edge cases: division by zero, undefined values
- If the answer is not numeric (e.g., an expression), evaluate to a decimal approximation

Return ONLY the Python code. No markdown fences. No explanation.`,
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    let code = textBlock.text.trim()

    // Extract code from markdown fences if present
    const fenceMatch = code.match(/```(?:python)?\s*\n([\s\S]*?)```/)
    if (fenceMatch) {
      code = fenceMatch[1].trim()
    } else {
      // Strip leading/trailing fences
      if (code.startsWith('```python\n')) code = code.slice('```python\n'.length)
      else if (code.startsWith('```python')) code = code.slice('```python'.length)
      else if (code.startsWith('```\n')) code = code.slice('```\n'.length)
      else if (code.startsWith('```')) code = code.slice('```'.length)
      if (code.endsWith('```')) code = code.slice(0, -'```'.length)
      code = code.trim()
    }

    if (!code || code.length < 20) return null

    // Build an AnalysisResult compatible with the existing compute pipeline
    const analysis: AnalysisResult = {
      domain: mapToDomain(problem.subjectCategory),
      problemType: 'verification',
      givenValues: {},
      unknowns: ['answer'],
      formulas: [],
      sympyCode: code,
      diagramHints: {
        diagramType: 'none',
        elementsToShow: [],
      },
    }

    return analysis
  } catch (err) {
    console.warn(`[SmartSolver/ComputeVerify] Failed to generate verification code for ${problem.id}:`, err)
    return null
  }
}

/**
 * Extract the final answer value from computed results.
 * Looks for a key named "answer" or takes the last computed value.
 */
function extractComputedAnswer(computed: { values: Record<string, { value: number; unit: string }> }): string {
  // Prefer a key named "answer", "result", or "final_answer"
  for (const key of ['answer', 'result', 'final_answer', 'final']) {
    if (computed.values[key]) {
      const cv = computed.values[key]
      return cv.unit ? `${cv.value} ${cv.unit}` : String(cv.value)
    }
  }

  // Fall back to the last value
  const keys = Object.keys(computed.values)
  if (keys.length > 0) {
    const lastKey = keys[keys.length - 1]
    const cv = computed.values[lastKey]
    return cv.unit ? `${cv.value} ${cv.unit}` : String(cv.value)
  }

  return ''
}

/**
 * Compute-verify a solved problem using E2B/SymPy.
 *
 * 1. Generates SymPy code to independently solve the problem
 * 2. Executes in E2B sandbox with self-debugging retry
 * 3. Runs sanity checks on the computed values
 * 4. Compares computed answer with AI's answer
 */
export async function computeVerifyProblem(
  client: Anthropic,
  problem: SolvedDecomposedProblem
): Promise<ComputeVerificationResult> {
  const startTime = performance.now()

  // Step A: Generate SymPy code for independent verification
  const analysis = await generateVerificationCode(client, problem)
  if (!analysis) {
    console.warn(`[SmartSolver/ComputeVerify] Could not generate verification code for ${problem.id}`)
    return {
      problemId: problem.id,
      computedAnswer: '',
      sympyCode: '',
      matchesAI: false,
      computeTimeMs: performance.now() - startTime,
      attempts: 0,
    }
  }

  // Step B: Execute in E2B sandbox (reuses existing infrastructure)
  const { computed, attempts } = await computeWithRetry(analysis, problem.questionText)
  if (!computed) {
    console.warn(`[SmartSolver/ComputeVerify] E2B computation failed for ${problem.id} after ${attempts} attempts`)
    return {
      problemId: problem.id,
      computedAnswer: '',
      sympyCode: analysis.sympyCode,
      matchesAI: false,
      computeTimeMs: performance.now() - startTime,
      attempts,
    }
  }

  // Step C: Run sanity checks on computed values
  const verification = await verifyComputed(computed, analysis, problem.questionText)
  if (!verification.allPassed) {
    console.warn(
      `[SmartSolver/ComputeVerify] Sanity checks failed for ${problem.id}: ${verification.failureReason}`
    )
    return {
      problemId: problem.id,
      computedAnswer: extractComputedAnswer(computed),
      sympyCode: analysis.sympyCode,
      matchesAI: false,
      computeTimeMs: performance.now() - startTime,
      attempts,
    }
  }

  // Step D: Compare computed answer with AI's answer
  const computedAnswer = extractComputedAnswer(computed)
  const matches = answersMatch(problem.finalAnswer, computedAnswer)

  console.log(
    `[SmartSolver/ComputeVerify] Problem ${problem.id}: ` +
    `AI="${problem.finalAnswer}", Computed="${computedAnswer}", ` +
    `match=${matches}, attempts=${attempts}, ` +
    `time=${Math.round(performance.now() - startTime)}ms`
  )

  return {
    problemId: problem.id,
    computedAnswer,
    sympyCode: analysis.sympyCode,
    matchesAI: matches,
    computeTimeMs: performance.now() - startTime,
    attempts,
  }
}
