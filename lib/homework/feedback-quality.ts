/**
 * Feedback Quality Validator — Quality Floor for Generated Feedback
 *
 * Enforces minimum quality standards for homework feedback:
 * - improvementPoints must include correct answer, what student wrote, specific error, worked correction
 * - correctPoints must acknowledge specific technique/method
 * - Rejects generic phrases like "good job", "try again", "needs work"
 * - Minimum word counts per item
 *
 * If feedback fails validation, only the failing items are regenerated.
 */

import type Anthropic from '@anthropic-ai/sdk'
import type { FeedbackPoint, FeedbackQualityResult } from './types'

// ============================================================================
// Configuration
// ============================================================================

const MIN_IMPROVEMENT_WORDS = 20
const MIN_CORRECT_WORDS = 10

const REJECTED_PHRASES = [
  'good job',
  'great job',
  'well done',
  'nice work',
  'try again',
  'needs work',
  'needs improvement',
  'keep trying',
  'not quite',
  'almost there',
  'incorrect',  // "incorrect" alone is too vague — must explain WHY
]

const AI_MODEL = 'claude-sonnet-4-6-20250227'

// ============================================================================
// Main Validation
// ============================================================================

/**
 * Validate feedback quality against minimum standards.
 * Returns which items (if any) fail the quality check.
 */
export function validateFeedbackQuality(
  correctPoints: FeedbackPoint[],
  improvementPoints: FeedbackPoint[]
): FeedbackQualityResult {
  const failingCorrectIndices: number[] = []
  const failingImprovementIndices: number[] = []
  const reasons: string[] = []

  // Validate improvement points
  for (let i = 0; i < improvementPoints.length; i++) {
    const point = improvementPoints[i]
    const issues = validateImprovementPoint(point)
    if (issues.length > 0) {
      failingImprovementIndices.push(i)
      reasons.push(`improvementPoints[${i}]: ${issues.join('; ')}`)
    }
  }

  // Validate correct points
  for (let i = 0; i < correctPoints.length; i++) {
    const point = correctPoints[i]
    const issues = validateCorrectPoint(point)
    if (issues.length > 0) {
      failingCorrectIndices.push(i)
      reasons.push(`correctPoints[${i}]: ${issues.join('; ')}`)
    }
  }

  const passed = failingCorrectIndices.length === 0 && failingImprovementIndices.length === 0

  if (!passed) {
    console.log('[FeedbackQuality] Validation failed:', reasons)
  }

  return {
    passed,
    failingCorrectIndices,
    failingImprovementIndices,
    reasons,
  }
}

// ============================================================================
// Individual Point Validation
// ============================================================================

function validateImprovementPoint(point: FeedbackPoint): string[] {
  const issues: string[] = []
  const desc = (point.description || '').trim()
  const wordCount = countWords(desc)

  // Minimum word count
  if (wordCount < MIN_IMPROVEMENT_WORDS) {
    issues.push(`Too short (${wordCount} words, minimum ${MIN_IMPROVEMENT_WORDS})`)
  }

  // Check for rejected generic phrases (must be the ENTIRE description or a major portion)
  const descLower = desc.toLowerCase()
  for (const phrase of REJECTED_PHRASES) {
    // Only reject if the phrase is a significant portion of the feedback
    // (e.g., "incorrect" alone is bad, but "incorrect because..." is fine)
    if (descLower === phrase || (descLower.startsWith(phrase) && wordCount < 5)) {
      issues.push(`Generic phrase: "${phrase}" — needs specific explanation`)
    }
  }

  // Should mention the correct answer
  if (!containsAnswer(desc)) {
    issues.push('Missing correct answer in feedback')
  }

  return issues
}

function validateCorrectPoint(point: FeedbackPoint): string[] {
  const issues: string[] = []
  const desc = (point.description || '').trim()
  const wordCount = countWords(desc)

  // Minimum word count
  if (wordCount < MIN_CORRECT_WORDS) {
    issues.push(`Too short (${wordCount} words, minimum ${MIN_CORRECT_WORDS})`)
  }

  return issues
}

// ============================================================================
// Regeneration of Weak Feedback
// ============================================================================

/**
 * Regenerate only the feedback items that failed quality validation.
 * This is a targeted, cheap AI call — not a full re-analysis.
 */
export async function regenerateWeakFeedback(
  client: Anthropic,
  failingItems: { type: 'correct' | 'improvement'; index: number; point: FeedbackPoint }[],
  context: { correctAnswer: string; studentAnswer: string; questionText: string }[],
  language: string = 'en'
): Promise<FeedbackPoint[]> {
  if (failingItems.length === 0) return []

  const isHebrew = language === 'he'
  const itemDescriptions = failingItems.map((item, i) => {
    const ctx = context[i] || { correctAnswer: 'unknown', studentAnswer: 'unknown', questionText: 'unknown' }
    return `Item ${i + 1} (${item.type}):
  Question: ${ctx.questionText}
  Correct answer: ${ctx.correctAnswer}
  Student wrote: ${ctx.studentAnswer}
  Current weak feedback: "${item.point.description}"`
  }).join('\n\n')

  const prompt = `The following homework feedback items are too generic or incomplete. Rewrite each one to meet quality standards.

${isHebrew ? 'Write ALL feedback in Hebrew (עברית).' : ''}

## Quality requirements:
- For WRONG answers: explain what the correct answer is, what the student wrote, why it's wrong, and show the correct solution step-by-step. Minimum 20 words.
- For CORRECT answers: acknowledge the specific technique or method the student used. Minimum 10 words.
- NO generic phrases like "good job", "try again", "needs work", "incorrect" alone.

## Items to rewrite:
${itemDescriptions}

## Response format (JSON array):
[
  { "title": "improved title", "description": "improved description meeting quality standards", "severity": "major or moderate (for wrong answers only)" }
]

Respond with ONLY the JSON array.`

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find(b => b.type === 'text')
    if (!textContent || textContent.type !== 'text') return failingItems.map(i => i.point)

    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return failingItems.map(i => i.point)

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return failingItems.map(i => i.point)

    return parsed.map((p: Record<string, unknown>, i: number) => ({
      title: String(p.title || failingItems[i]?.point.title || 'Feedback'),
      description: String(p.description || failingItems[i]?.point.description || ''),
      severity: failingItems[i]?.type === 'improvement'
        ? (p.severity === 'major' ? 'major' : 'moderate')
        : undefined,
    }))
  } catch (error) {
    console.error('[FeedbackQuality] Regeneration failed:', error)
    return failingItems.map(i => i.point)
  }
}

// ============================================================================
// Helpers
// ============================================================================

function countWords(text: string): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Heuristic: check if the description contains something that looks like an answer.
 * Looks for patterns like "correct answer is X", numbers, or "= X".
 */
function containsAnswer(description: string): boolean {
  // Check for common patterns that indicate a correct answer is mentioned
  if (/correct\s+(answer|solution)\s+(is|was|should\s+be)/i.test(description)) return true
  if (/the\s+answer\s+(is|was|should\s+be)/i.test(description)) return true
  if (/=\s*[+-]?\d/.test(description)) return true  // "= 42" or "= -3"
  if (/should\s+(be|equal|have\s+been)\s+/i.test(description)) return true
  // Hebrew patterns
  if (/התשובה\s+(הנכונה\s+)?היא/i.test(description)) return true
  if (/צריך\s+להיות/i.test(description)) return true

  return false
}
