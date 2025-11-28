/**
 * Card Generator
 *
 * Generates review cards (flashcards) from course content.
 * Extracts key points, formulas, questions, and important explanations
 * and formats them for spaced repetition review.
 *
 * Supports both new `steps` format and legacy format for backwards compatibility.
 */

import type {
  GeneratedCourse,
  CourseSection,
  Formula,
  ReviewCardInsert,
  CardType,
  LessonStep,
  QuestionStep,
  KeyPointStep,
  ExplanationStep,
  MultipleChoiceData,
  TrueFalseData,
  FillBlankData,
  MatchingData,
  SequenceData,
} from '@/types'

import {
  createMultipleChoiceBack,
  createTrueFalseBack,
  createFillBlankBack,
  createMatchingBack,
  createSequenceBack,
} from '@/types/srs'

// =============================================================================
// Constants
// =============================================================================

/** Minimum word count for explanation cards */
const MIN_EXPLANATION_WORDS = 20

/** Maximum words for card front (questions) */
const MAX_FRONT_WORDS = 30

/** Maximum words for card back (answers) */
const MAX_BACK_WORDS = 200

// =============================================================================
// Main Generator Function
// =============================================================================

/**
 * Generate review cards from a course's content
 *
 * Extracts reviewable content from sections and creates flashcards:
 * - Questions → Direct from embedded questions in course
 * - Key points → Q: "What is [topic]?" A: The key point
 * - Formulas → Q: "What is the formula for [topic]?" A: Formula + explanation
 * - Explanations → Q: Generated question A: Explanation content
 *
 * Supports both new `steps` format and legacy format.
 *
 * @param course - The generated course content
 * @param courseId - The course's database ID
 * @returns Array of ReviewCardInsert objects ready for database insertion
 */
export function generateCardsFromCourse(
  course: GeneratedCourse & { sections?: any[]; lessons?: any[]; keyConcepts?: string[] },
  courseId: string
): ReviewCardInsert[] {
  const cards: ReviewCardInsert[] = []

  // Handle both "sections" (AI response) and "lessons" (normalized)
  const lessonsData = course.lessons || course.sections || []

  if (!lessonsData || lessonsData.length === 0) {
    console.log('No lessons/sections found in course')
    return cards
  }

  // Process each section (lesson)
  lessonsData.forEach((section: any, lessonIndex: number) => {
    if (!section) return

    let stepIndex = 0
    const sectionTitle = section.title || `Section ${lessonIndex + 1}`

    // Check if section uses steps format
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      // Extract from steps
      const stepsCards = generateCardsFromSteps(
        section.steps,
        sectionTitle,
        courseId,
        lessonIndex
      )
      cards.push(...stepsCards)
      stepIndex += stepsCards.length
    }

    // Also check for legacy format fields
    // Generate cards from key points (legacy)
    if (section.keyPoints && Array.isArray(section.keyPoints) && section.keyPoints.length > 0) {
      const keyPointCards = generateKeyPointCardsLegacy(
        section.keyPoints,
        sectionTitle,
        courseId,
        lessonIndex,
        stepIndex
      )
      cards.push(...keyPointCards)
      stepIndex += keyPointCards.length
    }

    // Generate card from main explanation (legacy, if substantial)
    if (section.explanation && typeof section.explanation === 'string') {
      const explanationCard = generateExplanationCardLegacy(
        section.explanation,
        sectionTitle,
        courseId,
        lessonIndex,
        stepIndex
      )
      if (explanationCard) {
        cards.push(explanationCard)
        stepIndex += 1
      }
    }

    // Generate cards from formulas (same in both formats)
    if (section.formulas && Array.isArray(section.formulas) && section.formulas.length > 0) {
      const formulaCards = generateFormulaCards(
        section.formulas,
        sectionTitle,
        courseId,
        lessonIndex,
        stepIndex
      )
      cards.push(...formulaCards)
      stepIndex += formulaCards.length
    }
  })

  // Generate cards from key concepts (course-level)
  const keyConcepts = course.keyConcepts || (course as any).keyConcepts || []
  if (keyConcepts.length > 0) {
    const conceptCards = generateConceptCards(
      keyConcepts,
      course.title || 'Course',
      courseId,
      0,
      cards.length
    )
    cards.push(...conceptCards)
  }

  return cards
}

