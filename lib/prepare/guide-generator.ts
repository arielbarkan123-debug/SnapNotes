/**
 * Study Guide Generator
 * Generates comprehensive study guides using Claude AI
 * Includes retry logic, JSON repair, and validation
 */

import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedGuide } from '@/types/prepare'
import type { UserLearningContext } from '@/lib/ai/prompts'

const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 16000
const MAX_RETRIES = 1
const RETRY_DELAY_MS = 2000

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey, timeout: 600000 })
  }
  return anthropicClient
}

function buildLanguageInstruction(language?: 'en' | 'he'): string {
  if (language === 'he') {
    return `\n## Language Requirement - CRITICAL
Respond ONLY in Hebrew (עברית).
- All content, definitions, explanations, and examples must be in Hebrew
- Keep mathematical notation, formulas, and chemical symbols standard
- Use proper Hebrew academic terminology
- Section type identifiers (overview, definitions, theory, etc.) must remain in English for parsing\n`
  }
  return ''
}

function buildLearningContextInstruction(context?: UserLearningContext): string {
  if (!context) return ''

  const parts: string[] = []

  if (context.educationLevel) {
    const levels: Record<string, string> = {
      elementary: 'elementary school student',
      middle_school: 'middle school student',
      high_school: 'high school student',
      university: 'university student',
      graduate: 'graduate student',
      professional: 'professional',
    }
    parts.push(`Education Level: ${levels[context.educationLevel] || context.educationLevel}`)
  }

  if (context.studySystem && context.studySystem !== 'general') {
    const systems: Record<string, string> = {
      us: 'US education system',
      uk: 'UK education system',
      israeli_bagrut: 'Israeli Bagrut system',
      ib: 'International Baccalaureate (IB)',
      ap: 'Advanced Placement (AP)',
    }
    parts.push(`Study System: ${systems[context.studySystem] || context.studySystem}`)
  }

  if (context.studyGoal) {
    const goals: Record<string, string> = {
      exam_prep: 'preparing for an exam',
      general_learning: 'general learning and understanding',
      skill_improvement: 'improving skills and knowledge',
    }
    parts.push(`Study Goal: ${goals[context.studyGoal] || context.studyGoal}`)
  }

  if (parts.length === 0) return ''

  return `\n## Student Context
${parts.join('\n')}\n`
}

const GUIDE_GENERATION_SYSTEM = `You are an expert educational content creator specializing in comprehensive study guides.

## Your Task
Generate a structured study guide from the provided content. The guide should be:
- Comprehensive and exam-ready
- Well-organized with clear topic separation
- Rich with definitions, examples, formulas, and model answers
- Scannable with tables for quick reference

## Output Format
Return ONLY valid JSON matching this exact structure:

{
  "title": "Guide title",
  "subtitle": "Brief description",
  "subject": "Subject name",
  "estimatedReadingTime": 15,
  "topics": [
    {
      "id": "topic-1",
      "title": "Topic Title",
      "sections": [
        {
          "id": "topic-1-overview",
          "type": "overview",
          "title": "Overview",
          "content": "Markdown content with key concepts...",
          "order": 0
        },
        {
          "id": "topic-1-definitions",
          "type": "definitions",
          "title": "Key Definitions",
          "content": "**Term 1**: Definition here\\n\\n**Term 2**: Definition here",
          "tables": [
            {
              "headers": ["Term", "Definition", "Example"],
              "rows": [["Term 1", "Definition", "Example"]],
              "caption": "Key terms"
            }
          ],
          "order": 1
        },
        {
          "id": "topic-1-theory",
          "type": "theory",
          "title": "Theory & Explanation",
          "content": "Detailed explanation with markdown formatting...",
          "order": 2
        },
        {
          "id": "topic-1-examples",
          "type": "examples",
          "title": "Real-World Examples",
          "content": "Examples connecting theory to real world...",
          "tables": [
            {
              "headers": ["Event/Scenario", "What Happened", "Connection to Theory"],
              "rows": [["Example 1", "Description", "How it relates"]]
            }
          ],
          "order": 3
        },
        {
          "id": "topic-1-formula",
          "type": "formula",
          "title": "Key Formulas",
          "content": "Important formulas with LaTeX notation: $formula$",
          "order": 4
        },
        {
          "id": "topic-1-questions",
          "type": "possible_questions",
          "title": "Possible Exam Questions",
          "content": "1. Question one?\\n2. Question two?",
          "order": 5
        },
        {
          "id": "topic-1-model",
          "type": "model_answer",
          "title": "Model Answer",
          "content": "Paragraph-by-paragraph model answer...",
          "subsections": [
            {
              "id": "topic-1-model-intro",
              "title": "Introduction",
              "content": "Opening paragraph...",
              "order": 0
            }
          ],
          "order": 6
        }
      ],
      "order": 0
    }
  ],
  "quickReference": {
    "id": "quick-ref",
    "type": "quick_reference",
    "title": "Quick Reference",
    "content": "Summary of all key points...",
    "tables": [
      {
        "headers": ["Topic", "Key Point", "Formula/Rule"],
        "rows": [["Topic 1", "Main takeaway", "Key formula"]]
      }
    ],
    "order": 999
  },
  "youtubeSearchQueries": [
    "topic 1 explained for students",
    "topic 2 tutorial",
    "subject exam preparation tips"
  ]
}

## Section Type Guidelines
- **overview**: Brief introduction to the topic (2-3 sentences)
- **definitions**: Key terms with clear definitions. Use tables for multiple terms.
- **theory**: Detailed conceptual explanation. Use markdown headers, lists, bold for emphasis.
- **examples**: Real-world examples connecting theory to practice. Use tables for structured examples.
- **model_answer**: Full model essay/answer with clear paragraph structure. Use subsections for paragraphs.
- **formula**: Mathematical formulas with LaTeX notation ($formula$). Include when to use each formula.
- **comparison**: Compare/contrast table between concepts. Must include tables.
- **quick_reference**: Summary table of all key points across topics.
- **possible_questions**: Likely exam questions. Number them clearly.

## Rules
- Generate 3-8 topics depending on content richness
- Each topic should have 3-7 sections
- Include at least one table per topic where appropriate
- Model answers should be exam-quality with clear structure
- Include youtubeSearchQueries (3-6 queries) for finding relevant educational videos
- Content should be dense and comprehensive - this is a study reference, not a beginner tutorial
- Use LaTeX notation ($...$) for math formulas
- Return ONLY the JSON object, no surrounding text or code fences`

