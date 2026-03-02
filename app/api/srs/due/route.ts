import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { isQuestionQualityAcceptable, regenerateCardQuestion } from '@/lib/srs'
import { getUserFSRSParams } from '@/lib/srs/fsrs-optimizer'
import type { ReviewCard, ReviewSession } from '@/types'
import { getStudentContext } from '@/lib/student-context'

// =============================================================================
// GET /api/srs/due - Get cards due for review today
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view due cards')
    }

    // Load per-user optimized FSRS parameters (falls back to defaults)
    // These are included in the response for the client-side interval preview
    const userParams = await getUserFSRSParams(supabase, user.id)

    // Get user's SRS settings for daily limits and interleaving preference
    const { data: settings } = await supabase
      .from('user_srs_settings')
      .select('max_new_cards_per_day, max_reviews_per_day, interleave_reviews')
      .eq('user_id', user.id)
      .single()

    const maxNewCards = settings?.max_new_cards_per_day ?? 20
    const maxReviews = settings?.max_reviews_per_day ?? 100
    const shouldInterleave = settings?.interleave_reviews ?? true // Default: on

    // Load student intelligence for adaptive SRS card ordering
    // Note: We NEVER override user's explicit settings (maxNewCards, interleave).
    // Intelligence only influences card ordering (weak concepts first).
    let weakConceptIds: string[] = []
    try {
      const studentCtx = await getStudentContext(supabase, user.id)
      if (studentCtx) {
        weakConceptIds = studentCtx.weakConceptIds
      }
    } catch (err) {
      // Non-critical: continue with defaults
      console.warn('[SRS:due] Failed to load student context:', err)
    }

    const now = new Date().toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Get count of cards reviewed today
    const { count: reviewedToday } = await supabase
      .from('review_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('reviewed_at', todayStart.toISOString())

    const remainingReviews = Math.max(0, maxReviews - (reviewedToday || 0))

    // Get new cards (state = 'new'), limited by daily max
    const { data: newCards, error: newError } = await supabase
      .from('review_cards')
      .select('id, user_id, course_id, lesson_index, step_index, card_type, front, back, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due_date, last_review, concept_ids, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('state', 'new')
      .order('created_at', { ascending: true })
      .limit(Math.min(maxNewCards, remainingReviews))

    if (newError) {
      logError('SRS:due:newCards', newError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch new cards')
    }

    const newCardCount = newCards?.length || 0
    const remainingAfterNew = remainingReviews - newCardCount

    // Get due review cards (due_date <= now, state != 'new')
    const { data: dueCards, error: dueError } = await supabase
      .from('review_cards')
      .select('id, user_id, course_id, lesson_index, step_index, card_type, front, back, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due_date, last_review, concept_ids, created_at, updated_at')
      .eq('user_id', user.id)
      .neq('state', 'new')
      .lte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(remainingAfterNew)

    if (dueError) {
      logError('SRS:due:dueCards', dueError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch due cards')
    }

    // Combine cards
    let allCards: ReviewCard[] = [
      ...(newCards || []),
      ...(dueCards || []),
    ]

    // Prioritize weak-concept cards before interleaving
    if (weakConceptIds.length > 0) {
      const weakSet = new Set(weakConceptIds)
      allCards.sort((a, b) => {
        const aWeak = a.concept_ids?.some((id: string) => weakSet.has(id)) ? 1 : 0
        const bWeak = b.concept_ids?.some((id: string) => weakSet.has(id)) ? 1 : 0
        return bWeak - aWeak // Weak concepts first
      })
    }

    // Apply interleaving if enabled
    if (shouldInterleave && allCards.length > 1) {
      allCards = interleaveCards(allCards)
    }

    // Lazy regeneration: fire-and-forget — don't block the response
    // Cards with bad questions get a generic fallback in the response,
    // and the AI regeneration updates them in DB for next time.
    const cardsNeedingRegeneration = allCards
      .filter(card => !isQuestionQualityAcceptable(card.front))
      .slice(0, 10)

    if (cardsNeedingRegeneration.length > 0) {
      // Provide immediate fallback text for bad cards in the current response
      for (const card of cardsNeedingRegeneration) {
        card.front = `Review: ${card.back.slice(0, 80)}...`
      }

      // Fire-and-forget: regenerate in background without blocking response
      // The regenerated questions will be available on the next review fetch
      const userId = user.id
      const courseIds = [...new Set(cardsNeedingRegeneration.map(c => c.course_id))]
      void (async () => {
        try {
          const { data: courses } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', courseIds)

          const courseTitleMap = new Map(courses?.map(c => [c.id, c.title]) || [])

          const regenerationPromises = cardsNeedingRegeneration.map(async (card) => {
            try {
              const courseTitle = courseTitleMap.get(card.course_id) || 'Course'
              const newQuestion = await regenerateCardQuestion(card.front, card.back, courseTitle)

              if (newQuestion) {
                await supabase
                  .from('review_cards')
                  .update({ front: newQuestion, updated_at: new Date().toISOString() })
                  .eq('id', card.id)
                  .eq('user_id', userId)
              }
            } catch (err) {
              console.error('[SRS:due] Background regeneration failed for card', card.id, err)
            }
          })

          await Promise.allSettled(regenerationPromises)
        } catch (err) {
          console.error('[SRS:due] Background regeneration setup failed:', err)
        }
      })()
    }

    const response: ReviewSession & { fsrs_params?: typeof userParams } = {
      cards_due: allCards.length,
      new_cards: newCardCount,
      review_cards: dueCards?.length || 0,
      cards: allCards,
      fsrs_params: userParams,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('SRS:due:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch due cards')
  }
}

// =============================================================================
// Interleaving Logic
// =============================================================================

interface CardGroup {
  key: string // course_id or course_id:lesson_index
  cards: ReviewCard[]
  index: number // Current position in the group
}

/**
 * Interleave cards by course/lesson to improve learning retention
 *
 * Algorithm:
 * 1. Group cards by course_id (primary) and lesson_index (secondary)
 * 2. Round-robin through groups, taking 1-2 cards at a time
 * 3. Ensure no more than 3 cards from same lesson appear consecutively
 * 4. Preserve priority (overdue cards first within groups)
 */
function interleaveCards(cards: ReviewCard[]): ReviewCard[] {
  if (cards.length <= 3) {
    return cards
  }

  // Group cards by course, then by lesson within course
  const courseGroups = new Map<string, CardGroup>()

  for (const card of cards) {
    const key = card.course_id
    if (!courseGroups.has(key)) {
      courseGroups.set(key, {
        key,
        cards: [],
        index: 0,
      })
    }
    courseGroups.get(key)!.cards.push(card)
  }

  // Sort cards within each group by priority (overdue first, then by due_date)
  const now = new Date()
  for (const group of courseGroups.values()) {
    group.cards.sort((a, b) => {
      const aDate = new Date(a.due_date)
      const bDate = new Date(b.due_date)
      const aOverdue = aDate < now
      const bOverdue = bDate < now

      // Overdue cards first
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      // Then by due date (ascending)
      return aDate.getTime() - bDate.getTime()
    })
  }

  // Convert to array and sort groups by earliest due card
  const groups = Array.from(courseGroups.values()).sort((a, b) => {
    if (a.cards.length === 0) return 1
    if (b.cards.length === 0) return -1
    const aFirst = new Date(a.cards[0].due_date).getTime()
    const bFirst = new Date(b.cards[0].due_date).getTime()
    return aFirst - bFirst
  })

  // Interleave: round-robin through groups
  const result: ReviewCard[] = []
  const maxConsecutiveSameLesson = 3
  let lastLessonKey = ''
  let consecutiveSameLesson = 0

  // Calculate cards to take per group per round
  const cardsPerRound = groups.length > 2 ? 1 : 2

  while (result.length < cards.length) {
    let addedThisRound = false

    for (const group of groups) {
      if (group.index >= group.cards.length) continue

      // Take 1-2 cards from this group
      for (let i = 0; i < cardsPerRound && group.index < group.cards.length; i++) {
        const card = group.cards[group.index]
        const lessonKey = `${card.course_id}:${card.lesson_index}`

        // Check consecutive lesson constraint
        if (lessonKey === lastLessonKey) {
          consecutiveSameLesson++
          if (consecutiveSameLesson >= maxConsecutiveSameLesson) {
            // Skip this card for now, try next group
            break
          }
        } else {
          consecutiveSameLesson = 1
          lastLessonKey = lessonKey
        }

        result.push(card)
        group.index++
        addedThisRound = true
      }
    }

    // If no cards were added but we haven't finished, force add remaining cards
    if (!addedThisRound) {
      for (const group of groups) {
        while (group.index < group.cards.length) {
          result.push(group.cards[group.index])
          group.index++
        }
      }
      break
    }
  }

  return result
}

/**
 * Advanced interleaving with lesson-level grouping
 * For use when cards have varied lesson indices within courses
 */
function _interleaveByCourseAndLesson(cards: ReviewCard[]): ReviewCard[] {
  if (cards.length <= 3) {
    return cards
  }

  // Group by course:lesson
  const lessonGroups = new Map<string, CardGroup>()

  for (const card of cards) {
    const key = `${card.course_id}:${card.lesson_index}`
    if (!lessonGroups.has(key)) {
      lessonGroups.set(key, {
        key,
        cards: [],
        index: 0,
      })
    }
    lessonGroups.get(key)!.cards.push(card)
  }

  // Sort within groups by due date
  for (const group of lessonGroups.values()) {
    group.cards.sort((a, b) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )
  }

  // Convert to array
  const groups = Array.from(lessonGroups.values())

  // Shuffle group order to randomize which lessons come first
  // But keep overdue groups prioritized
  const now = new Date()
  groups.sort((a, b) => {
    const aHasOverdue = a.cards.some(c => new Date(c.due_date) < now)
    const bHasOverdue = b.cards.some(c => new Date(c.due_date) < now)

    if (aHasOverdue && !bHasOverdue) return -1
    if (!aHasOverdue && bHasOverdue) return 1

    // Randomize among similar priority groups
    return Math.random() - 0.5
  })

  // Interleave with strict constraints
  const result: ReviewCard[] = []
  const maxConsecutive = 2

  while (result.length < cards.length) {
    let addedThisRound = false

    for (const group of groups) {
      if (group.index >= group.cards.length) continue

      // Check if adding this card would violate constraint
      const wouldViolate = checkConsecutiveViolation(result, group.key, maxConsecutive)

      if (!wouldViolate) {
        result.push(group.cards[group.index])
        group.index++
        addedThisRound = true
      }
    }

    // Force add if stuck
    if (!addedThisRound) {
      for (const group of groups) {
        if (group.index < group.cards.length) {
          result.push(group.cards[group.index])
          group.index++
          break
        }
      }
    }

    // Safety check
    const totalRemaining = groups.reduce((sum, g) => sum + (g.cards.length - g.index), 0)
    if (totalRemaining === 0) break
  }

  return result
}

/**
 * Check if adding a card from a lesson would violate consecutive constraint
 */
function checkConsecutiveViolation(
  currentCards: ReviewCard[],
  lessonKey: string,
  maxConsecutive: number
): boolean {
  if (currentCards.length < maxConsecutive) {
    return false
  }

  let consecutive = 0
  for (let i = currentCards.length - 1; i >= Math.max(0, currentCards.length - maxConsecutive); i--) {
    const card = currentCards[i]
    const key = `${card.course_id}:${card.lesson_index}`
    if (key === lessonKey) {
      consecutive++
    } else {
      break
    }
  }

  return consecutive >= maxConsecutive
}
