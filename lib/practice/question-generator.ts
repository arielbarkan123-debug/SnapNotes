// =============================================================================
// Practice Question Generator
// AI-powered generation of practice questions from course content
// =============================================================================

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type {
  GeneratedQuestion,
  GenerateQuestionsRequest,
  PracticeQuestionInsert,
  PracticeQuestionType,
} from './types'
import type { CognitiveLevel, DifficultyLevel } from '@/lib/adaptive/types'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

const QUESTION_TYPE_DESCRIPTIONS: Record<PracticeQuestionType, string> = {
  multiple_choice: '4 options (A-D) with one correct answer',
  true_false: 'Statement that is either true or false',
  fill_blank: 'Sentence with a blank to fill in',
  short_answer: 'Open question requiring a brief text response',
  matching: 'Match items from two columns',
  sequence: 'Put items in correct order',
  image_label: 'Label parts of a diagram or image (requires image_label_data with labels and positions)',
}

const COGNITIVE_LEVEL_DESCRIPTIONS: Record<CognitiveLevel, string> = {
  remember: 'Recall facts and basic concepts',
  understand: 'Explain ideas or concepts',
  apply: 'Use information in new situations',
  analyze: 'Draw connections among ideas',
  evaluate: 'Justify a decision or course of action',
  create: 'Produce new or original work',
}

// -----------------------------------------------------------------------------
// Prompts
// -----------------------------------------------------------------------------

function buildGenerationPrompt(
  courseContent: string,
  concepts: { name: string; description: string }[],
  request: GenerateQuestionsRequest
): string {
  const questionTypes = request.questionTypes?.length
    ? request.questionTypes
    : ['multiple_choice', 'true_false', 'fill_blank']

  const typeDescriptions = questionTypes
    .map((t) => `- ${t}: ${QUESTION_TYPE_DESCRIPTIONS[t as PracticeQuestionType]}`)
    .join('\n')

  const conceptList = concepts.length
    ? concepts.map((c) => `- ${c.name}: ${c.description}`).join('\n')
    : 'No specific concepts provided. Extract key concepts from the content.'

  const difficultyGuidance = request.difficulty
    ? `Target difficulty level: ${request.difficulty}/5`
    : 'Vary difficulty levels from 1 (easy) to 5 (hard)'

  return `You are an expert educational content creator. Generate ${request.count} practice questions based on the following course content.

## Question Types to Generate:
${typeDescriptions}

## Concepts to Cover:
${conceptList}

## Difficulty:
${difficultyGuidance}

## Cognitive Levels (Bloom's Taxonomy):
${Object.entries(COGNITIVE_LEVEL_DESCRIPTIONS)
  .map(([level, desc]) => `- ${level}: ${desc}`)
  .join('\n')}

## Course Content:
${courseContent}

## Requirements:
1. Each question must be clear, unambiguous, and have one definitive correct answer
2. Multiple choice options should include plausible distractors
3. Explanations should help students understand WHY the answer is correct
4. Tag each question with relevant topics
5. Distribute questions across different cognitive levels
6. For fill_blank: use underscores for the blank (e.g., "The process of _____ converts...")
7. For matching/sequence: provide clear items that can be matched/ordered

## Output Format:
Return a JSON array of questions:
[
  {
    "question_type": "multiple_choice",
    "question_text": "What is the primary function of mitochondria?",
    "options": {
      "choices": [
        {"label": "A", "value": "Energy production (ATP synthesis)"},
        {"label": "B", "value": "Protein synthesis"},
        {"label": "C", "value": "DNA replication"},
        {"label": "D", "value": "Cell division"}
      ]
    },
    "correct_answer": "A",
    "explanation": "Mitochondria are known as the powerhouse of the cell because they produce ATP through cellular respiration.",
    "difficulty_level": 2,
    "cognitive_level": "remember",
    "concept_name": "Cellular Respiration",
    "tags": ["biology", "cell-biology", "mitochondria"]
  },
  {
    "question_type": "true_false",
    "question_text": "Photosynthesis only occurs in plant cells.",
    "options": null,
    "correct_answer": "false",
    "explanation": "Photosynthesis also occurs in some bacteria and algae, not just plant cells.",
    "difficulty_level": 3,
    "cognitive_level": "understand",
    "concept_name": "Photosynthesis",
    "tags": ["biology", "photosynthesis"]
  },
  {
    "question_type": "fill_blank",
    "question_text": "The process of _____ converts glucose into pyruvate in the cytoplasm.",
    "options": null,
    "correct_answer": "glycolysis",
    "explanation": "Glycolysis is the first step of cellular respiration and occurs in the cytoplasm.",
    "difficulty_level": 2,
    "cognitive_level": "remember",
    "concept_name": "Glycolysis",
    "tags": ["biology", "cellular-respiration", "metabolism"]
  }
]

Generate exactly ${request.count} questions. Return ONLY the JSON array, no other text.`
}

