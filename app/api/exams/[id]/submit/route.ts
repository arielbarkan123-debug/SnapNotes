import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type SubmitExamRequest, type MatchingPair, type SubQuestion } from '@/types'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

// Normalize text for comparison (lowercase, trim, remove punctuation)
function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

// Check if answer matches correct answer or any acceptable answers
function checkTextAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] | null
): boolean {
  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedCorrect = normalizeAnswer(correctAnswer)

  if (normalizedUser === normalizedCorrect) return true

  if (acceptableAnswers && Array.isArray(acceptableAnswers)) {
    return acceptableAnswers.some(alt => normalizeAnswer(alt) === normalizedUser)
  }

  return false
}

// Grade matching question - returns points earned
function gradeMatching(
  userMatches: MatchingPair[] | undefined,
  correctPairs: MatchingPair[],
  totalPoints: number
): number {
  if (!userMatches || !Array.isArray(userMatches) || userMatches.length === 0) {
    return 0
  }

  let correctCount = 0
  for (const userPair of userMatches) {
    const matchingCorrect = correctPairs.find(
      cp => normalizeAnswer(cp.left) === normalizeAnswer(userPair.left)
    )
    if (matchingCorrect && normalizeAnswer(matchingCorrect.right) === normalizeAnswer(userPair.right)) {
      correctCount++
    }
  }

  const percentage = correctCount / correctPairs.length
  // Award full points if 75%+ correct, otherwise partial credit
  if (percentage >= 0.75) {
    return totalPoints
  }
  return Math.floor(totalPoints * percentage)
}

// Grade ordering question - must be 100% correct
function gradeOrdering(
  userOrder: string[] | undefined,
  correctOrder: string[]
): boolean {
  if (!userOrder || !Array.isArray(userOrder) || userOrder.length !== correctOrder.length) {
    return false
  }

  return correctOrder.every((item, index) =>
    normalizeAnswer(item) === normalizeAnswer(userOrder[index])
  )
}