// =============================================================================
// New Format: Steps-based Card Generation
// =============================================================================

/**
 * Generate cards from the steps array (new format)
 * Directly uses embedded questions and extracts key points
 * Creates interactive card types (multiple_choice, true_false, fill_blank) when applicable
 */
function generateCardsFromSteps(
  steps: LessonStep[],
  sectionTitle: string,
  courseId: string,
  lessonIndex: number
): ReviewCardInsert[] {
  const cards: ReviewCardInsert[] = []

  steps.forEach((step: any, index: number) => {
    const stepType = step.type || 'explanation'

    if (stepType === 'question') {
      // Embedded questions become interactive cards
      // Handle both normalized format (content) and AI format (question)
      const questionText = step.content || step.question || ''
      const correctIndex = step.correct_answer ?? step.correctIndex ?? 0
      const options = step.options || []

      if (questionText && options.length > 0) {
        // Determine card type based on options
        const cardType = determineQuestionCardType(options)

        if (cardType === 'true_false') {
          // True/False question
          const isTrue = options[correctIndex]?.toLowerCase().includes('true')
          const trueFalseData: TrueFalseData = {
            correct: isTrue,
            explanation: step.explanation,
          }
          cards.push({
            course_id: courseId,
            lesson_index: lessonIndex,
            step_index: index,
            card_type: 'true_false' as CardType,
            front: questionText,
            back: createTrueFalseBack(trueFalseData),
          })
        } else {
          // Multiple choice question (default)
          const mcData: MultipleChoiceData = {
            options: options,
            correctIndex: correctIndex,
            explanation: step.explanation,
          }
          cards.push({
            course_id: courseId,
            lesson_index: lessonIndex,
            step_index: index,
            card_type: 'multiple_choice' as CardType,
            front: questionText,
            back: createMultipleChoiceBack(mcData),
          })
        }
      }
    } else if (stepType === 'key_point') {
      // Key points become flashcards
      const content = step.content || ''
      if (content && content.length > 10) {
        cards.push({
          course_id: courseId,
          lesson_index: lessonIndex,
          step_index: index,
          card_type: 'flashcard' as CardType,
          front: generateQuestionFromKeyPoint(content, sectionTitle),
          back: content,
        })
      }
    } else if (stepType === 'explanation' || stepType === 'summary') {
      // Substantial explanations become short answer cards
      const content = step.content || ''
      if (content && content.length > 50) {
        cards.push({
          course_id: courseId,
          lesson_index: lessonIndex,
          step_index: index,
          card_type: 'short_answer' as CardType,
          front: generateQuestionFromContent(content, sectionTitle),
          back: truncateText(content, MAX_BACK_WORDS),
        })
      }
    }
  })

  return cards
}

/**
 * Determine the appropriate card type based on question options
 */
function determineQuestionCardType(options: string[]): CardType {
  // Check for true/false pattern
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

  // Default to multiple choice
  return 'multiple_choice'
}

/**
 * Format a question answer from step data
 */
function formatQuestionAnswerFromStep(options: string[], correctIndex: number, explanation?: string): string {
  const correctAnswer = options[correctIndex] || options[0] || ''
  return `**Answer:** ${correctAnswer}${explanation ? `\n\n**Explanation:** ${explanation}` : ''}`
}

/**
 * Format a question step into a card answer
 * Includes correct answer and explanation
 */
function formatQuestionAnswer(question: QuestionStep): string {
  const correctAnswer = question.options[question.correctIndex]
  return `**Answer:** ${correctAnswer}\n\n**Explanation:** ${question.explanation}`
}

// =============================================================================
// Legacy Format: Card Type Generators
// =============================================================================

