import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  generateMixedPractice,
  generateSpacedInterleaving,
  type MasteryData,
} from '@/lib/practice/interleaving'
import { generatePracticeQuestions } from '@/lib/practice/question-generator'
import type { GeneratedQuestion, PracticeQuestionType } from '@/lib/practice/types'
import type { ReviewCard, CardType } from '@/types/srs'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:practice-generate')

interface RequestBody {
  course_ids: string[]
  card_count: number
  use_interleaving?: boolean
  language?: 'en' | 'he'
}

// Maximum questions allowed per request to prevent abuse
const MAX_CARD_COUNT = 50

// -----------------------------------------------------------------------------
// Map AI-generated questions to ReviewCard format for the practice UI
// -----------------------------------------------------------------------------

function toCardType(qt: PracticeQuestionType): CardType {
  // image_label doesn't exist in CardType — map to short_answer
  if (qt === 'image_label') return 'short_answer'
  return qt as CardType
}

function mapGeneratedQuestionToCard(
  q: GeneratedQuestion,
  index: number,
  courseId: string,
  userId: string
): ReviewCard {
  let back: string

  switch (q.question_type) {
    case 'multiple_choice': {
      const options = q.options?.choices?.map((c) => c.value) || []
      const correctIndex = q.options?.choices?.findIndex(
        (c) => c.label === q.correct_answer
      ) ?? 0
      back = JSON.stringify({
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: q.explanation,
      })
      break
    }
    case 'true_false': {
      back = JSON.stringify({
        correct: q.correct_answer.toLowerCase() === 'true',
        explanation: q.explanation,
      })
      break
    }
    case 'fill_blank': {
      back = JSON.stringify({
        answer: q.correct_answer,
        acceptableAnswers: [q.correct_answer],
      })
      break
    }
    case 'matching': {
      const pairs = q.options?.pairs || []
      back = JSON.stringify({
        terms: pairs.map((p) => p.left),
        definitions: pairs.map((p) => p.right),
        correctPairs: pairs.map((_, i) => i),
      })
      break
    }
    case 'sequence': {
      const items = q.options?.items || []
      back = JSON.stringify({
        items,
        correctOrder: items.map((_, i) => i),
      })
      break
    }
    case 'multi_select': {
      const msOptions = q.options?.choices?.map((c) => c.value) || []
      const correctLabels = q.correct_answer.split(',').map((l) => l.trim())
      const correctIndices = correctLabels
        .map((label) =>
          q.options?.choices?.findIndex((c) => c.label === label) ?? -1
        )
        .filter((i) => i >= 0)
      back = JSON.stringify({
        options: msOptions,
        correctIndices,
        explanation: q.explanation,
      })
      break
    }
    case 'short_answer':
    default: {
      back = q.correct_answer
      break
    }
  }

  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    user_id: userId,
    course_id: courseId,
    lesson_index: 0,
    step_index: index,
    card_type: toCardType(q.question_type),
    front: q.question_text,
    back,
    stability: 0,
    // FSRS difficulty defaults to 0 for new cards (not the question's difficulty_level)
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 'new' as const,
    due_date: now,
    last_review: null,
    concept_ids: null,
    created_at: now,
    updated_at: now,
  }
}

// -----------------------------------------------------------------------------
// Fallback: fetch review cards (old behavior)
// -----------------------------------------------------------------------------

async function fetchReviewCardsFallback(
  userId: string,
  courseIds: string[],
  cardCount: number,
  useInterleaving: boolean
) {
  const supabase = await createClient()

  const { data: allCards, error: cardsError } = await supabase
    .from('review_cards')
    .select(
      'id, user_id, course_id, lesson_index, step_index, card_type, front, back, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due_date, last_review, created_at, updated_at'
    )
    .eq('user_id', userId)
    .in('course_id', courseIds)
    .order('due_date', { ascending: true })
    .limit(500)

  if (cardsError || !allCards || allCards.length === 0) {
    return { cards: [], stats: null, requested: cardCount, available: 0 }
  }

  const { data: masteryData } = await supabase
    .from('user_mastery')
    .select('course_id, mastery_score')
    .eq('user_id', userId)
    .in('course_id', courseIds)

  const masteryArray: MasteryData[] = []
  if (masteryData) {
    for (const mastery of masteryData) {
      const courseCards = allCards.filter(
        (c) => c.course_id === mastery.course_id
      )
      const lessonIndices = [...new Set(courseCards.map((c) => c.lesson_index))]
      for (const lessonIndex of lessonIndices) {
        masteryArray.push({
          courseId: mastery.course_id,
          lessonIndex,
          masteryScore: mastery.mastery_score,
        })
      }
    }
  }

  const targetCount = Math.min(cardCount, allCards.length, 100)
  const cards = allCards as ReviewCard[]
  const maxNewCards = Math.min(
    Math.ceil(targetCount * 0.5),
    allCards.filter((c) => c.state === 'new').length
  )

  const session = generateMixedPractice(userId, cards, masteryArray, {
    cardCount: targetCount,
    maxConsecutiveSameTopic: 2,
    prioritizeLowMastery: true,
    maxNewCards,
  })

  let finalCards = useInterleaving
    ? generateSpacedInterleaving(session.cards, {
        cardCount: targetCount,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards,
      })
    : session.cards

  if (finalCards.length < targetCount && allCards.length > finalCards.length) {
    const usedIds = new Set(finalCards.map((c) => c.id))
    const remaining = cards.filter((c) => !usedIds.has(c.id))
    const extras = remaining.slice(0, targetCount - finalCards.length).map(
      (card) => ({
        ...card,
        topicKey: `${card.course_id}:${card.lesson_index}`,
        lessonMastery: 0.5,
        priorityScore: 0,
      })
    )
    finalCards = [...finalCards, ...extras]
  }

  const result = finalCards.slice(0, targetCount)
  return {
    cards: result,
    stats: { ...session.stats, totalCards: result.length },
    requested: cardCount,
    delivered: result.length,
    available: allCards.length,
  }
}

