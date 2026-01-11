/**
 * Question Analyzer
 * Uses Claude Vision to analyze uploaded homework questions
 */

import Anthropic from '@anthropic-ai/sdk'
import type { QuestionAnalysis, QuestionSubject } from './types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096

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

const QUESTION_ANALYSIS_PROMPT = `You are an expert educational analyst. Analyze this homework question image and extract detailed information.

## ACCURACY REQUIREMENTS - READ CAREFULLY:
1. **EXACT TRANSCRIPTION**: Copy the question EXACTLY as written. Do not paraphrase or simplify.
2. **HANDWRITING CARE**: For handwritten questions, if a character is ambiguous (e.g., 4 vs 9, 1 vs 7, + vs ×), transcribe BOTH interpretations in parentheses: "24 + 38 (or 24 × 38)"
3. **INCLUDE ALL NUMBERS**: Ensure ALL numbers, variables, and symbols are captured exactly
4. **DIAGRAMS**: Describe diagrams in detail - dimensions, labels, angles, any given values
5. **DON'T GUESS**: If something is illegible, mark it as [illegible] rather than guessing

## Your task:
1. Read and transcribe the question EXACTLY as written (including any unclear parts)
2. Identify the academic subject and specific topic
3. Determine the type of question (word problem, calculation, proof, etc.)
4. Estimate difficulty level (1-5, where 1=elementary, 5=advanced college)
5. List the concepts and skills needed to solve this
6. Identify common mistakes students make on this type of problem
7. Describe the general approach to solving it (without giving the answer)
8. Estimate how many steps the solution requires

Return your analysis as JSON in this exact format:
{
  "questionText": "The exact text of the question (mark [illegible] for unclear parts, show alternatives for ambiguous characters)",
  "subject": "math" | "science" | "history" | "language" | "other",
  "topic": "Specific topic (e.g., 'Quadratic Equations', 'Photosynthesis')",
  "questionType": "word_problem" | "multiple_choice" | "proof" | "calculation" | "essay" | "fill_blank" | "short_answer",
  "difficultyEstimate": 1-5,
  "requiredConcepts": ["concept1", "concept2", ...],
  "commonMistakes": ["mistake1", "mistake2", ...],
  "solutionApproach": "High-level description of how to approach this problem - DO NOT include the answer",
  "estimatedSteps": 5,
  "hasAmbiguity": true/false,
  "ambiguityNotes": "Notes about any unclear parts if hasAmbiguity is true"
}

## Important:
- Be EXTREMELY accurate in transcribing the question - errors here cascade to wrong tutoring
- If there are diagrams, describe EXACTLY what they show with all given values
- The solutionApproach should guide thinking, NOT give the answer
- List at least 2-3 required concepts and common mistakes
- If anything is unclear or could be read multiple ways, flag it in ambiguityNotes`

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze a homework question image using Claude Vision
 */
export async function analyzeQuestion(imageUrl: string): Promise<QuestionAnalysis> {
  const client = getAnthropicClient()

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: QUESTION_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON from response
    const analysis = parseAnalysisResponse(textContent.text)
    return analysis
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      }
      if (error.status === 400) {
        throw new Error('Could not process the image. Please ensure it is clear and readable.')
      }
    }
    throw error
  }
}

/**
 * Analyze multiple question images (for multi-part questions)
 */
