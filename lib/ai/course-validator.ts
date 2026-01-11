/**
 * Post-generation Content Validator
 *
 * Programmatically filters exam metadata and logistics content from AI-generated courses.
 * This catches content that slipped through prompt-based filtering.
 *
 * Problem: AI sometimes generates questions about exam structure, duration, points, etc.
 * Solution: Post-validation that removes forbidden content after generation.
 */

import type { GeneratedCourse, Lesson, Step } from '@/types'

// =============================================================================
// Forbidden Content Patterns
// =============================================================================

/**
 * Patterns for lesson titles that should be completely removed.
 * These indicate the entire lesson is about exam logistics, not subject matter.
 */
const FORBIDDEN_LESSON_TITLE_PATTERNS: RegExp[] = [
  // English patterns
  /exam\s*(structure|format|overview|rules|duration|time|logistics)/i,
  /test\s*(structure|format|overview|rules|duration|logistics)/i,
  /weight\s*distribution/i,
  /point\s*(values?|allocation|distribution|breakdown)/i,
  /grading\s*(criteria|rubric|scheme|breakdown)/i,
  /scoring\s*(criteria|rubric|system)/i,
  /what\s*to\s*bring/i,
  /allowed\s*materials/i,
  /exam\s*preparation\s*tips/i,
  /test\s*taking\s*strategies/i,

  // Hebrew patterns
  /מבנה\s*(הבחינה|המבחן|הבגרות|מבחן)/i,
  /חלוקת\s*(נקודות|ציונים|משקלים)/i,
  /משך\s*(הבחינה|המבחן|הבגרות)/i,
  /הנחיות\s*(לבחינה|למבחן)/i,
  /ציוד\s*מותר/i,
  /משקל\s*(השאלות|החלקים)/i,
]

/**
 * Patterns for question content that should be filtered out.
 * These questions ask about exam logistics instead of testing knowledge.
 */
const FORBIDDEN_QUESTION_PATTERNS: RegExp[] = [
  // Time/duration questions
  /how\s*(long|many\s*(minutes|hours))\s*(is|does|will)/i,
  /how\s*much\s*time/i,
  /what\s*is\s*the\s*(duration|time\s*limit)/i,
  /time\s*allowed/i,

  // Points/scoring questions
  /how\s*many\s*points/i,
  /what\s*is\s*the\s*(point\s*value|score|weight)/i,
  /worth\s*how\s*many\s*points/i,
  /total\s*(points|marks|score)/i,
  /maximum\s*(points|marks|score)/i,

  // Section weight questions
  /which\s*section\s*(carries|has|is\s*worth|weighs)/i,
  /highest\s*weight/i,
  /most\s*points/i,
  /weight\s*(distribution|breakdown)/i,
  /section\s*weighting/i,

  // Materials/logistics questions
  /what\s*(should|do|must)\s*you\s*bring/i,
  /what\s*materials\s*are\s*(allowed|permitted|needed)/i,
  /calculator\s*(allowed|permitted|needed)/i,
  /can\s*you\s*(use|bring)/i,
  /allowed\s*materials/i,
  /what\s*to\s*bring/i,

  // Exam structure questions
  /exam\s*(structure|format|duration|sections)/i,
  /test\s*(structure|format|duration)/i,
  /how\s*many\s*(sections|parts|questions)/i,
  /number\s*of\s*(sections|questions)/i,

  // Grade/score questions
  /(total|overall|final)\s*(grade|score|marks)/i,
  /passing\s*(grade|score|mark)/i,
  /minimum\s*(grade|score|mark)/i,

  // Hebrew question patterns
  /כמה\s*(זמן|נקודות|שעות|דקות)/i,
  /מה\s*משך/i,
  /מה\s*המשקל/i,
  /איזה\s*חלק\s*(שווה|מקבל)/i,
  /מה\s*מותר\s*להביא/i,
  /האם\s*מותר/i,
  /כמה\s*שאלות/i,
  /מבנה\s*(הבחינה|המבחן)/i,
]

/**
 * Patterns for step content (explanations) that indicate exam logistics.
 * Used for filtering explanation steps, not just questions.
 */
const FORBIDDEN_CONTENT_PATTERNS: RegExp[] = [
  // Exam duration content
  /the\s*exam\s*(is|lasts|takes)\s*\d+\s*(minutes|hours)/i,
  /you\s*(have|get|will\s*have)\s*\d+\s*(minutes|hours)/i,
  /time\s*limit\s*(is|of)\s*\d+/i,

  // Point value content
  /worth\s*\d+\s*points/i,
  /\d+\s*points?\s*(each|per|total)/i,
  /carries\s*\d+%/i,
  /accounts?\s*for\s*\d+%/i,

  // Materials content
  /bring\s*(a\s*)?(calculator|pen|pencil|id|identification)/i,
  /allowed\s*to\s*(use|bring)/i,
  /permitted\s*materials/i,

  // Hebrew content patterns
  /הבחינה\s*נמשכת\s*\d+/i,
  /זמן\s*הבחינה\s*\d+/i,
  /שווה\s*\d+\s*נקודות/i,
  /מהווה\s*\d+%/i,
]

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if a lesson title indicates forbidden exam logistics content.
 */