// -----------------------------------------------------------------------------
// Content Fetching
// -----------------------------------------------------------------------------

async function fetchCourseContent(courseId: string): Promise<{
  content: string
  subject: string | null
  topic: string | null
}> {
  const supabase = await createClient()

  // Get course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('title, description, key_concepts, sections, lessons')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`)
  }

  // Build content string from course data
  let content = `# ${course.title}\n\n`

  if (course.description) {
    content += `## Overview\n${course.description}\n\n`
  }

  if (course.key_concepts) {
    content += `## Key Concepts\n${course.key_concepts.join(', ')}\n\n`
  }

  // Add section/lesson content
  const sections = course.sections as any[] | null
  const lessons = course.lessons as any[] | null

  if (sections) {
    for (const section of sections) {
      content += `## ${section.title}\n`
      if (section.lessons) {
        for (const lesson of section.lessons) {
          content += `### ${lesson.title}\n`
          if (lesson.steps) {
            for (const step of lesson.steps) {
              if (step.type === 'content' && step.content) {
                content += `${step.content}\n\n`
              }
            }
          }
        }
      }
    }
  } else if (lessons) {
    for (const lesson of lessons) {
      content += `## ${lesson.title}\n`
      if (lesson.steps) {
        for (const step of lesson.steps) {
          if (step.type === 'content' && step.content) {
            content += `${step.content}\n\n`
          }
        }
      }
    }
  }

  // Extract subject/topic from course title or use defaults
  const titleParts = course.title.split(':')
  const subject = titleParts.length > 1 ? titleParts[0].trim().toLowerCase() : null
  const topic = titleParts.length > 1 ? titleParts[1].trim().toLowerCase() : course.title.toLowerCase()

  return { content, subject, topic }
}

async function fetchConcepts(
  courseId: string,
  conceptIds?: string[]
): Promise<{ id: string; name: string; description: string }[]> {
  const supabase = await createClient()

  let query = supabase
    .from('concepts')
    .select('id, name, description')

  if (conceptIds?.length) {
    query = query.in('id', conceptIds)
  } else {
    // Get concepts linked to this course
    const { data: mappings } = await supabase
      .from('content_concepts')
      .select('concept_id')
      .eq('course_id', courseId)

    if (mappings?.length) {
      const ids = mappings.map((m) => m.concept_id)
      query = query.in('id', ids)
    }
  }

  const { data, error } = await query.limit(20)

  if (error) {
    console.error('Error fetching concepts:', error)
    return []
  }

  return data || []
}

// -----------------------------------------------------------------------------
// Question Generation
// -----------------------------------------------------------------------------

export async function generatePracticeQuestions(
  request: GenerateQuestionsRequest
): Promise<GeneratedQuestion[]> {
  // Fetch course content and concepts
  const [{ content }, concepts] = await Promise.all([
    fetchCourseContent(request.courseId),
    fetchConcepts(request.courseId, request.conceptIds),
  ])

  // Build prompt
  const prompt = buildGenerationPrompt(
    content.substring(0, 15000), // Limit content size
    concepts.map((c) => ({ name: c.name, description: c.description || '' })),
    request
  )

  // Call Anthropic API
  const anthropic = new Anthropic()

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  // Parse response
  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const questions = JSON.parse(jsonStr) as GeneratedQuestion[]

    // Validate and clean questions
    return questions.map((q) => ({
      ...q,
      difficulty_level: Math.max(1, Math.min(5, q.difficulty_level)) as DifficultyLevel,
      cognitive_level: validateCognitiveLevel(q.cognitive_level),
      tags: q.tags || [],
    }))
  } catch (error) {
    console.error('Failed to parse generated questions:', error)
    throw new Error('Failed to generate valid questions')
  }
}

