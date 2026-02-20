/**
 * Student Work Reader — Phase 2 of the Three-Phase Grading Pipeline
 *
 * Dedicated to reading student handwriting from answer images.
 * This module ONLY transcribes — it never grades or judges correctness.
 * Keeping transcription separate from grading improves accuracy for both.
 *
 * Supports two modes:
 * - With problem list: maps answers to specific problem IDs (sequential after Phase 1)
 * - Without problem list: transcribes all answers in visual order with sequential IDs
 *   (for true parallel execution with Phase 1)
 */

import type Anthropic from '@anthropic-ai/sdk'
import type { StudentAnswerSet, StudentAnswer, VerifiedProblem } from './types'

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 2048

// ============================================================================
// Main Function
// ============================================================================

/**
 * Read student work from an answer image.
 *
 * When called WITHOUT a problem list (parallel mode), transcribes all answers
 * found on the page in visual order, assigning sequential IDs (q1, q2, ...).
 * Phase 3 later matches these to Phase 1's problems by index.
 *
 * When called WITH a problem list, maps answers to specific problem IDs.
 *
 * Auto-detects Hebrew vs English from the image content.
 */
export async function readStudentWork(
  client: Anthropic,
  answerImageBase64: string,
  answerMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  problems?: VerifiedProblem[]
): Promise<StudentAnswerSet> {
  const hasProblems = problems && problems.length > 0

  const problemListSection = hasProblems
    ? `## Problems to match against:
${problems.map((p, i) => `${i + 1}. [ID: ${p.id}] ${p.questionText}`).join('\n')}

## Instructions:
1. Look at the student's answer image carefully
2. For EACH problem listed above, find and transcribe what the student wrote
3. Use the problem IDs from the list above as "problemId" in your response`
    : `## Instructions:
1. Look at the student's answer image carefully
2. Transcribe ALL student answers/work you see on this page
3. Read them in visual order: top to bottom, left to right
4. Assign sequential IDs: "q1", "q2", "q3", etc.`

  const prompt = `You are a handwriting transcription specialist. Your ONLY job is to READ what the student wrote — do NOT judge correctness.

**LANGUAGE AUTO-DETECTION:**
- Scan the image for Hebrew letters (א-ת). If found, this is Hebrew homework.
- Hebrew text reads RIGHT-TO-LEFT but mathematical expressions ALWAYS read LEFT-TO-RIGHT.
- If only English/Latin letters → standard LTR text.

${problemListSection}
5. If handwriting is ambiguous, provide your best reading AND alternative interpretations
6. Note any characters that are hard to read (e.g., "4 or 9", "1 or 7")
7. Do NOT evaluate correctness — just transcribe accurately

## Common handwriting confusions to watch for:
- 4 ↔ 9 (closed/open top)
- 1 ↔ 7 (with/without crossbar)
- 6 ↔ 0 (closed/open)
- 5 ↔ S
- 2 ↔ Z
- + ↔ × (crossed vs uncrossed)
- - ↔ = (single vs double line)
- ב ↔ כ (similar Hebrew shapes)
- ד ↔ ר (similar Hebrew shapes)
- ו ↔ ז (with/without line)

## Response format (JSON only):
{
  "answers": [
    {
      "problemId": "${hasProblems ? 'problem ID from the list above' : 'q1, q2, q3, etc.'}",
      "rawReading": "exact transcription of what the student wrote, including work/steps",
      "interpretation": "normalized mathematical interpretation (e.g., 'x = 4' or '62')",
      "confidence": "high" | "medium" | "low",
      "ambiguousCharacters": ["4 or 9", "1 or 7"],
      "alternativeReadings": ["alternative interpretation if ambiguous"]
    }
  ]
}

Respond with ONLY the JSON, no other text.`

  const content: Anthropic.MessageParam['content'] = [
    { type: 'text', text: prompt },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: answerMediaType,
        data: answerImageBase64,
      },
    },
  ]

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content }],
    })

    for await (const event of stream) {
      void event
    }

    const response = await stream.finalMessage()
    console.log('[StudentWorkReader] Response received, tokens:', response.usage?.output_tokens)

    return parseStudentWorkResponse(response, problems)
  } catch (error) {
    console.error('[StudentWorkReader] Failed to read student work:', error)
    throw error
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseStudentWorkResponse(
  response: Anthropic.Message,
  problems?: VerifiedProblem[]
): StudentAnswerSet {
  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return { answers: problems ? getDefaultAnswers(problems) : [] }
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[StudentWorkReader] No JSON found in response')
      return { answers: problems ? getDefaultAnswers(problems) : [] }
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed.answers)) {
      return { answers: problems ? getDefaultAnswers(problems) : [] }
    }

    const answers: StudentAnswer[] = parsed.answers.map((a: Record<string, unknown>) => ({
      problemId: String(a.problemId || ''),
      rawReading: String(a.rawReading || ''),
      interpretation: String(a.interpretation || a.rawReading || ''),
      confidence: validateConfidence(a.confidence),
      ambiguousCharacters: Array.isArray(a.ambiguousCharacters)
        ? a.ambiguousCharacters.map(String)
        : undefined,
      alternativeReadings: Array.isArray(a.alternativeReadings)
        ? a.alternativeReadings.map(String)
        : undefined,
    }))

    // If we have a problem list, ensure all problems have an answer entry
    if (problems) {
      const answeredIds = new Set(answers.map(a => a.problemId))
      for (const problem of problems) {
        if (!answeredIds.has(problem.id)) {
          answers.push({
            problemId: problem.id,
            rawReading: '',
            interpretation: '',
            confidence: 'low',
            ambiguousCharacters: undefined,
            alternativeReadings: undefined,
          })
        }
      }
    }

    return { answers }
  } catch (error) {
    console.error('[StudentWorkReader] Failed to parse response:', error)
    return { answers: problems ? getDefaultAnswers(problems) : [] }
  }
}

function validateConfidence(value: unknown): 'high' | 'medium' | 'low' {
  if (typeof value === 'string' && ['high', 'medium', 'low'].includes(value)) {
    return value as 'high' | 'medium' | 'low'
  }
  return 'medium'
}

function getDefaultAnswers(problems: VerifiedProblem[]): StudentAnswer[] {
  return problems.map(p => ({
    problemId: p.id,
    rawReading: '',
    interpretation: '',
    confidence: 'low' as const,
  }))
}
