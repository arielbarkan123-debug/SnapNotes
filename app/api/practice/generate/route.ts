import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateMixedPractice,
  generateSpacedInterleaving,
  MasteryData,
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

    if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
      return NextResponse.json(
        { error: 'course_ids is required' },
        { status: 400 }
      )
    }

    // Fetch all review cards for the selected courses
    const { data: allCards, error: cardsError } = await supabase
      .from('review_cards')
      .select('*')
      .eq('user_id', user.id)
      .in('course_id', course_ids)
      .order('due_date', { ascending: true })

    if (cardsError) {
      console.error('Failed to fetch cards:', cardsError)
      return NextResponse.json(
        { error: 'Failed to fetch cards' },
        { status: 500 }
      )
    }

    // If no cards exist, return empty
    if (!allCards || allCards.length === 0) {
      return NextResponse.json({ cards: [], stats: null })
    }

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
        // For now, use course mastery for all lessons in that course
        // In a more complete implementation, you'd have per-lesson mastery
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

    // Generate practice session using interleaving
    const cards = allCards as ReviewCard[]
    const session = generateMixedPractice(
      user.id,
      cards,
      masteryArray,
      {
        cardCount: Math.min(card_count, 100), // Cap at 100
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: Math.ceil(card_count * 0.25), // 25% new cards max
      }
    )

    // Optionally apply spaced interleaving for maximum variety
    const finalCards = use_interleaving
      ? generateSpacedInterleaving(session.cards, { cardCount: Math.min(card_count, 100), maxConsecutiveSameTopic: 2, prioritizeLowMastery: true, maxNewCards: Math.ceil(card_count * 0.25) })
      : session.cards

    return NextResponse.json({
      cards: finalCards.slice(0, card_count),
      stats: session.stats,
    })
  } catch (error) {
    console.error('Error generating practice session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
