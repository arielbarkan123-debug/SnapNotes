/**
 * Card Generator
 *
 * Generates review cards (flashcards) from course content.
 * Extracts key points, formulas, questions, and important explanations
 * and formats them for spaced repetition review.
 *
 * Uses AI batch generation for high-quality questions, with regex fallback.
 * Supports both new `steps` format and legacy format for backwards compatibility.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  GeneratedCourse,
  Formula,
  ReviewCardInsert,
  CardType,
  LessonStep,
  Step,
  MultipleChoiceData,
  TrueFalseData,
} from '@/types'

// Type for course sections/lessons with flexible step format
type CourseSection = {
  title?: string
  steps?: LessonStep[]
  // Legacy formats
  content?: string
  keyPoints?: string[]
  formulas?: Formula[]
  explanation?: string
  questions?: Array<{ question?: string; options?: string[]; correct?: number; correctIndex?: number }>
}

import {
  createMultipleChoiceBack,
  createTrueFalseBack,
} from '@/types/srs'

import {
  classifyTopicType,
  type TopicType,
} from '@/lib/ai/content-classifier'

// =============================================================================
// Concept Mapping Types
// =============================================================================

/**
 * Maps content (lesson/step) to concepts
 * Key format: "lessonIndex" or "lessonIndex:stepIndex"
 */
export type ConceptMapping = Map<string, string[]>

/**
 * Content-to-concept relationship from database
 */
export interface ContentConceptRow {
  lesson_index: number
  step_index: number | null
  concept_id: string
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum word count for explanation cards */
const MIN_EXPLANATION_WORDS = 20

/** Maximum words for card front (questions) */
const _MAX_FRONT_WORDS = 30

/** Maximum words for card back (answers) */
const MAX_BACK_WORDS = 200

/** AI model for batch question generation */
const AI_MODEL = 'claude-sonnet-4-6-20250227'

// =============================================================================
// Quality Filter
// =============================================================================

/**
 * Check if a generated question meets minimum quality standards.
 * Rejects garbage patterns like "What does when", questions under 5 words, etc.
 * Supports both English and Hebrew questions.
 */
export function isQuestionQualityAcceptable(question: string): boolean {
  if (!question || typeof question !== 'string') return false

  const trimmed = question.trim()

  // Check for Hebrew content (has Hebrew characters)
  const hasHebrew = /[\u0590-\u05FF]/.test(trimmed)

  // Question mark at start = RTL corruption or parse error
  if (trimmed.startsWith('?')) return false

  // Too short - allow fewer "words" for Hebrew since it's more compact
  // Hebrew uses spaces differently and words can be longer
  const wordCount = trimmed.split(/\s+/).length
  const minWords = hasHebrew ? 3 : 5
  if (wordCount < minWords) return false

  // Too long — likely regurgitated content, not a real question
  if (trimmed.length > 120) return false

  // Missing question mark (for questions, not imperative "Solve:" style)
  // English imperatives
  const englishImperativeStyle = /^(solve|calculate|convert|simplify|evaluate|find|compute|determine|explain|review):/i.test(trimmed)
  // Hebrew imperatives: פתור, חשב, המר, פשט, מצא, קבע, הסבר, השלם, חלק, השווה, תאר, הגדר, נתח, הוכח, בדוק
  const hebrewImperativeStyle = /^(פתור|חשב|המר|פשט|מצא|קבע|הסבר|השלם|חלק|השווה|תאר|הגדר|נתח|הוכח|בדוק):/i.test(trimmed)

  const isImperativeStyle = englishImperativeStyle || hebrewImperativeStyle

  // Sentence ending with period — not a question (unless imperative or "Review:" style)
  if (trimmed.endsWith('.') && !isImperativeStyle && !/^(review|explain):/i.test(trimmed)) return false

  // Hebrew questions starting with מה/מי/איך/למה/מדוע/כיצד/האם/כמה/איזה/אילו are valid even without ?
  const hebrewQuestionWord = hasHebrew && /^(מה|מי|איך|למה|מדוע|כיצד|האם|כמה|איזה|אילו)\s/i.test(trimmed)

  if (!isImperativeStyle && !hebrewQuestionWord && !trimmed.endsWith('?')) return false

  // Garbage patterns from bad regex extraction (English only - Hebrew garbage patterns differ)
  const garbagePatterns = [
    /^what does when\b/i,
    /^what is when\b/i,
    /^what does to\b/i,                        // Fragment: "What does to convert..."
    /^what is to\b/i,                          // Fragment: "What is to convert..."
    /^what does \w+ do\?$/i,                   // Too generic single-word subject: "What does comparing do?"
    /^what is a key point about/i,             // Default fallback — not useful
    /^what does do\b/i,
    /^what (is|does|are|do)\s+\?$/i,           // Missing subject: "What is ?"
    /^explain:?\s*$/i,
    /:\s*(write|find|solve|calculate|determine|identify)\s+the\b/i, // Instruction fragment mixed into question
  ]

  // Only check English garbage patterns for English questions
  if (!hasHebrew) {
    for (const pattern of garbagePatterns) {
      if (pattern.test(trimmed)) return false
    }
  }

  return true
}

// =============================================================================
// AI Batch Question Generation
// =============================================================================

interface ContentItem {
  index: number
  type: 'key_point' | 'explanation'
  content: string
  sectionTitle: string
}

/** Max items per AI batch to avoid token overflow */
const BATCH_SIZE = 15

/**
 * Generate high-quality questions for a batch of content items using AI.
 * Splits large batches into groups of BATCH_SIZE and runs them in parallel.
 * Returns a map from item index to generated question string.
 */
async function generateQuestionsFromContentBatch(
  items: ContentItem[],
  courseTitle: string,
  topicType: TopicType,
  language: 'en' | 'he' = 'en'
): Promise<Map<number, string>> {
  const result = new Map<number, string>()

  if (items.length === 0) return result

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[CardGenerator] No ANTHROPIC_API_KEY, falling back to regex generation')
    return result
  }