export async function analyzeMultipleQuestions(
  imageUrls: string[]
): Promise<QuestionAnalysis> {
  const client = getAnthropicClient()

  // Build content array with all images
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  for (const url of imageUrls) {
    content.push({
      type: 'image',
      source: {
        type: 'url',
        url,
      },
    })
  }

  content.push({
    type: 'text',
    text: `${QUESTION_ANALYSIS_PROMPT}

Note: Multiple images have been provided. They may show different parts of the same question or related questions. Analyze them together as a single homework problem.`,
  })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  const textContent = response.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return parseAnalysisResponse(textContent.text)
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseAnalysisResponse(responseText: string): QuestionAnalysis {
  // Extract JSON from response (may be wrapped in markdown code blocks)
  let jsonStr = responseText

  // Remove markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  // Also try to find JSON object directly
  if (!jsonMatch) {
    const directJsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (directJsonMatch) {
      jsonStr = directJsonMatch[0]
    }
  }

  try {
    const parsed = JSON.parse(jsonStr.trim())

    // Validate question text - ensure we got something meaningful
    const questionText = String(parsed.questionText || '')
    if (!questionText || questionText.length < 5) {
      console.warn('[Question Analyzer] Short or missing question text:', questionText)
    }

    // Log if there are ambiguity issues
    if (parsed.hasAmbiguity) {
      console.log('[Question Analyzer] Ambiguity detected:', parsed.ambiguityNotes)
    }

    // Validate and normalize the response
    return {
      questionText: questionText,
      subject: normalizeSubject(parsed.subject),
      topic: String(parsed.topic || 'General'),
      questionType: normalizeQuestionType(parsed.questionType),
      difficultyEstimate: Math.min(5, Math.max(1, Number(parsed.difficultyEstimate) || 3)),
      requiredConcepts: Array.isArray(parsed.requiredConcepts)
        ? parsed.requiredConcepts.map(String).filter((c: string) => c.length > 0)
        : [],
      commonMistakes: Array.isArray(parsed.commonMistakes)
        ? parsed.commonMistakes.map(String).filter((m: string) => m.length > 0)
        : [],
      solutionApproach: String(parsed.solutionApproach || ''),
      estimatedSteps: Math.max(1, Number(parsed.estimatedSteps) || 5),
      hasAmbiguity: Boolean(parsed.hasAmbiguity),
      ambiguityNotes: parsed.ambiguityNotes ? String(parsed.ambiguityNotes) : undefined,
    }
  } catch (error) {
    console.error('[Question Analyzer] JSON parse error:', error)
    // If JSON parsing fails, try to extract information from plain text
    return {
      questionText: extractQuestionFromText(responseText),
      subject: 'other',
      topic: 'Unknown',
      questionType: 'unknown',
      difficultyEstimate: 3,
      requiredConcepts: [],
      commonMistakes: [],
      solutionApproach: 'Please describe your approach to solving this problem.',
      estimatedSteps: 5,
    }
  }
}

/**
 * Normalize question type to valid values
 */
function normalizeQuestionType(type: string): string {
  const normalized = String(type || '').toLowerCase().replace(/[^a-z_]/g, '')
  const validTypes = ['word_problem', 'multiple_choice', 'proof', 'calculation', 'essay', 'fill_blank', 'short_answer']
  if (validTypes.includes(normalized)) {
    return normalized
  }
  // Try to match partial
  if (normalized.includes('word')) return 'word_problem'
  if (normalized.includes('choice') || normalized.includes('multi')) return 'multiple_choice'
  if (normalized.includes('calc')) return 'calculation'
  if (normalized.includes('essay')) return 'essay'
  if (normalized.includes('fill')) return 'fill_blank'
  if (normalized.includes('short')) return 'short_answer'
  if (normalized.includes('proof')) return 'proof'
  return 'unknown'
}

function normalizeSubject(subject: string): QuestionSubject {
  const normalized = String(subject).toLowerCase()
  if (normalized.includes('math')) return 'math'
  if (normalized.includes('science') || normalized.includes('physics') ||
      normalized.includes('chemistry') || normalized.includes('biology')) return 'science'
  if (normalized.includes('history') || normalized.includes('social')) return 'history'
  if (normalized.includes('language') || normalized.includes('english') ||
      normalized.includes('writing') || normalized.includes('literature')) return 'language'
  return 'other'
}

function extractQuestionFromText(text: string): string {
  // Try to find the question text in the response
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.includes('?') || line.toLowerCase().includes('question')) {
      return line.trim()
    }
  }
  return 'Could not extract question text. Please describe your problem.'
}
