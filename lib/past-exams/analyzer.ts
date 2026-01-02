/**
 * Past Exam Analyzer
 * Analyzes uploaded past exams to extract patterns for exam generation
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ExamAnalysis } from '@/types/past-exam'

const anthropic = new Anthropic()

const ANALYSIS_PROMPT = `You are an expert exam analyzer. Analyze this past exam/test and extract detailed patterns that can be used to generate similar exams.

ANALYZE THE FOLLOWING ASPECTS:

1. **Question Type Distribution**
   - Count each question type (multiple_choice, true_false, fill_blank, short_answer, matching, ordering, essay, passage_based)
   - Calculate percentage and average points per type

2. **Difficulty Analysis**
   - Estimate difficulty distribution (easy/medium/hard percentages, should sum to 100)
   - Identify Bloom's taxonomy levels used (percentages, should sum to 100)

3. **Point/Scoring Structure**
   - Total points available
   - Point values used (1pt, 2pt, 5pt, etc.)
   - Min, max, and average points per question

4. **Exam Structure**
   - Number of sections/parts
   - Section names and organization
   - Time allocation if mentioned
   - Instructions style

5. **Question Style Patterns**
   - Average question length in words
   - Command terms used (explain, describe, calculate, compare, etc.)
   - Use of scenarios/contexts
   - Use of diagrams/figures
   - Mathematical/calculation requirements

6. **Grading Rubrics**
   - Rubric style (point-based, descriptive, checkmarks)
   - Partial credit rules
   - Bonus questions present

7. **Sample Questions**
   - Extract 2-3 representative questions of different types
   - Note their difficulty and point value

IMPORTANT: Be thorough and accurate. If you cannot determine something, use reasonable estimates based on what you can see.

RESPOND WITH VALID JSON ONLY (no markdown, no explanation, just the JSON object):
{
  "total_questions": <number>,
  "total_points": <number>,
  "time_estimate_minutes": <number or null>,
  "question_types": {
    "multiple_choice": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "true_false": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "fill_blank": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "short_answer": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "matching": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "ordering": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "essay": { "count": <number>, "percentage": <number>, "avg_points": <number> },
    "passage_based": { "count": <number>, "percentage": <number>, "avg_points": <number> }
  },
  "difficulty_distribution": {
    "easy": <number 0-100>,
    "medium": <number 0-100>,
    "hard": <number 0-100>
  },
  "point_distribution": {
    "min_points": <number>,
    "max_points": <number>,
    "avg_points": <number>,
    "common_values": [<numbers>]
  },
  "structure_patterns": {
    "has_sections": <boolean>,
    "section_count": <number>,
    "sections": [{ "name": "<string>", "question_count": <number>, "points": <number> }],
    "has_instructions": <boolean>,
    "instruction_style": "<string or null>"
  },
  "grading_patterns": {
    "partial_credit_allowed": <boolean>,
    "rubric_style": "points" | "checkmarks" | "descriptive",
    "common_point_values": [<numbers>],
    "bonus_questions": <boolean>
  },
  "question_style": {
    "avg_question_length_words": <number>,
    "uses_scenarios": <boolean>,
    "uses_diagrams": <boolean>,
    "uses_calculations": <boolean>,
    "command_terms": [<strings>],
    "bloom_levels": {
      "remember": <number 0-100>,
      "understand": <number 0-100>,
      "apply": <number 0-100>,
      "analyze": <number 0-100>,
      "evaluate": <number 0-100>,
      "create": <number 0-100>
    }
  },
  "sample_questions": [
    {
      "type": "<question type>",
      "text": "<question text (truncated if long)>",
      "points": <number>,
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`

/**
 * Extract JSON from Claude's response (handles markdown code blocks)
 */
function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Otherwise try to find raw JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return text.trim()
}

/**
 * Analyze a past exam image using Claude's vision API
 */
export async function analyzeExamImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<ExamAnalysis> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonStr = extractJSON(textContent.text)
  const analysis = JSON.parse(jsonStr) as ExamAnalysis

  return validateAndCleanAnalysis(analysis)
}

/**
 * Analyze a past exam from extracted text content
 */