  // Split items into batches of BATCH_SIZE
  const batches: ContentItem[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE))
  }

  // Run all batches in parallel
  const batchPromises = batches.map(batch =>
    generateSingleBatch(batch, courseTitle, topicType, language, apiKey)
  )

  const batchResults = await Promise.allSettled(batchPromises)

  // Merge results from all batches
  for (const batchResult of batchResults) {
    if (batchResult.status === 'fulfilled') {
      for (const [key, value] of batchResult.value) {
        result.set(key, value)
      }
    }
    // Rejected batches are silently skipped — fallback will handle those items
  }

  return result
}

/**
 * Generate questions for a single batch of content items (max ~15 items).
 */
async function generateSingleBatch(
  items: ContentItem[],
  courseTitle: string,
  topicType: TopicType,
  language: 'en' | 'he',
  apiKey: string
): Promise<Map<number, string>> {
  const result = new Map<number, string>()

  // Build Hebrew language instruction if needed
  const hebrewInstruction = language === 'he' ? `
## Language Requirement - CRITICAL
Generate ALL questions in Hebrew (עברית).
- Every question must be written in Hebrew
- Keep mathematical notation standard (numbers, symbols, formulas)
- Use proper Hebrew educational terminology
- For math: "חשב:", "פתור:", "המר:", "פשט:"
- For concepts: "מה הוא...", "הסבר מדוע...", "כיצד..."
` : ''

  // Build the AI prompt based on topic type
  let formatInstructions: string
  if (topicType === 'computational') {
    formatInstructions = language === 'he'
      ? `צור בעיות חישוב אמיתיות, לא שאלות אוצר מילים.
דוגמאות טובות: "פתור: מה הסכום של 3/4 + 1/2?", "חשב 25% מ-80", "המר 0.75 לשבר", "פשט: 12/18"
דוגמאות גרועות: "מה המשמעות של השוואה?", "הסבר את המושג שברים"
כל שאלה צריכה לדרוש חישוב כדי לענות.`
      : `Generate ACTUAL MATH PROBLEMS, not vocabulary questions.
GOOD examples: "Solve: What is 3/4 + 1/2?", "Calculate 25% of 80", "Convert 0.75 to a fraction", "Simplify: 12/18"
BAD examples: "What does comparing mean?", "Explain the concept of fractions", "What is a key point about percentages?"
Each question should require COMPUTATION to answer.`
  } else if (topicType === 'conceptual') {
    formatInstructions = language === 'he'
      ? `צור שאלות הבנה שבודקות ידע של מושגים.
דוגמאות טובות: "מה התפקיד העיקרי של המיטוכונדריה?", "הסבר מדוע חזיתות חמות גורמות לשינויי מזג אוויר הדרגתיים"
דוגמאות גרועות: "מה זה כשמשווים?", "מה נקודה מרכזית לגבי ביולוגיה?"
כל שאלה צריכה לבדוק הבנה של המושג.`
      : `Generate understanding questions that test knowledge of concepts.
GOOD examples: "What is the main function of mitochondria?", "Explain why warm fronts cause gradual weather changes", "How does natural selection drive evolution?"
BAD examples: "What does when comparing do?", "What is a key point about biology?"
Each question should test understanding of the concept.`
  } else {
    formatInstructions = language === 'he'
      ? `צור תערובת של בעיות חישוב (לפחות 50%) ושאלות הבנה.
לתוכן מתמטי: "פתור: ...", "חשב: ...", "המר: ..."
לתוכן מושגי: "הסבר ...", "מה הוא ...", "מדוע ..."
לעולם אל תיצור שאלות מעורפלות כמו "מה נקודה מרכזית לגבי X?"`
      : `Generate a mix of computational problems (at least 50%) and understanding questions.
For math/numeric content: "Solve: ...", "Calculate ...", "Convert ..."
For conceptual content: "Explain ...", "What is ...", "Why does ..."
NEVER generate vague questions like "What is a key point about X?"`
  }

  const itemList = items.map((item, i) =>
    `[${i}] (${item.type}) Section: "${item.sectionTitle}"\nContent: ${item.content.slice(0, 300)}`
  ).join('\n\n')

  const prompt = `You are generating flashcard questions for a course titled "${courseTitle}".
${hebrewInstruction}

${formatInstructions}

Generate ONE clear, specific question for each content item below. Return ONLY a JSON array of objects with "index" (matching the [N] number) and "question" fields.

Content items:
${itemList}

Return JSON array like: [{"index": 0, "question": "..."}, {"index": 1, "question": "..."}]`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return result

    const jsonMatch = text.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return result

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; question: string }>

    for (const entry of parsed) {
      if (typeof entry.index === 'number' && typeof entry.question === 'string') {
        const actualItem = items[entry.index]
        if (actualItem && isQuestionQualityAcceptable(entry.question)) {
          result.set(actualItem.index, entry.question)
        }
      }
    }
  } catch (error) {
    console.error('[CardGenerator] AI batch generation failed for batch, will use fallback:', error)
  }

  return result
}