/**
 * Generate cards from key points (legacy format)
 * Now creates 'flashcard' type instead of legacy 'key_point'
 */
function generateKeyPointCardsLegacy(
  keyPoints: string[],
  sectionTitle: string,
  courseId: string,
  lessonIndex: number,
  startStepIndex: number
): ReviewCardInsert[] {
  return keyPoints.map((keyPoint, index) => ({
    course_id: courseId,
    lesson_index: lessonIndex,
    step_index: startStepIndex + index,
    card_type: 'flashcard' as CardType,
    front: generateQuestionFromKeyPoint(keyPoint, sectionTitle),
    back: keyPoint,
  }))
}

/**
 * Generate cards from formulas
 */
function generateFormulaCards(
  formulas: Formula[],
  sectionTitle: string,
  courseId: string,
  lessonIndex: number,
  startStepIndex: number
): ReviewCardInsert[] {
  return formulas.map((formula, index) => ({
    course_id: courseId,
    lesson_index: lessonIndex,
    step_index: startStepIndex + index,
    card_type: 'formula' as CardType,
    front: generateFormulaQuestion(formula, sectionTitle),
    back: formatFormulaAnswer(formula),
  }))
}

/**
 * Generate a card from explanation (legacy format)
 * Only creates card if explanation is substantial
 * Now creates 'short_answer' type instead of legacy 'explanation'
 */
function generateExplanationCardLegacy(
  explanation: string,
  sectionTitle: string,
  courseId: string,
  lessonIndex: number,
  stepIndex: number
): ReviewCardInsert | null {
  const wordCount = explanation.split(/\s+/).length

  // Skip if explanation is too short
  if (wordCount < MIN_EXPLANATION_WORDS) {
    return null
  }

  return {
    course_id: courseId,
    lesson_index: lessonIndex,
    step_index: stepIndex,
    card_type: 'short_answer' as CardType,
    front: generateQuestionFromContent(explanation, sectionTitle),
    back: truncateText(explanation, MAX_BACK_WORDS),
  }
}

/**
 * Generate cards from course-level key concepts
 * Now creates 'flashcard' type instead of legacy 'key_point'
 */