// -----------------------------------------------------------------------------
// Main endpoint
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RequestBody = await request.json()
    const {
      course_ids,
      card_count: rawCardCount = 20,
      use_interleaving = true,
      language: bodyLanguage,
    } = body

    // Validate and clamp card_count
    const card_count = Math.max(1, Math.min(
      typeof rawCardCount === 'number' && !isNaN(rawCardCount) ? Math.floor(rawCardCount) : 20,
      MAX_CARD_COUNT
    ))

    log.debug({ card_count: card_count }, 'User requested: AI-generated questions')

    if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
      return NextResponse.json(
        { error: 'course_ids is required' },
        { status: 400 }
      )
    }

    // Get user's education level and language
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('education_level')
      .eq('user_id', user.id)
      .single()

    const educationLevel = profile?.education_level || 'high_school'

    // Determine language: prefer explicit body param, then Accept-Language header, then default
    let language: 'en' | 'he' = 'en'
    if (bodyLanguage === 'en' || bodyLanguage === 'he') {
      language = bodyLanguage
    } else {
      const acceptLang = request.headers.get('accept-language') || ''
      if (acceptLang.includes('he')) language = 'he'
    }

    // Distribute questions across courses (don't over-generate)
    const questionsPerCourse = Math.max(
      1,
      Math.ceil(card_count / course_ids.length)
    )

    // Generate fresh AI questions for each course
    const allGeneratedCards: ReviewCard[] = []
    const failedCourses: string[] = []

    await Promise.all(
      course_ids.map(async (courseId) => {
        try {
          const questions = await generatePracticeQuestions({
            courseId,
            count: questionsPerCourse,
            educationLevel,
            language,
          })

          const cards = questions.map((q, i) =>
            mapGeneratedQuestionToCard(q, i, courseId, user.id)
          )
          allGeneratedCards.push(...cards)

          log.debug({ length: cards.length, courseId: courseId }, 'Generated AI questions for course')
        } catch (err) {
          log.error({ err: err }, 'AI generation failed for course')
          failedCourses.push(courseId)
        }
      })
    )

    // If AI generated enough questions, shuffle and return them
    if (allGeneratedCards.length > 0) {
      // Fisher-Yates shuffle for uniform distribution
      for (let i = allGeneratedCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allGeneratedCards[i], allGeneratedCards[j]] = [allGeneratedCards[j], allGeneratedCards[i]]
      }
      const result = allGeneratedCards.slice(0, card_count)

      log.debug({ length: result.length, card_count: card_count }, 'Returning AI-generated questions (requested: )')

      return NextResponse.json({
        cards: result,
        stats: { totalCards: result.length },
        requested: card_count,
        delivered: result.length,
        available: allGeneratedCards.length,
        source: 'ai_generated',
        ...(failedCourses.length > 0 && {
          warnings: [`AI generation failed for ${failedCourses.length} course(s), partial results returned`],
        }),
      })
    }

    // Fallback: If ALL AI generations failed, use old review_cards method
    log.debug('All AI generations failed, falling back to review cards')
    const fallbackResult = await fetchReviewCardsFallback(
      user.id,
      course_ids,
      card_count,
      use_interleaving
    )

    return NextResponse.json({
      ...fallbackResult,
      source: 'review_cards_fallback',
    })
  } catch (error) {
    log.error({ err: error }, 'Error generating practice session')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