// ============================================================================
// JSON Repair for truncated or slightly malformed AI responses
// ============================================================================

function repairJSON(text: string): string {
  let json = text

  // Remove trailing commas before } or ]
  json = json.replace(/,\s*([\]}])/g, '$1')

  // Find the first opening brace
  const firstBrace = json.indexOf('{')
  if (firstBrace < 0) return json

  // Walk through and track brace depth to find the main JSON object
  let depth = 0
  let lastValidClose = -1

  for (let i = firstBrace; i < json.length; i++) {
    const ch = json[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      lastValidClose = i
      if (depth === 0) break
    }
  }

  if (depth > 0 && lastValidClose >= 0) {
    // Truncated JSON — trim to last valid position and try to close
    json = json.slice(firstBrace, lastValidClose + 1)

    // Remove any incomplete trailing key-value
    json = json.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '')

    // Close remaining open braces/brackets
    const openBraces = (json.match(/\{/g) || []).length - (json.match(/\}/g) || []).length
    const openBrackets = (json.match(/\[/g) || []).length - (json.match(/\]/g) || []).length

    if (openBrackets > 0) {
      json += ']'.repeat(openBrackets)
    }
    if (openBraces > 0) {
      json += '}'.repeat(openBraces)
    }

    console.log('[GuideGen] Repaired truncated JSON')
  } else if (depth === 0 && lastValidClose >= 0) {
    // Complete JSON — just trim to the main object
    json = json.slice(firstBrace, lastValidClose + 1)
  }

  return json
}

// ============================================================================
// Validation and Normalization
// ============================================================================

function validateGuide(guide: GeneratedGuide): string[] {
  const errors: string[] = []

  if (!guide.title?.trim()) errors.push('Missing title')

  if (!guide.topics || !Array.isArray(guide.topics)) {
    errors.push('Missing or invalid topics array')
    return errors
  }

  if (guide.topics.length === 0) errors.push('No topics generated')

  for (const topic of guide.topics) {
    if (!topic.title?.trim()) errors.push('Topic missing title')
    if (!topic.sections || !Array.isArray(topic.sections)) {
      errors.push(`Topic "${topic.title || 'untitled'}" has no sections`)
    } else {
      for (const section of topic.sections) {
        if (!section.type) {
          errors.push(`Section missing type in topic "${topic.title || 'untitled'}"`)
        }
      }
    }
  }

  return errors
}