function generateConceptCards(
  keyConcepts: string[],
  courseTitle: string,
  courseId: string,
  lessonIndex: number,
  startStepIndex: number
): ReviewCardInsert[] {
  // Only create cards for first few key concepts to avoid overwhelming
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
// Question Generation Helpers
// =============================================================================

/**
 * Generate a question from a key point statement
 *
 * Examples:
 * - "Photosynthesis converts sunlight to energy" →
 *   "What does photosynthesis do?"
 * - "The mitochondria is the powerhouse of the cell" →
 *   "What is the mitochondria?"
 */
function generateQuestionFromKeyPoint(keyPoint: string, topic: string): string {
  const lowerKeyPoint = keyPoint.toLowerCase()

  // Pattern: "[Subject] is [definition]"
  const isPattern = /^(.+?)\s+(?:is|are)\s+/i
  const isMatch = keyPoint.match(isPattern)
  if (isMatch) {
    const subject = isMatch[1]
    return `What is ${subject.toLowerCase()}?`
  }

  // Pattern: "[Subject] [verb]s [action]"
  const verbPattern = /^(.+?)\s+(\w+s)\s+/i
  const verbMatch = keyPoint.match(verbPattern)
  if (verbMatch) {
    const subject = verbMatch[1]
    return `What does ${subject.toLowerCase()} do?`
  }

  // Pattern: Contains "because" or "due to"
  if (lowerKeyPoint.includes('because') || lowerKeyPoint.includes('due to')) {
    return `Why is this true: ${truncateText(keyPoint, 15)}...?`
  }

  // Default: Ask about the key point related to the topic
  return `What is a key point about ${topic}?`
}

/**
 * Generate a question for a formula
 */
function generateFormulaQuestion(formula: Formula, topic: string): string {
  // Try to extract what the formula calculates
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

  // Default question
  return `What is the formula for ${topic}?`
}

/**
 * Generate a question from explanation content
 *
 * Attempts to identify the main topic and create a relevant question.
 */
export function generateQuestionFromContent(
  content: string,
  topic: string
): string {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const firstSentence = sentences[0]?.trim() || ''

  // Try to extract the subject from the first sentence
  const subjectMatch = firstSentence.match(/^(?:The\s+)?(.+?)\s+(?:is|are|was|were|has|have)/i)

  if (subjectMatch) {
    const subject = subjectMatch[1].toLowerCase()
    // Avoid questions that are too long
    if (subject.split(/\s+/).length <= 5) {
      return `What can you tell me about ${subject}?`
    }
  }

  // Pattern: Starts with "In [context]"
  if (firstSentence.toLowerCase().startsWith('in ')) {
    return `Explain the concept of ${topic}.`
  }

  // Default: Ask to explain the topic
  return `Explain: ${topic}`
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format a formula for the answer side of a card
 */
function formatFormulaAnswer(formula: Formula): string {
  return `**Formula:** ${formula.formula}\n\n**Explanation:** ${formula.explanation}`
}

/**
 * Truncate text to a maximum number of words
 */
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
 * Useful for showing user how many cards they'll get
 * Supports both new steps format and legacy format
 */
export function estimateCardCount(course: GeneratedCourse & { sections?: any[]; lessons?: any[] }): number {
  let count = 0

  // Handle both "sections" and "lessons"
  const lessonsData = course.lessons || course.sections || []

  lessonsData.forEach((section) => {
    // Check for new steps format
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      // Count questions and key_points from steps
      section.steps.forEach((step) => {
        if (step.type === 'question' || step.type === 'key_point') {
          count += 1
        }
      })
    } else {
      // Legacy format
      // Key points
      count += section.keyPoints?.length || 0

      // Explanation (if substantial)
      if (section.explanation) {
        const wordCount = section.explanation.split(/\s+/).length
        if (wordCount >= MIN_EXPLANATION_WORDS) {
          count += 1
        }
      }
    }

    // Formulas (same in both formats)
    count += section.formulas?.length || 0
  })

  // Key concepts (max 5 from first section)
  count += Math.min(course.keyConcepts.length, 5)

  return count
}

/**
 * Get a summary of card types that would be generated
 * Supports both new steps format and legacy format
 * Uses new card types: flashcard, multiple_choice, true_false, short_answer, formula
 */
export function getCardTypeSummary(
  course: GeneratedCourse & { sections?: any[]; lessons?: any[] }
): Partial<Record<CardType, number>> {
  const summary: Partial<Record<CardType, number>> = {
    flashcard: 0,
    multiple_choice: 0,
    true_false: 0,
    short_answer: 0,
    formula: 0,
  }

  // Handle both "sections" and "lessons"
  const lessonsData = course.lessons || course.sections || []

  lessonsData.forEach((section) => {
    // Check for new steps format
    if (section.steps && Array.isArray(section.steps) && section.steps.length > 0) {
      section.steps.forEach((step: any) => {
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
      // Legacy format
      summary.flashcard = (summary.flashcard || 0) + (section.keyPoints?.length || 0)

      if (section.explanation) {
        const wordCount = section.explanation.split(/\s+/).length
        if (wordCount >= MIN_EXPLANATION_WORDS) {
          summary.short_answer = (summary.short_answer || 0) + 1
        }
      }
    }

    // Formulas (same in both formats)
    if (section.formulas) {
      summary.formula = (summary.formula || 0) + section.formulas.length
    }
  })

  // Key concepts count as flashcard
  summary.flashcard = (summary.flashcard || 0) + Math.min(course.keyConcepts?.length || 0, 5)

  return summary
}

// =============================================================================
// Export
// =============================================================================

export default {
  generateCardsFromCourse,
  generateQuestionFromContent,
  estimateCardCount,
  getCardTypeSummary,
}
