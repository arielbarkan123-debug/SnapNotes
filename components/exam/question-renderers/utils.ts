/**
 * Shared utility functions for question renderers
 */

/**
 * Normalize text for answer comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes punctuation
 * - Normalizes multiple spaces
 */
export function normalizeAnswer(text: string | null | undefined): string {
  if (text == null) return ''
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Check if a user's text answer matches the correct answer
 * Also checks against acceptable alternative answers
 */
export function checkTextAnswer(
  userAnswer: string | null | undefined,
  correctAnswer: string | null | undefined,
  acceptableAnswers: string[] | null | undefined
): boolean {
  if (!userAnswer || !correctAnswer) return false

  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedCorrect = normalizeAnswer(correctAnswer)

  if (!normalizedUser) return false
  if (normalizedUser === normalizedCorrect) return true

  if (acceptableAnswers && Array.isArray(acceptableAnswers)) {
    return acceptableAnswers.some((alt) => alt && normalizeAnswer(alt) === normalizedUser)
  }

  return false
}
