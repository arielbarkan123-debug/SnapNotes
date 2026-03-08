/**
 * Smart Solver Pipeline — Orchestrator
 *
 * Ties together: Decompose → Solve → Compute-Verify → Auto-Retry
 *
 * Produces the same SolutionSet type that Phase 2 and Phase 3 consume,
 * so the rest of the homework checker pipeline is completely untouched.
 *
 * On any failure, falls back to the legacy extractAndSolveProblems.
 */

import type Anthropic from '@anthropic-ai/sdk'
import type { SolutionSet, VerifiedProblem } from '@/lib/homework/types'
import { decomposeProblems } from './decompose'
import { solveDecomposedProblem } from './solve'
import { computeVerifyProblem } from './compute-verify'
import { retryWithFeedback } from './retry'
import { isComputeVerifiable, getSubjectFromCategory } from './subject-utils'
import { answersMatch } from '@/lib/homework/math-verifier'
import type { SolvedDecomposedProblem, SmartSolverMetadata } from './types'

const MAX_RETRY_ATTEMPTS = 3
const PIPELINE_TIMEOUT_MS = 60000 // 60 seconds

/**
 * Smart solver entry point.
 *
 * Same signature as extractAndSolveProblems — drop-in replacement.
 * Returns the same SolutionSet type so Phase 2/3 are untouched.
 */
export async function smartExtractAndSolve(
  client: Anthropic,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  includeStudentAnswers: boolean,
  referenceImages: Array<{ base64: string; mediaType: string }> = []
): Promise<SolutionSet> {
  const startTime = performance.now()
  const metadata: SmartSolverMetadata = {
    pipelineUsed: true,
    totalAICalls: 0,
    totalComputeCalls: 0,
    totalTimeMs: 0,
    problemBreakdown: [],
  }

  try {
    // Wrap entire pipeline in a timeout
    const result = await Promise.race([
      runSmartPipeline(client, imageBase64, mediaType, includeStudentAnswers, referenceImages, metadata),
      timeoutPromise(PIPELINE_TIMEOUT_MS),
    ])

    metadata.totalTimeMs = performance.now() - startTime
    console.log(
      `[SmartSolver] Pipeline completed in ${Math.round(metadata.totalTimeMs)}ms, ` +
      `${metadata.totalAICalls} AI calls, ${metadata.totalComputeCalls} compute calls`
    )

    return result
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime)
    const reason = err instanceof Error ? err.message : 'Unknown error'
    console.warn(`[SmartSolver] Pipeline failed after ${elapsed}ms: ${reason}. Falling back to legacy.`)
    throw err // Let the caller (checker-engine) handle fallback
  }
}

/**
 * The core pipeline logic, separated for timeout wrapping.
 */