function validateCognitiveLevel(level: string): CognitiveLevel {
  const valid: CognitiveLevel[] = [
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create',
  ]
  return valid.includes(level as CognitiveLevel)
    ? (level as CognitiveLevel)
    : 'understand'
}

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

export async function storePracticeQuestions(
  questions: GeneratedQuestion[],
  courseId: string,
  conceptMap: Map<string, string> // concept_name -> concept_id
): Promise<string[]> {
  const supabase = await createClient()

  // Get subject/topic from course
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .single()

  const titleParts = course?.title?.split(':') || []
  const subject = titleParts.length > 1 ? titleParts[0].trim().toLowerCase() : 'general'
  const topic = titleParts.length > 1 ? titleParts[1].trim().toLowerCase() : 'general'

  // Prepare inserts
  const inserts: PracticeQuestionInsert[] = questions.map((q) => ({
    course_id: courseId,
    subject,
    topic,
    subtopic: null,
    question_type: q.question_type,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    difficulty_level: q.difficulty_level,
    cognitive_level: q.cognitive_level,
    primary_concept_id: conceptMap.get(q.concept_name) || null,
    related_concept_ids: null,
    tags: q.tags,
    source: 'generated',
  }))

  const { data, error } = await supabase
    .from('practice_questions')
    .insert(inserts)
    .select('id')

  if (error) {
    console.error('Error storing practice questions:', error)
    throw new Error('Failed to store practice questions')
  }

  return data?.map((d) => d.id) || []
}

// -----------------------------------------------------------------------------
// Batch Generation
// -----------------------------------------------------------------------------

export async function generateAndStoreQuestions(
  request: GenerateQuestionsRequest
): Promise<{ questionIds: string[]; count: number }> {
  // Generate questions
  const questions = await generatePracticeQuestions(request)

  // Build concept map
  const supabase = await createClient()
  const conceptNames = [...new Set(questions.map((q) => q.concept_name))]

  const { data: concepts } = await supabase
    .from('concepts')
    .select('id, name')
    .in('name', conceptNames)

  const conceptMap = new Map(concepts?.map((c) => [c.name, c.id]) || [])

  // Store questions
  const questionIds = await storePracticeQuestions(questions, request.courseId, conceptMap)

  return { questionIds, count: questionIds.length }
}

// -----------------------------------------------------------------------------
// Question Selection
// -----------------------------------------------------------------------------

export interface SelectQuestionsOptions {
  courseId?: string
  conceptIds?: string[]
  difficulty?: DifficultyLevel
  questionTypes?: PracticeQuestionType[]
  count: number
  excludeQuestionIds?: string[]
}

export async function selectExistingQuestions(
  options: SelectQuestionsOptions
): Promise<string[]> {
  const supabase = await createClient()

  let query = supabase
    .from('practice_questions')
    .select('id')
    .eq('is_active', true)

  if (options.courseId) {
    query = query.eq('course_id', options.courseId)
  }

  if (options.conceptIds?.length) {
    query = query.or(
      `primary_concept_id.in.(${options.conceptIds.join(',')}),related_concept_ids.ov.{${options.conceptIds.join(',')}}`
    )
  }

  if (options.difficulty) {
    query = query.eq('difficulty_level', options.difficulty)
  }

  if (options.questionTypes?.length) {
    query = query.in('question_type', options.questionTypes)
  }

  if (options.excludeQuestionIds?.length) {
    query = query.not('id', 'in', `(${options.excludeQuestionIds.join(',')})`)
  }

  // Order by least shown, then random
  query = query.order('times_shown', { ascending: true }).limit(options.count * 2)

  const { data, error } = await query

  if (error) {
    console.error('Error selecting questions:', error)
    return []
  }

  // Shuffle and take requested count
  const shuffled = (data || []).sort(() => Math.random() - 0.5)
  return shuffled.slice(0, options.count).map((q) => q.id)
}
