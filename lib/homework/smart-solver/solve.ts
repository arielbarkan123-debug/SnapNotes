/**
 * Smart Solver — Step 2: Solve Sub-Problems
 *
 * For each DecomposedProblem, batches all sub-problems into ONE Claude call.
 * Sub-problems are provided in dependency order with context chaining —
 * each sub-problem's result feeds into the next.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import type {
  DecomposedProblem,
  SolvedDecomposedProblem,
  SubProblemSolution,
} from './types'

const MAX_TOKENS = 4096

/**
 * Solve all sub-problems for a single decomposed problem.
 *
 * Uses a single Claude call with all sub-problems listed in order.
 * The AI solves them sequentially within the response, building
 * on previous sub-problem results.
 */
export async function solveDecomposedProblem(
  client: Anthropic,
  problem: DecomposedProblem,
  detectedLanguage: string
): Promise<SolvedDecomposedProblem> {
  const langInstruction = detectedLanguage === 'he'
    ? 'Respond in Hebrew where the question is in Hebrew. Math expressions should remain in LTR format.'
    : ''

  const subProblemList = problem.subProblems
    .sort((a, b) => a.order - b.order)
    .map(sp => {
      const deps = sp.dependsOn.length > 0
        ? `(uses results from: ${sp.dependsOn.join(', ')})`
        : '(no dependencies)'
      const given = Object.entries(sp.givenValues).length > 0
        ? `Given: ${Object.entries(sp.givenValues).map(([k, v]) => `${k}=${v}`).join(', ')}`
        : ''
      return `  ${sp.id}: ${sp.description}
    Method: ${sp.formulaOrMethod}
    ${given}
    ${deps}`
    })
    .join('\n')

  const prompt = `You are a meticulous problem solver. Solve this problem by working through each sub-problem in order.

## PROBLEM:
${problem.questionText}

## SUB-PROBLEMS (solve in this exact order, using results from previous steps):
${subProblemList}

## RULES:
- Solve each sub-problem ONE AT A TIME
- Show your work for EVERY calculation
- Use results from earlier sub-problems where indicated
- Double-check every arithmetic operation
- The final sub-problem's result IS the final answer
${langInstruction}

## Response format (JSON only):
{
  "subProblemSolutions": [
    {
      "subProblemId": "q1_sub1",
      "result": "the answer to this sub-problem",
      "workShown": "step-by-step work for this sub-problem",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "finalAnswer": "the final answer to the entire problem",
  "solutionSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}

Respond with ONLY the JSON, no other text.`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  return parseSolveResponse(response, problem)
}

/**
 * Parse the Claude response into a SolvedDecomposedProblem.
 */
function parseSolveResponse(
  response: Anthropic.Message,
  problem: DecomposedProblem
): SolvedDecomposedProblem {
  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error(`[SmartSolver/Solve] No text in response for problem ${problem.id}`)
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`[SmartSolver/Solve] No JSON found in response for problem ${problem.id}`)
  }

  const parsed = JSON.parse(jsonMatch[0])

  const subProblemSolutions: SubProblemSolution[] = Array.isArray(parsed.subProblemSolutions)
    ? parsed.subProblemSolutions.map((s: Record<string, unknown>) => ({
        subProblemId: String(s.subProblemId || ''),
        result: String(s.result || ''),
        workShown: String(s.workShown || ''),
        confidence: validateConfidence(s.confidence),
      }))
    : []

  const solutionSteps: string[] = Array.isArray(parsed.solutionSteps)
    ? parsed.solutionSteps.map(String)
    : subProblemSolutions.map(s => s.workShown).filter(Boolean)

  const finalAnswer = String(parsed.finalAnswer || '')

  if (!finalAnswer) {
    throw new Error(`[SmartSolver/Solve] No final answer for problem ${problem.id}`)
  }

  console.log(
    `[SmartSolver/Solve] Problem ${problem.id}: ` +
    `${subProblemSolutions.length} sub-solutions, answer: "${finalAnswer.slice(0, 50)}"`
  )

  return {
    ...problem,
    subProblemSolutions,
    finalAnswer,
    solutionSteps,
  }
}

function validateConfidence(value: unknown): 'high' | 'medium' | 'low' {
  if (typeof value === 'string' && ['high', 'medium', 'low'].includes(value)) {
    return value as 'high' | 'medium' | 'low'
  }
  return 'medium'
}