async function runSmartPipeline(
  client: Anthropic,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  includeStudentAnswers: boolean,
  referenceImages: Array<{ base64: string; mediaType: string }>,
  metadata: SmartSolverMetadata
): Promise<SolutionSet> {
  // ── Step 1: Classify & Decompose ──────────────────────────────────────────
  console.log('[SmartSolver] Step 1: Classify & Decompose...')
  const decomposition = await decomposeProblems(
    client, imageBase64, mediaType, includeStudentAnswers, referenceImages
  )
  metadata.totalAICalls++

  // ── Step 2: Solve Sub-Problems (parallel across problems) ─────────────────
  console.log(`[SmartSolver] Step 2: Solving ${decomposition.problems.length} problems...`)
  const solvedProblems: SolvedDecomposedProblem[] = await Promise.all(
    decomposition.problems.map(async (problem) => {
      const solved = await solveDecomposedProblem(client, problem, decomposition.detectedLanguage)
      metadata.totalAICalls++
      return solved
    })
  )

  // ── Step 3: Compute-Verify (math/physics only, parallel) ──────────────────
  const computeVerifiableProblems = solvedProblems.filter(p => isComputeVerifiable(p.subjectCategory))
  console.log(
    `[SmartSolver] Step 3: Compute-verifying ${computeVerifiableProblems.length}/${solvedProblems.length} problems...`
  )

  // Run compute verification in parallel for all eligible problems
  const computeResults = await Promise.all(
    computeVerifiableProblems.map(async (problem) => {
      metadata.totalAICalls++ // for SymPy code generation
      metadata.totalComputeCalls++
      return computeVerifyProblem(client, problem)
    })
  )

  // Build a map for quick lookup
  const computeResultMap = new Map(computeResults.map(r => [r.problemId, r]))

  // ── Step 4: Auto-Retry on Mismatch ────────────────────────────────────────
  const mismatches = computeResults.filter(r => !r.matchesAI && r.computedAnswer)
  if (mismatches.length > 0) {
    console.log(`[SmartSolver] Step 4: ${mismatches.length} mismatches, retrying...`)
  }

  for (const mismatch of mismatches) {
    const problemIdx = solvedProblems.findIndex(p => p.id === mismatch.problemId)
    if (problemIdx === -1) continue

    let currentProblem = solvedProblems[problemIdx]
    let resolved = false

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const retry = await retryWithFeedback(client, currentProblem, mismatch, attempt)
      metadata.totalAICalls++

      if (!retry) {
        console.warn(`[SmartSolver/Retry] Retry ${attempt} failed for ${mismatch.problemId}`)
        break
      }

      // Update the problem with corrected answer
      currentProblem = {
        ...currentProblem,
        finalAnswer: retry.correctedAnswer,
        solutionSteps: retry.correctedSteps.length > 0
          ? retry.correctedSteps
          : currentProblem.solutionSteps,
      }
      solvedProblems[problemIdx] = currentProblem

      // Check if the corrected answer matches compute
      if (answersMatch(retry.correctedAnswer, mismatch.computedAnswer)) {
        console.log(`[SmartSolver/Retry] Problem ${mismatch.problemId} resolved on attempt ${attempt}`)
        resolved = true
        break
      }
    }

    if (!resolved) {
      // Max retries exhausted — use compute answer if available
      console.warn(
        `[SmartSolver/Retry] Problem ${mismatch.problemId}: retries exhausted, ` +
        `using compute answer "${mismatch.computedAnswer}"`
      )
      solvedProblems[problemIdx] = {
        ...solvedProblems[problemIdx],
        finalAnswer: mismatch.computedAnswer,
      }
    }

    // Track retry info
    const breakdown = metadata.problemBreakdown.find(b => b.problemId === mismatch.problemId)
    if (breakdown) {
      breakdown.retryCount = resolved ? 1 : MAX_RETRY_ATTEMPTS
    }
  }

  // ── Convert to SolutionSet ────────────────────────────────────────────────
  const problems: VerifiedProblem[] = solvedProblems.map(p => {
    const computeResult = computeResultMap.get(p.id)
    const verified = computeResult ? computeResult.matchesAI : false

    // Track in metadata
    metadata.problemBreakdown.push({
      problemId: p.id,
      subjectCategory: p.subjectCategory,
      verificationStrategy: p.verificationStrategy,
      subProblemCount: p.subProblems.length,
      retryCount: 0,
      verified,
    })

    const verifiedProblem: VerifiedProblem = {
      id: p.id,
      questionText: p.questionText,
      subject: getSubjectFromCategory(p.subjectCategory),
      solutionSteps: p.solutionSteps,
      correctAnswer: p.finalAnswer,
      mathjsVerified: false,
      verificationStatus: computeResult
        ? (computeResult.matchesAI ? 'verified' : 'disagreement')
        : 'unverifiable',
    }

    // Carry student answer through (combined-image mode)
    if (p.studentAnswer) {
      verifiedProblem.studentAnswer = p.studentAnswer
      verifiedProblem.studentAnswerConfidence = p.studentAnswerConfidence
    }

    return verifiedProblem
  })

  console.log(
    `[SmartSolver] Converting to SolutionSet: ${problems.length} problems, ` +
    `${problems.filter(p => p.verificationStatus === 'verified').length} compute-verified`
  )

  return {
    problems,
    inputMode: includeStudentAnswers ? 'combined' : 'separate',
    detectedLanguage: decomposition.detectedLanguage,
  }
}

/**
 * Creates a promise that rejects after the specified timeout.
 */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Smart solver pipeline timed out after ${ms}ms`)), ms)
  )
}