/**
 * Regenerate a single card's question using AI.
 * Used for lazy on-the-fly regeneration of bad cards during review.
 *
 * @param front - Current (bad) question text
 * @param back - Card answer/content
 * @param courseTitle - Course title for context
 * @param language - Language for the question (defaults to detecting from content)
 */
export async function regenerateCardQuestion(
  front: string,
  back: string,
  courseTitle: string,
  language?: 'en' | 'he'
): Promise<string | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null

    const topicType = classifyTopicType(back, courseTitle)

    // Auto-detect Hebrew if not specified (check if content contains Hebrew characters)
    const isHebrew = language === 'he' || (
      !language && /[\u0590-\u05FF]/.test(back)
    )

    let style: string
    let languageInstruction = ''

    if (isHebrew) {
      languageInstruction = '\n\nIMPORTANT: Generate the question in Hebrew (עברית). Use proper Hebrew educational terminology.'
      style = topicType === 'computational'
        ? 'בעיית חישוב אמיתית (למשל: "פתור: ...", "חשב: ...")'
        : 'שאלת הבנה ברורה'
    } else {
      style = topicType === 'computational'
        ? 'an actual math problem to solve (e.g., "Solve: ...", "Calculate: ...")'
        : 'a clear understanding question'
    }

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `The following flashcard has a bad question. Generate ${style} for this answer content.${languageInstruction}

Course: "${courseTitle}"
Current bad question: "${front}"
Answer/content: "${back.slice(0, 500)}"

Return ONLY the new question text, nothing else.`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return null

    const newQuestion = text.text.trim()
    return isQuestionQualityAcceptable(newQuestion) ? newQuestion : null
  } catch (error) {
    console.error('[CardGenerator] Single card regeneration failed:', error)
    return null
  }
}