function isLessonTitleForbidden(title: string): boolean {
  return FORBIDDEN_LESSON_TITLE_PATTERNS.some((pattern) => pattern.test(title))
}

/**
 * Check if a question step contains forbidden exam logistics questions.
 */
function isQuestionForbidden(step: Step): boolean {
  if (step.type !== 'question') return false

  const questionText = step.content || ''
  const titleText = step.title || ''
  const combinedText = `${titleText} ${questionText}`

  return FORBIDDEN_QUESTION_PATTERNS.some((pattern) => pattern.test(combinedText))
}

/**
 * Check if a step's content is primarily about exam logistics.
 * Used for explanation steps that describe exam structure.
 */
function isContentForbidden(step: Step): boolean {
  // Only check explanation and summary steps
  if (step.type !== 'explanation' && step.type !== 'summary') return false

  const content = step.content || ''
  const title = step.title || ''
  const combinedText = `${title} ${content}`

  // Count how many forbidden patterns match
  const matchCount = FORBIDDEN_CONTENT_PATTERNS.filter((pattern) =>
    pattern.test(combinedText)
  ).length

  // If multiple patterns match, it's primarily logistics content
  return matchCount >= 2
}

/**
 * Check if a step should be filtered out.
 */
function isStepForbidden(step: Step): boolean {
  return isQuestionForbidden(step) || isContentForbidden(step)
}

/**
 * Check if a lesson is entirely about exam logistics.
 * A lesson is forbidden if:
 * 1. Its title matches forbidden patterns, OR
 * 2. Most of its steps are about exam logistics
 */
function isLessonForbidden(lesson: Lesson): boolean {
  // Check title first
  if (isLessonTitleForbidden(lesson.title)) {
    console.log(`[CourseValidator] Filtering lesson by title: "${lesson.title}"`)
    return true
  }

  // Check if most steps are forbidden (more than 70%)
  if (lesson.steps.length > 0) {
    const forbiddenStepCount = lesson.steps.filter(isStepForbidden).length
    const forbiddenRatio = forbiddenStepCount / lesson.steps.length

    if (forbiddenRatio > 0.7) {
      console.log(
        `[CourseValidator] Filtering lesson by content ratio: "${lesson.title}" (${forbiddenStepCount}/${lesson.steps.length} steps forbidden)`
      )
      return true
    }
  }

  return false
}

// =============================================================================
// Main Filter Function
// =============================================================================

/**
 * Filter forbidden exam logistics content from a generated course.
 *
 * This function:
 * 1. Removes entire lessons with forbidden titles or mostly forbidden content
 * 2. Removes individual question steps that ask about exam logistics
 * 3. Removes explanation steps that are primarily about exam structure
 * 4. Ensures the course still has content after filtering
 *
 * @param course - The generated course to filter
 * @returns The filtered course with forbidden content removed
 */
export function filterForbiddenContent(course: GeneratedCourse): GeneratedCourse {
  const originalLessonCount = course.lessons.length
  let filteredStepCount = 0
  let filteredLessonCount = 0

  const filteredLessons = course.lessons
    // Step 1: Filter out entirely forbidden lessons
    .filter((lesson) => {
      const isForbidden = isLessonForbidden(lesson)
      if (isForbidden) filteredLessonCount++
      return !isForbidden
    })
    // Step 2: Filter forbidden steps within remaining lessons
    .map((lesson) => {
      const filteredSteps = lesson.steps.filter((step) => {
        const isForbidden = isStepForbidden(step)
        if (isForbidden) {
          console.log(
            `[CourseValidator] Filtering step: "${step.content?.substring(0, 50)}..." (${step.type})`
          )
          filteredStepCount++
        }
        return !isForbidden
      })

      return {
        ...lesson,
        steps: filteredSteps,
      }
    })
    // Step 3: Remove lessons that became empty after step filtering
    .filter((lesson) => {
      if (lesson.steps.length === 0) {
        console.log(
          `[CourseValidator] Removing empty lesson after step filtering: "${lesson.title}"`
        )
        filteredLessonCount++
        return false
      }
      return true
    })

  // Log summary
  if (filteredLessonCount > 0 || filteredStepCount > 0) {
    console.log(
      `[CourseValidator] Filtered ${filteredLessonCount} lessons and ${filteredStepCount} steps from course "${course.title}"`
    )
    console.log(
      `[CourseValidator] Remaining: ${filteredLessons.length}/${originalLessonCount} lessons`
    )
  }

  // Ensure we still have content
  if (filteredLessons.length === 0) {
    console.warn(
      `[CourseValidator] WARNING: All lessons were filtered! Keeping original course.`
    )
    return course
  }

  return {
    ...course,
    lessons: filteredLessons,
  }
}

// =============================================================================
// Exports
// =============================================================================

const courseValidator = {
  filterForbiddenContent,
  isLessonForbidden,
  isStepForbidden,
  isQuestionForbidden,
}

export default courseValidator
