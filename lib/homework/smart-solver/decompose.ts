/**
 * Smart Solver — Step 1: Classify & Decompose
 *
 * Single Claude Vision call that:
 * 1. Extracts all problems from the homework image
 * 2. Classifies each by SubjectCategory
 * 3. Breaks each into atomic sub-problems with dependency ordering
 * 4. Optionally reads student answers (combined-image mode)
 */

import type Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { buildLanguageInstruction, type ContentLanguage } from '@/lib/ai/language'
import { getVerificationStrategy } from './subject-utils'
import type { DecompositionResult, DecomposedProblem, SubProblem, SubjectCategory } from './types'
import { createLogger } from '@/lib/logger'

const log = createLogger('homework:decompose')

const MAX_TOKENS = 4096

/**
 * Extract and decompose all problems from a homework image.
 *
 * Returns a DecompositionResult with each problem classified and broken
 * into atomic sub-problems that can be solved sequentially.
 */
export async function decomposeProblems(
  client: Anthropic,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  includeStudentAnswers: boolean,
  referenceImages: Array<{ base64: string; mediaType: string }> = [],
  language?: ContentLanguage
): Promise<DecompositionResult> {
  const studentAnswerInstruction = includeStudentAnswers
    ? `
7. Also READ the student's answers from the same image:
   - For each problem, transcribe what the student wrote as their answer
   - Include "studentAnswer" and "studentAnswerConfidence" fields
   - If handwriting is ambiguous, favor the interpretation that makes the answer correct`
    : ''

  const studentAnswerFields = includeStudentAnswers
    ? `,
      "studentAnswer": "what the student wrote",
      "studentAnswerConfidence": "high" | "medium" | "low"`
    : ''

  const langInstruction = buildLanguageInstruction(language || 'en')

  const prompt = `You are an expert problem analyzer. Your job is to:
1. READ all problems/questions from this image
2. CLASSIFY each problem by its exact subject type
3. DECOMPOSE each problem into atomic sub-problems that can be solved one at a time
4. Each sub-problem should be so simple that solving it is trivially correct
5. Be especially careful with Hebrew content: read Hebrew labels RTL, math expressions LTR
${studentAnswerInstruction}
${langInstruction}

## SUBJECT CATEGORIES (choose the most specific one):
- math_arithmetic: basic operations (addition, subtraction, multiplication, division)
- math_algebra: equations, expressions, systems of equations, inequalities
- math_calculus: derivatives, integrals, limits, series
- math_geometry: shapes, areas, volumes, angles, proofs
- math_trigonometry: trig functions, identities, triangles
- math_statistics: probability, distributions, data analysis, combinatorics
- physics: mechanics, electricity, optics, thermodynamics, waves
- chemistry: reactions, stoichiometry, molecular structure
- biology: cells, genetics, ecology, anatomy
- history: events, dates, causes, effects, analysis
- literature: analysis, themes, characters, literary devices
- language: grammar, vocabulary, translation, comprehension
- general: anything that doesn't fit above

## DECOMPOSITION RULES:

### For Math/Physics problems:
Break into steps like:
1. "Extract given values" — identify all known quantities and units
2. "Identify formula/relationship" — what equation or method applies
3. "Substitute values" — plug numbers into the formula
4. "Compute result" — perform the calculation
5. "State answer with units" — final answer in proper form

Each sub-problem should be ONE operation. Include the specific formula in formulaOrMethod.

### For Non-Math problems:
Break into analytical steps:
1. "Identify key concept" — what is being asked
2. "Recall relevant facts/evidence" — supporting information
3. "Formulate argument/answer" — construct the response
4. "Synthesize conclusion" — bring it all together

### General Rules:
- Maximum 7 sub-problems per problem
- Minimum 2 sub-problems per problem
- Dependencies must form a chain (no cycles)
- Each sub-problem must specify what it depends on
- givenValues should contain the specific data needed for that sub-problem

## Response format (JSON only):
{
  "detectedLanguage": "he" or "en",
  "problems": [
    {
      "id": "q1",
      "questionText": "exact transcription of the problem",
      "subjectCategory": "math_algebra",
      "subProblems": [
        {
          "id": "q1_sub1",
          "parentProblemId": "q1",
          "description": "Extract given values: ...",
          "dependsOn": [],
          "formulaOrMethod": "direct extraction",
          "givenValues": {"m": "5 kg", "a": "3 m/s^2"},
          "order": 1
        },
        {
          "id": "q1_sub2",
          "parentProblemId": "q1",
          "description": "Apply F = ma",
          "dependsOn": ["q1_sub1"],
          "formulaOrMethod": "F = m * a",
          "givenValues": {},
          "order": 2
        }
      ]${studentAnswerFields}
    }
  ]
}

Respond with ONLY the JSON, no other text.`

  const content: Anthropic.MessageParam['content'] = [
    { type: 'text', text: prompt },
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    },
  ]

  // Add reference images for solving context
  if (referenceImages.length > 0) {
    content.push({
      type: 'text',
      text: '\n## REFERENCE MATERIALS (use these to help identify correct formulas and methods):',
    })
    for (const img of referenceImages) {
      if (img.mediaType === 'application/pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: img.base64 },
        } as Anthropic.DocumentBlockParam)
      } else {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.base64,
          },
        })
      }
    }
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  return parseDecompositionResponse(response, includeStudentAnswers)
}