// =============================================================================
// Main Generator Function
// =============================================================================

/**
 * Options for card generation
 */
export interface CardGenerationOptions {
  conceptMappings?: ConceptMapping
  language?: 'en' | 'he'
}

/**
 * Generate review cards from a course's content
 *
 * Uses AI batch generation for key_point and explanation cards,
 * with regex fallback if AI is unavailable.
 *
 * @param course - The generated course content
 * @param courseId - The course's database ID
 * @param options - Optional generation options (conceptMappings, language)
 * @returns Array of ReviewCardInsert objects ready for database insertion
 */
export async function generateCardsFromCourse(
  course: GeneratedCourse & { sections?: CourseSection[]; lessons?: CourseSection[]; keyConcepts?: string[] },
  courseId: string,
  options?: CardGenerationOptions | ConceptMapping
): Promise<ReviewCardInsert[]> {
  // Support both old signature (ConceptMapping) and new signature (options object)
  let conceptMappings: ConceptMapping | undefined
  let language: 'en' | 'he' = 'en'

  if (options) {
    if (options instanceof Map) {
      // Old signature: conceptMappings directly
      conceptMappings = options
    } else {
      // New signature: options object
      conceptMappings = options.conceptMappings
      language = options.language || 'en'
    }
  }

  const cards: ReviewCardInsert[] = []

  // Handle both "sections" (AI response) and "lessons" (normalized)
  const lessonsData = course.lessons || course.sections || []

  if (!lessonsData || lessonsData.length === 0) {
    console.log('No lessons/sections found in course')
    return cards
  }

  // Classify the course topic type for AI question generation
  const courseTitle = course.title || 'Course'
  const topicType = classifyTopicType(courseTitle)

  // Collect all items that need AI-generated questions across all sections
  const allContentItems: ContentItem[] = []
  // Track where each item belongs for card assembly after AI generation
  interface CardSlot {
    courseId: string
    lessonIndex: number
    stepIndex: number
    cardType: CardType
    back: string
    conceptIds?: string[]
    contentItemGlobalIndex: number // index into allContentItems
  }
  const pendingSlots: CardSlot[] = []

  // Process each section (lesson) — first pass: collect content for AI batch
  lessonsData.forEach((section: CourseSection, lessonIndex: number) => {
    if (!section) return

    let stepIndex = 0
    const sectionTitle = section.title || `Section ${lessonIndex + 1}`

    // Process steps format
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      const { directCards, contentItems, slots } = collectFromSteps(
        section.steps,
        sectionTitle,
        courseId,
        lessonIndex,
        conceptMappings,
        allContentItems.length
      )
      cards.push(...directCards)
      allContentItems.push(...contentItems)
      pendingSlots.push(...slots)
      stepIndex += directCards.length + contentItems.length
    }

    // Legacy key points
    if (section.keyPoints && Array.isArray(section.keyPoints) && section.keyPoints.length > 0) {
      section.keyPoints.forEach((keyPoint, kpIndex) => {
        const si = stepIndex + kpIndex
        const conceptIds = getConceptIds(lessonIndex, si, conceptMappings)
        const globalIdx = allContentItems.length
        allContentItems.push({
          index: globalIdx,
          type: 'key_point',
          content: keyPoint,
          sectionTitle,
        })
        pendingSlots.push({
          courseId,
          lessonIndex,
          stepIndex: si,
          cardType: 'flashcard' as CardType,
          back: keyPoint,
          conceptIds,
          contentItemGlobalIndex: globalIdx,
        })
      })
      stepIndex += section.keyPoints.length
    }

    // Legacy explanation
    if (section.explanation && typeof section.explanation === 'string') {
      const wordCount = section.explanation.split(/\s+/).length
      if (wordCount >= MIN_EXPLANATION_WORDS) {
        const conceptIds = getConceptIds(lessonIndex, stepIndex, conceptMappings)
        const globalIdx = allContentItems.length
        allContentItems.push({
          index: globalIdx,
          type: 'explanation',
          content: section.explanation,
          sectionTitle,
        })
        pendingSlots.push({
          courseId,
          lessonIndex,
          stepIndex,
          cardType: 'short_answer' as CardType,
          back: truncateText(section.explanation, MAX_BACK_WORDS),
          conceptIds,
          contentItemGlobalIndex: globalIdx,
        })
        stepIndex += 1
      }
    }

    // Formulas (no AI needed — formula questions use dedicated template)
    if (section.formulas && Array.isArray(section.formulas) && section.formulas.length > 0) {
      const formulaCards = generateFormulaCards(
        section.formulas,
        sectionTitle,
        courseId,
        lessonIndex,
        stepIndex,
        conceptMappings
      )
      cards.push(...formulaCards)
      stepIndex += formulaCards.length
    }
  })

  // AI batch generation for all pending content items
  let aiQuestions = new Map<number, string>()
  if (allContentItems.length > 0) {
    aiQuestions = await generateQuestionsFromContentBatch(
      allContentItems,
      courseTitle,
      topicType,
      language
    )
  }

  // Assemble pending cards with AI questions or regex fallback
  for (const slot of pendingSlots) {
    const item = allContentItems[slot.contentItemGlobalIndex]
    let question = aiQuestions.get(item.index)

    // Fallback to regex if AI didn't produce a question for this item
    if (!question) {
      if (slot.cardType === 'flashcard') {
        question = generateQuestionFromKeyPointFallback(item.content, item.sectionTitle)
      } else {
        question = generateQuestionFromContentFallback(item.content, item.sectionTitle)
      }
      // Apply quality filter to fallback too
      if (!isQuestionQualityAcceptable(question)) {
        question = `Review this concept from "${item.sectionTitle}":`
      }
    }

    cards.push({
      course_id: slot.courseId,
      lesson_index: slot.lessonIndex,
      step_index: slot.stepIndex,
      card_type: slot.cardType,
      front: question,
      back: slot.back,
      concept_ids: slot.conceptIds,
    })
  }

  // Course-level key concepts
  const keyConcepts = course.keyConcepts || []
  if (keyConcepts.length > 0) {
    const conceptCards = generateConceptCards(
      keyConcepts,
      courseTitle,
      courseId,
      0,
      cards.length
    )
    cards.push(...conceptCards)
  }

  return cards
}