// Grade passage-based question - returns { points, gradedSubQuestions }
function gradePassageBased(
  subAnswers: { subQuestionId: string; answer: string }[] | undefined,
  subQuestions: SubQuestion[]
): { points: number; gradedSubQuestions: SubQuestion[] } {
  let points = 0
  const gradedSubQuestions = subQuestions.map(sq => {
    const userSubAnswer = subAnswers?.find(sa => sa.subQuestionId === sq.id)
    const userAnswer = userSubAnswer?.answer || null

    let isCorrect = false
    if (userAnswer) {
      isCorrect = checkTextAnswer(userAnswer, sq.correct_answer, sq.acceptable_answers)
    }

    if (isCorrect) {
      points += sq.points
    }

    return {
      ...sq,
      user_answer: userAnswer,
      is_correct: userAnswer !== null ? isCorrect : null,
    }
  })

  return { points, gradedSubQuestions }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: SubmitExamRequest = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Answers required')
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single()

    if (examError || !exam) {
      return createErrorResponse(ErrorCodes.EXAM_NOT_FOUND)
    }

    if (exam.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN)
    }

    if (exam.status === 'completed') {
      return createErrorResponse(ErrorCodes.SUBMIT_ALREADY_SUBMITTED, 'Exam already submitted')
    }

    if (exam.status === 'pending') {
      return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Exam not started')
    }

    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', id)

    if (questionsError || !questions) {
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to load questions')
    }

    let score = 0
    // Calculate total points from all questions
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

    // Collect question updates for batch execution
    const questionUpdates: Array<{ questionId: string; updateData: Record<string, unknown> }> = []

    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id)
      let userAnswerToStore: string | null = null
      let isCorrect: boolean | null = null
      let pointsEarned = 0
      let updatedSubQuestions: SubQuestion[] | null = null

      switch (question.question_type) {
        case 'multiple_choice':
        case 'true_false': {
          const userAnswer = answer?.answer || null
          userAnswerToStore = userAnswer
          if (userAnswer) {
            isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.correct_answer)
            if (isCorrect) pointsEarned = question.points
          }
          break
        }

        case 'fill_blank':
        case 'short_answer': {
          const userAnswer = answer?.answer || null
          userAnswerToStore = userAnswer
          if (userAnswer) {
            isCorrect = checkTextAnswer(userAnswer, question.correct_answer, question.acceptable_answers)
            if (isCorrect) pointsEarned = question.points
          }
          break
        }

        case 'matching': {
          const userMatches = answer?.matchingAnswers
          userAnswerToStore = userMatches ? JSON.stringify(userMatches) : null
          if (userMatches && question.matching_pairs) {
            pointsEarned = gradeMatching(userMatches, question.matching_pairs, question.points)
            // Consider correct if earned any points (partial credit counts)
            isCorrect = pointsEarned > 0
          } else {
            isCorrect = false
          }
          break
        }

        case 'ordering': {
          const userOrder = answer?.orderingAnswer
          userAnswerToStore = userOrder ? JSON.stringify(userOrder) : null
          if (userOrder && question.ordering_items) {
            isCorrect = gradeOrdering(userOrder, question.ordering_items)
            if (isCorrect) pointsEarned = question.points
          } else {
            isCorrect = false
          }
          break
        }

        case 'passage_based': {
          const subAnswers = answer?.subAnswers
          userAnswerToStore = subAnswers ? JSON.stringify(subAnswers) : null
          if (question.sub_questions && Array.isArray(question.sub_questions)) {
            const result = gradePassageBased(subAnswers, question.sub_questions)
            pointsEarned = result.points
            updatedSubQuestions = result.gradedSubQuestions
            // Consider correct if earned any points
            isCorrect = pointsEarned > 0
          } else {
            isCorrect = false
          }
          break
        }

        default: {
          // Fallback for unknown types - simple string comparison
          const userAnswer = answer?.answer || null
          userAnswerToStore = userAnswer
          if (userAnswer) {
            isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.correct_answer)
            if (isCorrect) pointsEarned = question.points
          }
        }
      }

      score += pointsEarned

      // Build update object
      const updateData: Record<string, unknown> = {
        user_answer: userAnswerToStore,
        is_correct: userAnswerToStore !== null ? isCorrect : null,
      }

      // Update sub_questions with graded results for passage_based
      if (updatedSubQuestions) {
        updateData.sub_questions = updatedSubQuestions
      }

      // Collect update promises instead of awaiting in loop
      questionUpdates.push({
        questionId: question.id,
        updateData,
      })
    }

    // Execute all question updates with Promise.allSettled for transaction safety
    const updatePromises = questionUpdates.map(({ questionId, updateData }) =>
      supabase
        .from('exam_questions')
        .update(updateData)
        .eq('id', questionId)
    )

    const updateResults = await Promise.allSettled(updatePromises)

    // Check if any updates failed
    const failedUpdates = updateResults.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )

    if (failedUpdates.length > 0) {
      console.error('[Submit API] Some question updates failed:', failedUpdates.length)
      // Continue anyway - partial save is better than total loss
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100 * 100) / 100 : 0
    const grade = calculateGrade(percentage)

    const { error: examUpdateError } = await supabase
      .from('exams')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score,
        total_points: totalPoints,
        percentage,
        grade,
      })
      .eq('id', id)

    if (examUpdateError) {
      console.error('[Submit API] Exam update error:', examUpdateError)
      return createErrorResponse(ErrorCodes.SUBMIT_FAILED, 'Failed to save results')
    }

    return NextResponse.json({
      success: true,
      result: {
        score,
        totalPoints,
        percentage,
        grade,
      },
    })

  } catch (error) {
    console.error('[Submit API] Error:', error)
    return createErrorResponse(ErrorCodes.SUBMIT_FAILED)
  }
}