function normalizeGuide(guide: GeneratedGuide): GeneratedGuide {
  guide.generatedAt = new Date().toISOString()
  guide.estimatedReadingTime = guide.estimatedReadingTime || 10

  guide.topics = (guide.topics || []).map((topic, ti) => ({
    ...topic,
    id: topic.id || `topic-${ti + 1}`,
    order: topic.order ?? ti,
    sections: (topic.sections || []).map((section, si) => ({
      ...section,
      id: section.id || `topic-${ti + 1}-${section.type || `section-${si}`}`,
      order: section.order ?? si,
    })),
  }))

  if (guide.quickReference) {
    guide.quickReference = {
      ...guide.quickReference,
      id: guide.quickReference.id || 'quick-ref',
      type: 'quick_reference',
      order: guide.quickReference.order ?? 999,
    }
  }

  return guide
}

// ============================================================================
// Guide Generation
// ============================================================================

export interface GuideGenerationOptions {
  content: string
  imageUrls?: string[]
  learningContext?: UserLearningContext
  language?: 'en' | 'he'
}

export async function generateGuide(options: GuideGenerationOptions): Promise<GeneratedGuide> {
  const { content, imageUrls, learningContext, language } = options
  const client = getAnthropicClient()

  const languageInstruction = buildLanguageInstruction(language)
  const contextInstruction = buildLearningContextInstruction(learningContext)
  const systemPrompt = GUIDE_GENERATION_SYSTEM + languageInstruction + contextInstruction

  // Build message content — supports both text and multimodal (image) inputs
  const userContent: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = []

  if (imageUrls?.length) {
    for (const url of imageUrls) {
      userContent.push({
        type: 'image',
        source: { type: 'url', url },
      })
    }
    userContent.push({
      type: 'text',
      text: 'Generate a comprehensive study guide from the content shown in these images. Extract all text, formulas, diagrams, and tables visible in the images.',
    })
  } else {
    userContent.push({
      type: 'text',
      text: `Generate a comprehensive study guide from this content:\n\n${content.slice(0, 30000)}`,
    })
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[GuideGen] Retry attempt ${attempt}/${MAX_RETRIES}`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }

      // Use streaming to avoid connection timeouts on long generations
      const stream = client.messages.stream({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      })

      let rawText = ''
      let lastLogTime = Date.now()
      let stopReason = ''

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          rawText += event.delta.text
        } else if (event.type === 'message_delta') {
          stopReason = (event as { delta?: { stop_reason?: string } }).delta?.stop_reason || ''
        }
        // Log progress every 15s
        const now = Date.now()
        if (now - lastLogTime > 15000) {
          console.log(`[GuideGen] Streaming: ${rawText.length} chars`)
          lastLogTime = now
        }
      }

      console.log(`[GuideGen] Stream complete: ${rawText.length} chars, stop_reason: ${stopReason}`)

      if (!rawText) {
        throw new Error('No text response from AI')
      }

      // If truncated by max_tokens, the JSON will be incomplete — repair will handle it
      if (stopReason === 'max_tokens') {
        console.warn('[GuideGen] Response truncated by max_tokens — will attempt repair')
      }

      // Extract JSON — try bare JSON first, then code-fenced
      let jsonText = rawText.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonText) {
        const codeFence = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (codeFence) jsonText = codeFence[1].match(/\{[\s\S]*\}/)?.[0]
      }

      if (!jsonText) {
        throw new Error('No JSON found in AI response')
      }

      // Parse JSON — attempt repair if initial parse fails
      let parsed: GeneratedGuide
      try {
        parsed = JSON.parse(jsonText)
      } catch {
        console.log('[GuideGen] JSON parse failed, attempting repair...')
        const repaired = repairJSON(jsonText)
        try {
          parsed = JSON.parse(repaired)
          console.log('[GuideGen] JSON repair successful')
        } catch (repairErr) {
          throw new Error(
            `Failed to parse guide JSON: ${repairErr instanceof Error ? repairErr.message : 'Unknown'}`
          )
        }
      }

      // Validate structure
      const validationErrors = validateGuide(parsed)
      if (validationErrors.length > 0) {
        const isCritical = validationErrors.some(
          (e) => e.includes('Missing or invalid topics') || e.includes('No topics')
        )
        if (isCritical && attempt < MAX_RETRIES) {
          console.warn('[GuideGen] Critical validation errors, retrying:', validationErrors)
          lastError = new Error(`Validation failed: ${validationErrors.join('; ')}`)
          continue
        }
        if (!isCritical) {
          console.warn('[GuideGen] Non-critical validation warnings:', validationErrors)
        }
      }

      return normalizeGuide(parsed)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown generation error')
      console.error(`[GuideGen] Attempt ${attempt + 1} failed:`, lastError.message)

      // Don't retry on auth errors
      if (lastError.message.includes('API key') || lastError.message.includes('authentication')) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Guide generation failed after all retries')
}