/**
 * Build a concept mapping from database rows
 * Used to link generated cards to their concepts
 */
export function buildConceptMapping(rows: ContentConceptRow[]): ConceptMapping {
  const mapping: ConceptMapping = new Map()

  for (const row of rows) {
    // Create key for this content location
    const key = row.step_index !== null
      ? `${row.lesson_index}:${row.step_index}`
      : `${row.lesson_index}`

    // Add concept to the mapping
    const existing = mapping.get(key) || []
    if (!existing.includes(row.concept_id)) {
      existing.push(row.concept_id)
      mapping.set(key, existing)
    }
  }

  return mapping
}

/**
 * Get concept IDs for a specific lesson/step from the mapping
 */
function getConceptIds(
  lessonIndex: number,
  stepIndex: number,
  conceptMappings?: ConceptMapping
): string[] | undefined {
  if (!conceptMappings) return undefined

  // Try exact match first (lesson:step)
  const exactKey = `${lessonIndex}:${stepIndex}`
  const exactMatch = conceptMappings.get(exactKey)
  if (exactMatch && exactMatch.length > 0) {
    return exactMatch
  }

  // Fall back to lesson-level concepts
  const lessonKey = `${lessonIndex}`
  const lessonMatch = conceptMappings.get(lessonKey)
  if (lessonMatch && lessonMatch.length > 0) {
    return lessonMatch
  }

  return undefined
}

// =============================================================================
// Steps-based Card Collection (for AI batch)
// =============================================================================

// Extended step type to handle legacy AI formats
type ExtendedStep = LessonStep & { question?: string; correctIndex?: number }

interface CollectedSteps {
  directCards: ReviewCardInsert[]
  contentItems: ContentItem[]
  slots: Array<{
    courseId: string
    lessonIndex: number
    stepIndex: number
    cardType: CardType
    back: string
    conceptIds?: string[]
    contentItemGlobalIndex: number
  }>
}

/**
 * Collect cards from steps — question-type steps produce direct cards,
 * key_point and explanation steps produce content items for AI batch.
 */
