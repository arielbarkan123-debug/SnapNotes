/**
 * Layered TikZ Generator
 *
 * Generates layered TikZ code (with LAYER markers) for a given question.
 * Called alongside normal diagram generation to produce step-by-step source.
 * Only works for TikZ-pipeline questions.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { buildTikzPrompt } from './tikz'
import { LAYERED_TIKZ_INSTRUCTIONS, STEP_METADATA_PROMPT } from './tikz/layered-tikz-prompt'
import { validateStepByStepSource } from './step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:layered-tikz-generator')

/**
 * Generate layered TikZ code + step metadata for a question.
 *
 * Flow:
 * 1. Build the TikZ prompt with added layer instructions
 * 2. AI generates layered TikZ code
 * 3. AI generates step metadata JSON
 * 4. Validate and return StepByStepSource
 */
/**
 * Generate layered TikZ code from AI, with retry on missing LAYER markers.
 */
async function generateTikzWithLayers(
  systemPrompt: string,
  question: string,
  attempt: number,
): Promise<string | null> {
  const userContent = attempt === 1
    ? `IMPORTANT: Structure your TikZ code with % === LAYER N: description === markers for step-by-step teaching.
Use 3-6 layers. Each layer ADDS new elements cumulatively.

Generate layered TikZ code for:

${question}`
    : `Your previous response did NOT include the required % === LAYER N === markers.

You MUST include layer markers. Here is the exact format:

\\begin{tikzpicture}
% === LAYER 1: Setup the scene ===
\\draw ...
% === LAYER 2: Add first element ===
\\draw ...
% === LAYER 3: Add final result ===
\\node ...
\\end{tikzpicture}

Now generate the layered TikZ code with LAYER markers for:

${question}`

  const tikzResponse = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  const tikzBlock = tikzResponse.content.find(b => b.type === 'text')
  if (!tikzBlock || tikzBlock.type !== 'text') {
    log.warn({ attempt }, 'No text in response')
    return null
  }

  let tikzCode = tikzBlock.text

  // Strip markdown code fences if present
  const codeMatch = tikzCode.match(/```(?:latex|tex|tikz|plaintext)?\s*\n([\s\S]*?)```/)
  if (codeMatch) {
    tikzCode = codeMatch[1].trim()
  }

  if (!tikzCode.includes('% === LAYER')) {
    log.warn({ attempt }, 'No layer markers in output')
    return null
  }

  if (!tikzCode.includes('\\begin{tikzpicture}')) {
    log.warn({ attempt }, 'Not valid TikZ')
    return null
  }

  return tikzCode
}

export async function generateLayeredTikz(
  question: string,
): Promise<StepByStepSource | null> {
  try {
    log.info({ question: question.slice(0, 80) }, 'Generating layered TikZ')

    // Build prompt with layer instructions appended
    const basePrompt = buildTikzPrompt(question)
    const systemPrompt = basePrompt + LAYERED_TIKZ_INSTRUCTIONS

    // Step 1: Generate layered TikZ code (with 1 retry on missing markers)
    let tikzCode = await generateTikzWithLayers(systemPrompt, question, 1)
    if (!tikzCode) {
      log.info('Retrying with explicit layer format...')
      tikzCode = await generateTikzWithLayers(systemPrompt, question, 2)
    }

    if (!tikzCode) {
      log.warn('Both attempts failed to produce layered code')
      return null
    }

    log.info({ chars: tikzCode.length }, 'Got layered TikZ code')

    // Step 2: Generate step metadata
    const metaResponse = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: 'You are a helpful assistant that generates JSON metadata.',
      messages: [
        {
          role: 'user',
          content: `Here is a layered TikZ diagram:\n\n${tikzCode}\n\n${STEP_METADATA_PROMPT}`,
        },
      ],
    })

    const metaBlock = metaResponse.content.find(b => b.type === 'text')
    if (!metaBlock || metaBlock.type !== 'text') {
      log.warn('No metadata in response')
      return null
    }

    // Parse JSON from response
    const jsonMatch = metaBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      log.warn('Could not parse metadata JSON')
      return null
    }

    const metadata = JSON.parse(jsonMatch[0])

    const source: StepByStepSource = {
      tikzCode,
      steps: metadata.steps,
    }

    // Validate structure
    if (!validateStepByStepSource(source)) {
      log.warn('Source validation failed')
      return null
    }

    log.info({ layers: source.steps.length }, 'Generated layers successfully')
    return source
  } catch (err) {
    log.error({ err: err }, 'Error:')
    return null
  }
}
