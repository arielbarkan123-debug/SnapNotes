/**
 * Step Sequence Generator
 *
 * Decomposes a multi-step problem into 3-7 visual steps,
 * generates a diagram for each step using the engine.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { generateDiagram } from './index'
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:step-sequence')

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiagramStep {
  stepNumber: number
  title: string
  titleHe: string
  explanation: string
  explanationHe: string
  diagramPrompt: string
  diagramImageUrl: string | null
  pipeline: string | null
  highlightWhat: string
}

export interface StepSequenceResult {
  question: string
  totalSteps: number
  steps: DiagramStep[]
  summary: string
  summaryHe: string
  partial: boolean // true if some diagrams failed
}

// ─── Step Decomposition via Claude ───────────────────────────────────────────

const DECOMPOSE_SYSTEM_PROMPT = `You are a math/science tutor breaking down a problem into clear visual steps.

Given a question, decompose the solution into 3-5 steps. Each step should be a clear, self-contained stage of the solution.

Return JSON (no markdown):
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title in English",
      "titleHe": "Step title in Hebrew",
      "explanation": "Clear 1-3 sentence explanation in English",
      "explanationHe": "Same explanation in Hebrew",
      "diagramPrompt": "A specific prompt to generate a diagram showing THIS step visually. Be concrete: mention exact values, coordinates, shapes, labels.",
      "highlightWhat": "What new element appears in this step (e.g., 'the discriminant calculation')"
    }
  ],
  "summary": "One sentence English summary of the full solution",
  "summaryHe": "Same summary in Hebrew"
}

Rules:
- 3-5 steps maximum (prefer 3-4 for simple problems)
- Each diagramPrompt must be specific enough to generate a standalone diagram
- Include actual numbers/values from the problem in diagramPrompt
- Steps should build on each other logically
- Keep explanations concise but clear
- Always provide both English and Hebrew`

async function decomposeIntoSteps(question: string): Promise<{
  steps: Array<{
    stepNumber: number
    title: string
    titleHe: string
    explanation: string
    explanationHe: string
    diagramPrompt: string
    highlightWhat: string
  }>
  summary: string
  summaryHe: string
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: DECOMPOSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse step decomposition response')
  }

  return JSON.parse(jsonMatch[0])
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generate a step-by-step diagram sequence for a multi-step problem.
 *
 * 1. Claude decomposes the problem into 3-5 steps
 * 2. Each step's diagramPrompt is sent to generateDiagram() sequentially
 * 3. Failed diagrams are skipped (partial: true)
 * 4. Returns the full sequence for the frontend StepSequencePlayer
 */
export async function generateStepSequence(
  question: string,
  _context?: { subject?: string; language?: string },
): Promise<StepSequenceResult> {
  log.info({ question: question.slice(0, 80) }, 'Generating step sequence')

  // Step 1: Decompose problem into steps via Claude
  const decomposition = await decomposeIntoSteps(question)

  if (!decomposition.steps || decomposition.steps.length === 0) {
    throw new Error('No steps generated from decomposition')
  }

  log.info({ stepCount: decomposition.steps.length }, 'Decomposed into steps')

  // Step 2: Generate diagrams sequentially (avoid rate limits)
  const steps: DiagramStep[] = []
  let hasFailures = false

  for (const step of decomposition.steps) {
    log.info({ stepNumber: step.stepNumber, prompt: step.diagramPrompt.slice(0, 60) }, 'Generating diagram for step')

    try {
      const result = await generateDiagram(step.diagramPrompt)

      if ('error' in result) {
        log.warn({ stepNumber: step.stepNumber, error: result.error }, 'Step diagram failed')
        hasFailures = true
        steps.push({
          ...step,
          diagramImageUrl: null,
          pipeline: null,
        })
      } else {
        steps.push({
          ...step,
          diagramImageUrl: result.imageUrl,
          pipeline: result.pipeline,
        })
      }
    } catch (err) {
      log.error({ stepNumber: step.stepNumber, err }, 'Step diagram error')
      hasFailures = true
      steps.push({
        ...step,
        diagramImageUrl: null,
        pipeline: null,
      })
    }
  }

  const successCount = steps.filter(s => s.diagramImageUrl).length
  log.info({ successCount, total: steps.length }, 'Step sequence complete')

  return {
    question,
    totalSteps: steps.length,
    steps,
    summary: decomposition.summary,
    summaryHe: decomposition.summaryHe,
    partial: hasFailures,
  }
}

/**
 * Check if a question is suitable for step sequence (multi-step problem).
 * Simple concept questions should use single diagrams.
 */
export function isMultiStepProblem(question: string): boolean {
  const multiStepIndicators = [
    /solve/i, /calculate/i, /find\s+(the|x|y)/i, /compute/i,
    /prove/i, /derive/i, /show\s+that/i, /evaluate/i,
    /simplify/i, /factor/i, /expand/i, /integrate/i,
    /differentiate/i, /graph/i, /sketch/i,
    /step.by.step/i, /how\s+to/i, /work\s+out/i,
    /\d+\s*[+\-*/×÷=]\s*\d+/,  // Math expressions
    /x\s*[²³]|x\^/i,  // Polynomial expressions
    // Hebrew indicators
    /פתור/i, /חשב/i, /מצא/i, /הוכח/i,
  ]

  return multiStepIndicators.some(pattern => pattern.test(question))
}