function collectFromSteps(
  steps: LessonStep[],
  sectionTitle: string,
  courseId: string,
  lessonIndex: number,
  conceptMappings: ConceptMapping | undefined,
  globalIndexStart: number
): CollectedSteps {
  const directCards: ReviewCardInsert[] = []
  const contentItems: ContentItem[] = []
  const slots: CollectedSteps['slots'] = []
  let nextGlobalIndex = globalIndexStart

  steps.forEach((rawStep: LessonStep, index: number) => {
    const step = rawStep as ExtendedStep
    const stepType = step.type || 'explanation'
    const conceptIds = getConceptIds(lessonIndex, index, conceptMappings)

    if (stepType === 'question') {
      // Question steps are handled directly (no AI needed)
      const questionText = step.content || step.question || ''
      const correctIndex = step.correct_answer ?? step.correctIndex ?? 0
      const options = step.options || []

      if (questionText && options.length > 0) {
        const cardType = determineQuestionCardType(options)

        if (cardType === 'true_false') {
          const isTrue = options[correctIndex]?.toLowerCase().includes('true')
          const trueFalseData: TrueFalseData = {
            correct: isTrue,
            explanation: step.explanation,
          }
          directCards.push({
            course_id: courseId,
            lesson_index: lessonIndex,
            step_index: index,
            card_type: 'true_false' as CardType,
            front: questionText,
            back: createTrueFalseBack(trueFalseData),
            concept_ids: conceptIds,
          })
        } else {
          const mcData: MultipleChoiceData = {
            options: options,
            correctIndex: correctIndex,
            explanation: step.explanation,
          }
          directCards.push({
            course_id: courseId,
            lesson_index: lessonIndex,
            step_index: index,
            card_type: 'multiple_choice' as CardType,
            front: questionText,
            back: createMultipleChoiceBack(mcData),
            concept_ids: conceptIds,
          })
        }
      }
    } else if (stepType === 'key_point') {
      const content = step.content || ''
      if (content && content.length > 10) {
        const globalIdx = nextGlobalIndex++
        contentItems.push({
          index: globalIdx,
          type: 'key_point',
          content,
          sectionTitle,
        })
        slots.push({
          courseId,
          lessonIndex,
          stepIndex: index,
          cardType: 'flashcard' as CardType,
          back: content,
          conceptIds,
          contentItemGlobalIndex: globalIdx,
        })
      }
    } else if (stepType === 'explanation' || stepType === 'summary') {
      const content = step.content || ''
      if (content && content.length > 50) {
        const globalIdx = nextGlobalIndex++
        contentItems.push({
          index: globalIdx,
          type: 'explanation',
          content,
          sectionTitle,
        })
        slots.push({
          courseId,
          lessonIndex,
          stepIndex: index,
          cardType: 'short_answer' as CardType,
          back: truncateText(content, MAX_BACK_WORDS),
          conceptIds,
          contentItemGlobalIndex: globalIdx,
        })
      }
    }
  })

  return { directCards, contentItems, slots }
}

/**
 * Determine the appropriate card type based on question options
 */
function determineQuestionCardType(options: string[]): CardType {
  if (options.length === 2) {
    const lowercaseOptions = options.map(o => o.toLowerCase().trim())
    const trueFalsePatterns = [
      ['true', 'false'],
      ['false', 'true'],
      ['yes', 'no'],
      ['no', 'yes'],
      ['correct', 'incorrect'],
      ['incorrect', 'correct'],
    ]

    for (const pattern of trueFalsePatterns) {
      if (
        lowercaseOptions.includes(pattern[0]) &&
        lowercaseOptions.includes(pattern[1])
      ) {
        return 'true_false'
      }
    }
  }

  return 'multiple_choice'
}

/**
 * Format a question answer from step data
 */
function _formatQuestionAnswerFromStep(options: string[], correctIndex: number, explanation?: string): string {
  const correctAnswer = options[correctIndex] || options[0] || ''
  return `**Answer:** ${correctAnswer}${explanation ? `\n\n**Explanation:** ${explanation}` : ''}`
}

/**
 * Format a question step into a card answer
 */
function _formatQuestionAnswer(question: Step): string {
  const correctIndex = question.correct_answer ?? 0
  const correctAnswer = question.options?.[correctIndex] ?? ''
  return `**Answer:** ${correctAnswer}\n\n**Explanation:** ${question.explanation ?? ''}`
}

