import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateMixedPractice,
  generateSpacedInterleaving,
  type MasteryData,
} from '@/lib/practice/interleaving'
import type { ReviewCard } from '@/types/srs'

interface RequestBody {
  course_ids: string[]
  card_count: number
  use_interleaving?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: RequestBody = await request.json()
    const { course_ids, card_count = 20, use_interleaving = true } = body

    // Log requested count
    console.log(`[Practice API] User requested: ${card_count} questions`)

    if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
      return NextResponse.json(
        { error: 'course_ids is required' },
        { status: 400 }
      )
    }

    // Fetch review cards for the selected courses (limit to reasonable max for practice)
    const { data: allCards, error: cardsError } = await supabase
      .from('review_cards')
      .select('id, user_id, course_id, lesson_index, step_index, card_type, front, back, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due_date, last_review, created_at, updated_at')
      .eq('user_id', user.id)
      .in('course_id', course_ids)
      .order('due_date', { ascending: true })
      .limit(500)

    if (cardsError) {
      console.error('Failed to fetch cards:', cardsError)
      return NextResponse.json(
        { error: 'Failed to fetch cards' },
        { status: 500 }
      )
    }

    // If no cards exist, return empty
    if (!allCards || allCards.length === 0) {
      console.log('[Practice API] No cards available in database')
      return NextResponse.json({ cards: [], stats: null, requested: card_count, available: 0 })
    }

    console.log(`[Practice API] Available cards in database: ${allCards.length}`)

    // Fetch mastery data for lessons
    const { data: masteryData } = await supabase
      .from('user_mastery')
      .select('course_id, mastery_score')
      .eq('user_id', user.id)
      .in('course_id', course_ids)

    // Build mastery data array (expand to lesson level as approximation)
    const masteryArray: MasteryData[] = []
    if (masteryData) {
      for (const mastery of masteryData) {
        const courseCards = allCards.filter(c => c.course_id === mastery.course_id)
        const lessonIndices = [...new Set(courseCards.map(c => c.lesson_index))]

        for (const lessonIndex of lessonIndices) {
          masteryArray.push({
            courseId: mastery.course_id,
            lessonIndex,
            masteryScore: mastery.mastery_score,
          })
        }
      }
    }

    // Determine target count - can't exceed what's available
    const targetCount = Math.min(card_count, allCards.length, 100)

    // Generate practice session using interleaving
    // Allow more new cards if we need them to hit the target
    const cards = allCards as ReviewCard[]
    const maxNewCards = Math.min(
      Math.ceil(targetCount * 0.5), // Allow up to 50% new cards
      allCards.filter(c => c.state === 'new').length // But not more than available
    )

    const session = generateMixedPractice(
      user.id,
      cards,
      masteryArray,
      {
        cardCount: targetCount,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: maxNewCards,
      }
    )

    console.log(`[Practice API] After generateMixedPractice: ${session.cards.length} cards`)

    // Optionally apply spaced interleaving for maximum variety
    let finalCards = use_interleaving
      ? generateSpacedInterleaving(session.cards, {
          cardCount: targetCount,
          maxConsecutiveSameTopic: 2,
          prioritizeLowMastery: true,
          maxNewCards: maxNewCards,
        })
      : session.cards

    console.log(`[Practice API] After interleaving: ${finalCards.length} cards`)

    // If we still don't have enough, try to fill from remaining cards
    if (finalCards.length < targetCount && allCards.length > finalCards.length) {
      const usedIds = new Set(finalCards.map(c => c.id))
      const remaining = cards.filter(c => !usedIds.has(c.id))
      const needed = targetCount - finalCards.length

      // Add remaining cards (already sorted by due_date from query)
      const extras = remaining.slice(0, needed).map(card => ({
        ...card,
        topicKey: `${card.course_id}:${card.lesson_index}`,
        lessonMastery: 0.5,
        priorityScore: 0,
      }))

      finalCards = [...finalCards, ...extras]
      console.log(`[Practice API] Added ${extras.length} extra cards to reach target`)
    }

    // Final slice to exact count
    const result = finalCards.slice(0, targetCount)

    console.log(`[Practice API] Final result: ${result.length} cards (requested: ${card_count}, available: ${allCards.length})`)

    return NextResponse.json({
      cards: result,
      stats: {
        ...session.stats,
        totalCards: result.length,
      },
      requested: card_count,
      delivered: result.length,
      available: allCards.length,
    })
  } catch (error) {
    console.error('Error generating practice session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