export async function analyzeExamText(
  extractedText: string
): Promise<ExamAnalysis> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Here is the extracted text from a past exam:\n\n${extractedText}\n\n${ANALYSIS_PROMPT}`,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonStr = extractJSON(textContent.text)
  const analysis = JSON.parse(jsonStr) as ExamAnalysis

  return validateAndCleanAnalysis(analysis)
}

/**
 * Validate and clean up the analysis to ensure all required fields exist
 */
function validateAndCleanAnalysis(analysis: ExamAnalysis): ExamAnalysis {
  // Ensure question_types has all keys with defaults
  const defaultQuestionType = { count: 0, percentage: 0, avg_points: 0 }
  const questionTypes = {
    multiple_choice: { ...defaultQuestionType, ...analysis.question_types?.multiple_choice },
    true_false: { ...defaultQuestionType, ...analysis.question_types?.true_false },
    fill_blank: { ...defaultQuestionType, ...analysis.question_types?.fill_blank },
    short_answer: { ...defaultQuestionType, ...analysis.question_types?.short_answer },
    matching: { ...defaultQuestionType, ...analysis.question_types?.matching },
    ordering: { ...defaultQuestionType, ...analysis.question_types?.ordering },
    essay: { ...defaultQuestionType, ...analysis.question_types?.essay },
    passage_based: { ...defaultQuestionType, ...analysis.question_types?.passage_based },
  }

  // Filter out question types with 0 count
  const filteredQuestionTypes: typeof questionTypes = {} as typeof questionTypes
  for (const [key, value] of Object.entries(questionTypes)) {
    if (value.count > 0) {
      filteredQuestionTypes[key as keyof typeof questionTypes] = value
    }
  }

  // Ensure difficulty distribution sums to 100
  const difficulty = analysis.difficulty_distribution || { easy: 33, medium: 34, hard: 33 }
  const diffTotal = difficulty.easy + difficulty.medium + difficulty.hard
  if (diffTotal !== 100 && diffTotal > 0) {
    const scale = 100 / diffTotal
    difficulty.easy = Math.round(difficulty.easy * scale)
    difficulty.medium = Math.round(difficulty.medium * scale)
    difficulty.hard = 100 - difficulty.easy - difficulty.medium
  }

  // Ensure bloom levels sum to 100
  const bloom = analysis.question_style?.bloom_levels || {
    remember: 20,
    understand: 30,
    apply: 25,
    analyze: 15,
    evaluate: 7,
    create: 3,
  }
  const bloomTotal = Object.values(bloom).reduce((a, b) => a + b, 0)
  if (bloomTotal !== 100 && bloomTotal > 0) {
    const scale = 100 / bloomTotal
    bloom.remember = Math.round(bloom.remember * scale)
    bloom.understand = Math.round(bloom.understand * scale)
    bloom.apply = Math.round(bloom.apply * scale)
    bloom.analyze = Math.round(bloom.analyze * scale)
    bloom.evaluate = Math.round(bloom.evaluate * scale)
    bloom.create = 100 - bloom.remember - bloom.understand - bloom.apply - bloom.analyze - bloom.evaluate
  }

  return {
    total_questions: analysis.total_questions || 0,
    total_points: analysis.total_points || 0,
    time_estimate_minutes: analysis.time_estimate_minutes || null,
    question_types: filteredQuestionTypes,
    difficulty_distribution: difficulty,
    point_distribution: {
      min_points: analysis.point_distribution?.min_points || 1,
      max_points: analysis.point_distribution?.max_points || 10,
      avg_points: analysis.point_distribution?.avg_points || 2,
      common_values: analysis.point_distribution?.common_values || [1, 2, 5],
    },
    structure_patterns: {
      has_sections: analysis.structure_patterns?.has_sections || false,
      section_count: analysis.structure_patterns?.section_count || 1,
      sections: analysis.structure_patterns?.sections || [],
      has_instructions: analysis.structure_patterns?.has_instructions || true,
      instruction_style: analysis.structure_patterns?.instruction_style || undefined,
    },
    grading_patterns: {
      partial_credit_allowed: analysis.grading_patterns?.partial_credit_allowed || false,
      rubric_style: analysis.grading_patterns?.rubric_style || 'points',
      common_point_values: analysis.grading_patterns?.common_point_values || [1, 2, 5],
      bonus_questions: analysis.grading_patterns?.bonus_questions || false,
    },
    question_style: {
      avg_question_length_words: analysis.question_style?.avg_question_length_words || 15,
      uses_scenarios: analysis.question_style?.uses_scenarios || false,
      uses_diagrams: analysis.question_style?.uses_diagrams || false,
      uses_calculations: analysis.question_style?.uses_calculations || false,
      command_terms: analysis.question_style?.command_terms || [],
      bloom_levels: bloom,
    },
    sample_questions: analysis.sample_questions || [],
  }
}

/**
 * Get media type from file extension
 */
export function getMediaTypeFromExtension(
  extension: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const ext = extension.toLowerCase().replace('.', '')
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'image/jpeg'
  }
}