// =============================================================================
// Formula Card Generation (no AI needed)
// =============================================================================

function generateFormulaCards(
  formulas: Formula[],
  sectionTitle: string,
  courseId: string,
  lessonIndex: number,
  startStepIndex: number,
  conceptMappings?: ConceptMapping
): ReviewCardInsert[] {
  return formulas.map((formula, index) => {
    const stepIndex = startStepIndex + index
    const conceptIds = getConceptIds(lessonIndex, stepIndex, conceptMappings)
    return {
      course_id: courseId,
      lesson_index: lessonIndex,
      step_index: stepIndex,
      card_type: 'formula' as CardType,
      front: generateFormulaQuestion(formula, sectionTitle),
      back: formatFormulaAnswer(formula),
      concept_ids: conceptIds,
    }
  })
}

function generateConceptCards(
  keyConcepts: string[],
  courseTitle: string,
  courseId: string,
  lessonIndex: number,
  startStepIndex: number
): ReviewCardInsert[] {
  const conceptsToUse = keyConcepts.slice(0, 5)

  return conceptsToUse.map((concept, index) => ({
    course_id: courseId,
    lesson_index: lessonIndex,
    step_index: startStepIndex + index,
    card_type: 'flashcard' as CardType,
    front: `What is "${concept}" in the context of ${courseTitle}?`,
    back: `${concept} is a key concept covered in this course. Review the relevant section for detailed information.`,
  }))
}

// =============================================================================
// Regex Fallback Question Generators
// =============================================================================

/**
 * Fallback: generate a question from a key point using regex patterns.
 * Used only when AI batch generation fails.
 */
function generateQuestionFromKeyPointFallback(keyPoint: string, topic: string): string {
  const lowerKeyPoint = keyPoint.toLowerCase()

  // Pattern: "[Subject] is [definition]"
  const isPattern = /^(.+?)\s+(?:is|are)\s+/i
  const isMatch = keyPoint.match(isPattern)
  if (isMatch) {
    const subject = isMatch[1]
    const subjectWords = subject.split(/\s+/)
    // Validate: 2-8 words, doesn't start with "to " (infinitive), no colons
    if (
      subjectWords.length >= 2 &&
      subjectWords.length <= 8 &&
      !subject.toLowerCase().startsWith('to ') &&
      !subject.includes(':')
    ) {
      const candidate = `What is ${subject.toLowerCase()}?`
      if (isQuestionQualityAcceptable(candidate)) {
        return candidate
      }
    }
  }

  // Pattern: Contains "because" or "due to"
  if (lowerKeyPoint.includes('because') || lowerKeyPoint.includes('due to')) {
    const candidate = `Why is this true: ${truncateText(keyPoint, 15)}...?`
    if (isQuestionQualityAcceptable(candidate)) {
      return candidate
    }
  }

  // Default: use the topic (safe fallback — always passes quality filter)
  return `Review this concept from "${topic}":`
}

/**
 * Fallback: generate a question from explanation content using regex patterns.
 * Used only when AI batch generation fails.
 */
function generateQuestionFromContentFallback(
  content: string,
  topic: string
): string {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const firstSentence = sentences[0]?.trim() || ''

  const subjectMatch = firstSentence.match(/^(?:The\s+)?(.+?)\s+(?:is|are|was|were|has|have)/i)

  if (subjectMatch) {
    const subject = subjectMatch[1].toLowerCase()
    if (
      subject.split(/\s+/).length >= 2 &&
      subject.split(/\s+/).length <= 5 &&
      !subject.startsWith('to ') &&
      !subject.includes(':')
    ) {
      const candidate = `What can you tell me about ${subject}?`
      if (isQuestionQualityAcceptable(candidate)) {
        return candidate
      }
    }
  }

  if (firstSentence.toLowerCase().startsWith('in ')) {
    return `Explain the concept of ${topic}.`
  }

  return `Explain: ${topic}`
}

/**
 * Public wrapper for content question generation (used by external callers).
 * Falls back to regex when called synchronously.
 */
export function generateQuestionFromContent(
  content: string,
  topic: string
): string {
  return generateQuestionFromContentFallback(content, topic)
}

