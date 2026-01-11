/**
 * Reference Analyzer
 * Analyzes uploaded reference materials (textbook pages, diagrams, tables)
 * and extracts relevant information for tutoring context
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ReferenceAnalysis, QuestionAnalysis, RelevantSection } from './types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096
const MAX_IMAGES_PER_REQUEST = 10

// Initialize Anthropic client (singleton)
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// ============================================================================
// Prompts
// ============================================================================

const REFERENCE_ANALYSIS_PROMPT = `You are an expert educational analyst helping a student with their homework.

The student has uploaded reference materials (textbook pages, formula sheets, diagrams, tables, etc.) along with their homework question.

HOMEWORK QUESTION:
{questionText}

TOPIC: {topic}
REQUIRED CONCEPTS: {concepts}

## ACCURACY REQUIREMENTS:
1. **EXACT FORMULA EXTRACTION**: Copy formulas EXACTLY as written - every symbol, subscript, superscript matters
2. **NO GUESSING**: If text is unclear, mark it as [unclear] rather than guessing
3. **VERIFY RELEVANCE**: Only mark content as highly relevant (>0.8) if it DIRECTLY applies to solving the question
4. **COMPLETE DEFINITIONS**: Include the FULL definition, not abbreviated versions
5. **PRESERVE CONTEXT**: Note any conditions or limitations mentioned with formulas

## Your task:
1. Extract all text content from the reference images ACCURATELY
2. Identify which sections are most relevant to solving the homework question
3. Extract key formulas EXACTLY as written (symbols, subscripts, everything)
4. Extract key definitions COMPLETELY (don't abbreviate)
5. Note any worked examples that demonstrate similar problem-solving

Return your analysis as JSON:
{
  "extractedContent": "Full text content extracted from all images - be thorough and accurate",
  "relevantSections": [
    {
      "imageIndex": 0,
      "description": "Description of the relevant section",
      "relevanceScore": 0.9,
      "whyRelevant": "Explains why this section helps solve the homework question"
    }
  ],
  "keyFormulas": ["formula1 (copied EXACTLY)", "formula2"],
  "keyDefinitions": ["term: COMPLETE definition", ...],
  "helpfulExamples": ["description of example 1 and how it relates to the problem", ...],
  "warnings": ["Any unclear text or potential transcription issues"]
}

## Important:
- Focus on content directly relevant to the homework question
- Score relevance from 0 to 1 (1 = highly relevant, ONLY for content that directly helps solve the question)
- Extract formulas EXACTLY as written - accuracy is critical
- Keep definitions COMPLETE - don't abbreviate
- If there are multiple similar formulas, include ALL of them
- Note any conditions or constraints mentioned with formulas (e.g., "valid for x > 0")`

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze reference materials in context of the homework question
 */
export async function analyzeReferences(
  imageUrls: string[],
  questionAnalysis: QuestionAnalysis
): Promise<ReferenceAnalysis> {
  if (imageUrls.length === 0) {
    return {
      extractedContent: '',
      relevantSections: [],
      keyFormulas: [],
      keyDefinitions: [],
      helpfulExamples: [],
    }
  }

  const client = getAnthropicClient()

  // Limit to max images
  const urlsToProcess = imageUrls.slice(0, MAX_IMAGES_PER_REQUEST)

  // Build content array with all images
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  for (let i = 0; i < urlsToProcess.length; i++) {
    content.push({
      type: 'image',
      source: {
        type: 'url',
        url: urlsToProcess[i],
      },
    })
  }

  // Build the prompt with question context
  const prompt = REFERENCE_ANALYSIS_PROMPT
    .replace('{questionText}', questionAnalysis.questionText)
    .replace('{topic}', questionAnalysis.topic)
    .replace('{concepts}', questionAnalysis.requiredConcepts.join(', '))

  content.push({
    type: 'text',
    text: prompt,
  })

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content }],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    return parseReferenceResponse(textContent.text)
  } catch (error) {
    if (error instanceof Anthropic.APIError && error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }
    throw error
  }
}

/**
 * Quick relevance check for a single reference image
 */
export async function checkRelevance(
  imageUrl: string,
  topic: string
): Promise<{ isRelevant: boolean; description: string }> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `Is this image relevant to the topic "${topic}"?

Respond with JSON: {"isRelevant": true/false, "description": "brief description of image content"}`,
          },
        ],
      },
    ],
  })

  const textContent = response.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return { isRelevant: false, description: 'Could not analyze image' }
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        isRelevant: Boolean(parsed.isRelevant),
        description: String(parsed.description || ''),
      }
    }
  } catch {
    // Fall through to default
  }

  return { isRelevant: true, description: 'Reference material' }
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseReferenceResponse(responseText: string): ReferenceAnalysis {
  // Extract JSON from response
  let jsonStr = responseText

  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  try {
    const parsed = JSON.parse(jsonStr.trim())

    return {
      extractedContent: String(parsed.extractedContent || ''),
      relevantSections: normalizeRelevantSections(parsed.relevantSections),
      keyFormulas: Array.isArray(parsed.keyFormulas)
        ? parsed.keyFormulas.map(String)
        : [],
      keyDefinitions: Array.isArray(parsed.keyDefinitions)
        ? parsed.keyDefinitions.map(String)
        : [],
      helpfulExamples: Array.isArray(parsed.helpfulExamples)
        ? parsed.helpfulExamples.map(String)
        : [],
    }
  } catch {
    // If parsing fails, return basic extracted content
    return {
      extractedContent: responseText,
      relevantSections: [],
      keyFormulas: [],
      keyDefinitions: [],
      helpfulExamples: [],
    }
  }
}

function normalizeRelevantSections(sections: unknown): RelevantSection[] {
  if (!Array.isArray(sections)) return []

  return sections
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      imageIndex: Number(s.imageIndex) || 0,
      description: String(s.description || ''),
      relevanceScore: Math.min(1, Math.max(0, Number(s.relevanceScore) || 0.5)),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}
