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

/**
 * Generate layered TikZ code + step metadata for a question.
 *
 * Flow:
 * 1. Build the TikZ prompt with added layer instructions
 * 2. AI generates layered TikZ code
 * 3. AI generates step metadata JSON
 * 4. Validate and return StepByStepSource
 */
export async function generateLayeredTikz(
  question: string,
): Promise<StepByStepSource | null> {
  try {
    console.log(`[LayeredTikZ] Generating for: "${question.slice(0, 80)}..."`)

    // Build prompt with layer instructions appended
    const basePrompt = buildTikzPrompt(question)
    const systemPrompt = basePrompt + LAYERED_TIKZ_INSTRUCTIONS

    // Step 1: Generate the layered TikZ code
    const tikzResponse = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate layered TikZ code (with % === LAYER N === markers) for:\n\n${question}`,
        },
      ],
    })

    const tikzBlock = tikzResponse.content.find(b => b.type === 'text')
    if (!tikzBlock || tikzBlock.type !== 'text') {
      console.warn('[LayeredTikZ] No text in response')
      return null
    }

    let tikzCode = tikzBlock.text

    // Strip markdown code fences if present
    const codeMatch = tikzCode.match(/```(?:latex|tex|tikz|plaintext)?\s*\n([\s\S]*?)```/)
    if (codeMatch) {
      tikzCode = codeMatch[1].trim()
    }

    // Validate it has layer markers
    if (!tikzCode.includes('% === LAYER')) {
      console.warn('[LayeredTikZ] Generated code has no layer markers')
      return null
    }

    if (!tikzCode.includes('\\begin{tikzpicture}')) {
      console.warn('[LayeredTikZ] Generated code is not valid TikZ')
      return null
    }

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
      console.warn('[LayeredTikZ] No metadata in response')
      return null
    }

    // Parse JSON from response
    const jsonMatch = metaBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[LayeredTikZ] Could not parse metadata JSON')
      return null
    }

    const metadata = JSON.parse(jsonMatch[0])

    const source: StepByStepSource = {
      tikzCode,
      steps: metadata.steps,
    }

    // Validate structure
    if (!validateStepByStepSource(source)) {
      console.warn('[LayeredTikZ] Source validation failed')
      return null
    }

    console.log(`[LayeredTikZ] Generated ${source.steps.length} layers successfully`)
    return source
  } catch (err) {
    console.error('[LayeredTikZ] Error:', err)
    return null
  }
}