// =============================================================================
// Formula Question Helpers
// =============================================================================

function generateFormulaQuestion(formula: Formula, topic: string): string {
  const explanation = formula.explanation.toLowerCase()

  if (explanation.includes('calculate')) {
    const calcMatch = explanation.match(/calculate[sd]?\s+(?:the\s+)?(.+?)(?:\.|,|$)/i)
    if (calcMatch) {
      return `What is the formula to calculate ${calcMatch[1]}?`
    }
  }

  if (explanation.includes('find')) {
    const findMatch = explanation.match(/find[s]?\s+(?:the\s+)?(.+?)(?:\.|,|$)/i)
    if (findMatch) {
      return `What is the formula to find ${findMatch[1]}?`
    }
  }

  return `What is the formula for ${topic}?`
}

function formatFormulaAnswer(formula: Formula): string {
  return `**Formula:** ${formula.formula}\n\n**Explanation:** ${formula.explanation}`
}

// =============================================================================
// Formatting Helpers
// =============================================================================

function truncateText(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) {
    return text
  }
  return words.slice(0, maxWords).join(' ') + '...'
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Count total cards that would be generated from a course
 */
export function estimateCardCount(course: GeneratedCourse & { sections?: CourseSection[]; lessons?: CourseSection[]; keyConcepts?: string[] }): number {
  let count = 0

  const lessonsData = course.lessons || course.sections || []

  lessonsData.forEach((section: CourseSection) => {
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      section.steps.forEach((step) => {
        if (step.type === 'question' || step.type === 'key_point') {
          count += 1
        }
      })
    } else {
      count += section.keyPoints?.length || 0

      if (section.explanation) {
        const wordCount = section.explanation.split(/\s+/).length
        if (wordCount >= MIN_EXPLANATION_WORDS) {
          count += 1
        }
      }
    }

    count += section.formulas?.length || 0
  })

  if (course.keyConcepts && Array.isArray(course.keyConcepts)) {
    count += Math.min(course.keyConcepts.length, 5)
  }

  return count
}

/**
 * Get a summary of card types that would be generated
 */
export function getCardTypeSummary(
  course: GeneratedCourse & { sections?: CourseSection[]; lessons?: CourseSection[]; keyConcepts?: string[] }
): Partial<Record<CardType, number>> {
  const summary: Partial<Record<CardType, number>> = {
    flashcard: 0,
    multiple_choice: 0,
    true_false: 0,
    short_answer: 0,
    formula: 0,
  }

  const lessonsData = course.lessons || course.sections || []

  lessonsData.forEach((section: CourseSection) => {
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      section.steps.forEach((step) => {
        if (step.type === 'question') {
          const options = step.options || []
          const cardType = determineQuestionCardType(options)
          if (cardType === 'true_false') {
            summary.true_false = (summary.true_false || 0) + 1
          } else {
            summary.multiple_choice = (summary.multiple_choice || 0) + 1
          }
        } else if (step.type === 'key_point') {
          summary.flashcard = (summary.flashcard || 0) + 1
        } else if (step.type === 'explanation' || step.type === 'summary') {
          const content = step.content || ''
          if (content && content.length > 50) {
            summary.short_answer = (summary.short_answer || 0) + 1
          }
        }
      })
    } else {
      summary.flashcard = (summary.flashcard || 0) + (section.keyPoints?.length || 0)

      if (section.explanation) {
        const wordCount = section.explanation.split(/\s+/).length
        if (wordCount >= MIN_EXPLANATION_WORDS) {
          summary.short_answer = (summary.short_answer || 0) + 1
        }
      }
    }

    if (section.formulas) {
      summary.formula = (summary.formula || 0) + section.formulas.length
    }
  })

  if (course.keyConcepts && Array.isArray(course.keyConcepts)) {
    summary.flashcard = (summary.flashcard || 0) + Math.min(course.keyConcepts.length, 5)
  }

  return summary
}

// =============================================================================
// Export
// =============================================================================

const cardGenerator = {
  generateCardsFromCourse,
  generateQuestionFromContent,
  estimateCardCount,
  getCardTypeSummary,
  buildConceptMapping,
  isQuestionQualityAcceptable,
  regenerateCardQuestion,
}

export default cardGenerator
