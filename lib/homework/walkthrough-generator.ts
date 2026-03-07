/**
 * Walkthrough Generator
 *
 * Makes a single Claude call to generate a structured step-by-step solution
 * with layered TikZ code and bilingual explanations. Returns a WalkthroughSolution
 * that can be streamed to the client and compiled into step images.
 */

import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { TIKZ_CORE_PROMPT } from '@/lib/diagram-engine/tikz/core-prompt'
import type { WalkthroughSolution, WalkthroughStep } from '@/types/walkthrough'

// ============================================================================
// Prompt
// ============================================================================

const WALKTHROUGH_SYSTEM_PROMPT = `You are an expert math and physics tutor creating a step-by-step solution walkthrough.

Your task: Given a student's question, produce a STRUCTURED JSON response containing:
1. A step-by-step solution with bilingual explanations
2. Complete layered TikZ code with LAYER markers for an evolving diagram

${TIKZ_CORE_PROMPT}

ADDITIONAL RULES FOR WALKTHROUGH TikZ:
- Structure TikZ with % === LAYER N: Description === markers (one per solution step)
- Each LAYER adds NEW elements cumulative to the diagram
- Use ABSOLUTE coordinates only — elements must not shift when earlier layers are hidden
- Keep total TikZ code under 3000 characters (it will be compiled multiple times)
- Aim for 3-5 layers matching your solution steps
- DO NOT use \\color{red} in the TikZ code — the highlighting system handles that automatically

RESPONSE FORMAT — Output ONLY valid JSON, no markdown fences:
{
  "steps": [
    {
      "index": 0,
      "title": "Short title (3-6 words)",
      "titleHe": "כותרת קצרה בעברית",
      "explanation": "1-3 sentence explanation with inline LaTeX math ($...$). Explain the WHY, not just WHAT.",
      "explanationHe": "הסבר בעברית עם נוסחאות LaTeX",
      "equation": "v_x = v_0 \\\\cos\\\\theta = 20 \\\\cos 30^{\\\\circ} = 17.32 \\\\text{ m/s}",
      "newElements": "Brief description of new diagram elements"
    }
  ],
  "tikzCode": "\\\\usetikzlibrary{arrows.meta}\\n\\\\begin{tikzpicture}[scale=1.5]\\n% === LAYER 1: Setup scene ===\\n...\\n% === LAYER 2: Add forces ===\\n...\\n\\\\end{tikzpicture}",
  "finalAnswer": "The range is approximately 47.5 meters",
  "finalAnswerHe": "הטווח הוא כ-47.5 מטר"
}

STEP GUIDELINES:
- 3-5 steps total (not more, not fewer)
- Step 1: Identify given information and set up the problem
- Middle steps: Show key calculations/derivations
- Last step: State the final answer and verify
- Each step's explanation MUST use inline LaTeX: $v_0 = 20$ m/s, NOT "v₀ = 20 m/s"
- The "equation" field should contain the KEY equation for that step in LaTeX
- Hebrew translations must be natural, not word-for-word

TIKZ LAYER ORDER (must match steps 1:1):
- LAYER 1 → matches step[0] (index 0)
- LAYER 2 → matches step[1] (index 1)
- etc.
- Number of LAYER markers MUST equal number of steps`

// ============================================================================
// Generator
// ============================================================================

/**
 * Generate a structured walkthrough solution from a question.
 *
 * Returns the parsed WalkthroughSolution or throws on failure.
 * The caller should handle errors and update generation_status accordingly.
 */
export async function generateWalkthroughSolution(
  questionText: string,
  imageUrls?: string[],
): Promise<WalkthroughSolution> {
  const anthropic = getAnthropicClient()

  // Build user message with optional images
  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }> = []

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      userContent.push({
        type: 'image' as const,
        source: { type: 'url' as const, url },
      })
    }
  }

  userContent.push({
    type: 'text',
    text: `Generate a step-by-step solution walkthrough for this question:\n\n${questionText}\n\nRespond with ONLY the JSON object. No markdown, no explanation, no code fences.`,
  })

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: WALKTHROUGH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userContent as Anthropic.Messages.ContentBlockParam[],
      },
    ],
  })

  // Extract text response
  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON (strip markdown fences if present)
  let jsonText = textBlock.text.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim()
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`Failed to parse walkthrough JSON: ${jsonText.slice(0, 200)}`)
    }
    parsed = JSON.parse(jsonMatch[0])
  }

  // Validate structure
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Walkthrough response missing steps array')
  }
  if (typeof parsed.tikzCode !== 'string' || !parsed.tikzCode.includes('\\begin{tikzpicture}')) {
    throw new Error('Walkthrough response missing valid tikzCode')
  }

  // Build typed solution
  const steps: WalkthroughStep[] = (parsed.steps as Array<Record<string, unknown>>).map((s, i) => ({
    index: typeof s.index === 'number' ? s.index : i,
    title: String(s.title || `Step ${i + 1}`),
    titleHe: String(s.titleHe || s.title || `שלב ${i + 1}`),
    explanation: String(s.explanation || ''),
    explanationHe: String(s.explanationHe || s.explanation || ''),
    equation: s.equation ? String(s.equation) : undefined,
    newElements: s.newElements ? String(s.newElements) : undefined,
  }))

  return {
    steps,
    tikzCode: String(parsed.tikzCode),
    finalAnswer: String(parsed.finalAnswer || ''),
    finalAnswerHe: String(parsed.finalAnswerHe || parsed.finalAnswer || ''),
  }
}

// Type import for Anthropic SDK (only used for type annotation)
import type Anthropic from '@anthropic-ai/sdk'