/**
 * Parse the Claude response into a typed DecompositionResult.
 */
function parseDecompositionResponse(
  response: Anthropic.Message,
  includeStudentAnswers: boolean
): DecompositionResult {
  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('[SmartSolver/Decompose] No text in response')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('[SmartSolver/Decompose] No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed.problems) || parsed.problems.length === 0) {
    throw new Error('[SmartSolver/Decompose] No problems extracted')
  }

  const detectedLanguage = parsed.detectedLanguage === 'he' ? 'he' : 'en'

  const problems: DecomposedProblem[] = parsed.problems.map(
    (p: Record<string, unknown>, i: number) => {
      const subjectCategory = validateSubjectCategory(p.subjectCategory)
      const rawSubProblems = Array.isArray(p.subProblems) ? p.subProblems : []

      const subProblems: SubProblem[] = rawSubProblems.map(
        (sp: Record<string, unknown>, j: number) => ({
          id: String(sp.id || `q${i + 1}_sub${j + 1}`),
          parentProblemId: String(sp.parentProblemId || p.id || `q${i + 1}`),
          description: String(sp.description || ''),
          dependsOn: Array.isArray(sp.dependsOn) ? sp.dependsOn.map(String) : [],
          formulaOrMethod: String(sp.formulaOrMethod || ''),
          givenValues: (sp.givenValues && typeof sp.givenValues === 'object')
            ? Object.fromEntries(
                Object.entries(sp.givenValues as Record<string, unknown>).map(
                  ([k, v]) => [k, String(v)]
                )
              )
            : {},
          order: typeof sp.order === 'number' ? sp.order : j + 1,
        })
      )

      // Ensure at least 2 sub-problems
      if (subProblems.length < 2) {
        const problemId = String(p.id || `q${i + 1}`)
        if (subProblems.length === 0) {
          subProblems.push({
            id: `${problemId}_sub1`,
            parentProblemId: problemId,
            description: 'Solve the problem step by step',
            dependsOn: [],
            formulaOrMethod: 'direct computation',
            givenValues: {},
            order: 1,
          })
        }
        subProblems.push({
          id: `${problemId}_sub${subProblems.length + 1}`,
          parentProblemId: problemId,
          description: 'State the final answer',
          dependsOn: [subProblems[subProblems.length - 1].id],
          formulaOrMethod: 'answer formatting',
          givenValues: {},
          order: subProblems.length + 1,
        })
      }

      const problem: DecomposedProblem = {
        id: String(p.id || `q${i + 1}`),
        questionText: String(p.questionText || ''),
        subjectCategory,
        verificationStrategy: getVerificationStrategy(subjectCategory),
        subProblems,
      }

      if (includeStudentAnswers) {
        if (p.studentAnswer != null) {
          problem.studentAnswer = String(p.studentAnswer)
        }
        if (typeof p.studentAnswerConfidence === 'string' &&
            ['high', 'medium', 'low'].includes(p.studentAnswerConfidence)) {
          problem.studentAnswerConfidence = p.studentAnswerConfidence as 'high' | 'medium' | 'low'
        }
      }

      return problem
    }
  )

  log.info({ problemCount: problems.length, detectedLanguage, totalSubProblems: problems.reduce((sum, p) => sum + p.subProblems.length, 0) }, 'Decomposition complete')

  return { problems, detectedLanguage }
}

const VALID_CATEGORIES: SubjectCategory[] = [
  'math_arithmetic', 'math_algebra', 'math_calculus', 'math_geometry',
  'math_trigonometry', 'math_statistics', 'physics', 'chemistry',
  'biology', 'history', 'literature', 'language', 'general',
]

function validateSubjectCategory(value: unknown): SubjectCategory {
  if (typeof value === 'string' && VALID_CATEGORIES.includes(value as SubjectCategory)) {
    return value as SubjectCategory
  }
  return 'general'
}
