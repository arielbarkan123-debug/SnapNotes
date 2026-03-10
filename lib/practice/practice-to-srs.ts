/**
 * Bridge between Practice sessions and SRS card creation.
 * When a student gets a practice question wrong, creates an SRS review card
 * so the concept comes back for spaced repetition review.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('practice:practice-to-srs')

interface PracticeErrorCard {
  userId: string
  courseId: string | null
  lessonIndex: number
  conceptId: string
  questionFront: string
  correctAnswer: string
}

const MAX_NEW_CARDS_PER_SESSION = 5

export async function createSRSCardFromPracticeError(
  supabase: SupabaseClient,
  error: PracticeErrorCard
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('review_cards')
      .select('id, stability, due_date')
      .eq('user_id', error.userId)
      .contains('concept_ids', [error.conceptId])
      .limit(1)
      .maybeSingle()

    if (existing) {
      const newStability = Math.max(0.5, (existing.stability || 1) * 0.5)
      await supabase
        .from('review_cards')
        .update({
          stability: newStability,
          due_date: new Date().toISOString(),
          state: 'review',
        })
        .eq('id', existing.id)
      return
    }

    await supabase
      .from('review_cards')
      .insert({
        user_id: error.userId,
        course_id: error.courseId,
        lesson_index: error.lessonIndex,
        step_index: 0,
        card_type: 'flashcard',
        front: error.questionFront,
        back: error.correctAnswer,
        concept_ids: [error.conceptId],
        state: 'new',
        due_date: new Date().toISOString(),
        stability: 0.5,
        difficulty: 0.7,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
      })
  } catch (err) {
    log.error({ err }, 'Failed to create SRS card')
  }
}

export async function bridgePracticeGapsToSRS(
  supabase: SupabaseClient,
  userId: string,
  courseId: string | null,
  gaps: Array<{ conceptId: string; questionText: string; correctAnswer: string }>
): Promise<number> {
  let created = 0
  const limited = gaps.slice(0, MAX_NEW_CARDS_PER_SESSION)

  for (const gap of limited) {
    await createSRSCardFromPracticeError(supabase, {
      userId,
      courseId,
      lessonIndex: 0,
      conceptId: gap.conceptId,
      questionFront: gap.questionText,
      correctAnswer: gap.correctAnswer,
    })
    created++
  }

  return created
}
