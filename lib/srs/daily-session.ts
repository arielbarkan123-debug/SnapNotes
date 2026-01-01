/**
 * Daily Session Generator
 *
 * Generates gap-aware daily review sessions that mix:
 * 1. Due cards (from SRS scheduling)
 * 2. Gap-targeted cards (concepts with identified gaps)
 * 3. Reinforcement cards (decaying concepts)
 * 4. New cards (introduce new material)
 *
 * This creates optimal learning sessions that both maintain
 * existing knowledge and actively address knowledge gaps.
 */

import { createClient } from '@/lib/supabase/server'
import type { ReviewCard } from '@/types/srs'

// =============================================================================
// Types
// =============================================================================

export type CardSource = 'due' | 'gap' | 'reinforcement' | 'new'

export interface SessionCard {
  card: ReviewCard
  source: CardSource
  priority: number
  targetConceptIds?: string[]
}

export interface DailySession {
  id: string
  sessionType: 'daily' | 'targeted' | 'gap_fix' | 'custom'
  cards: SessionCard[]
  // Breakdown
  dueCards: number
  gapCards: number
  reinforcementCards: number
  newCards: number
  // Metadata
  targetConceptIds?: string[]
  estimatedTimeMinutes: number
}

export interface SessionGenerationOptions {
  userId: string
  maxCards?: number
  newCardLimit?: number
  targetConceptIds?: string[]
  sessionType?: DailySession['sessionType']
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_CARDS = 50
const DEFAULT_NEW_CARD_LIMIT = 10
const ESTIMATED_SECONDS_PER_CARD = 30

// =============================================================================
// Main Session Generator
// =============================================================================

/**
 * Generate a daily review session with gap awareness
 *
 * The session is composed of:
 * - Due cards (priority 1): Cards that are scheduled for review
 * - Gap cards (priority 2): Cards targeting identified knowledge gaps
 * - Reinforcement cards (priority 3): Cards for decaying concepts
 * - New cards (priority 4): New cards to introduce
 */
export async function generateDailySession(
  options: SessionGenerationOptions
): Promise<DailySession> {
  const {
    userId,
    maxCards = DEFAULT_MAX_CARDS,
    newCardLimit = DEFAULT_NEW_CARD_LIMIT,
    targetConceptIds,
    sessionType = 'daily',
  } = options

  const supabase = await createClient()
  const sessionCards: SessionCard[] = []

  let dueCount = 0
  let gapCount = 0
  let reinforcementCount = 0
  let newCount = 0

  // 1. Get due cards first (highest priority)
  const dueCardsLimit = Math.max(maxCards - newCardLimit, 20)
  const { data: dueCards } = await supabase
    .from('review_cards')
    .select('*')
    .eq('user_id', userId)
    .lte('due_date', new Date().toISOString())
    .order('due_date', { ascending: true })
    .limit(dueCardsLimit)

  if (dueCards) {
    for (const card of dueCards) {
      sessionCards.push({
        card: card as ReviewCard,
        source: 'due',
        priority: 1,
      })
      dueCount++
    }
  }

  const cardsAdded = sessionCards.length

  // 2. Get gap-targeted cards if we have room and gaps exist
  if (cardsAdded < maxCards) {
    // Get concepts with active gaps
    const { data: gaps } = await supabase
      .from('user_knowledge_gaps')
      .select('concept_id')
      .eq('user_id', userId)
      .eq('resolved', false)
      .in('severity', ['critical', 'moderate'])

    const gapConceptIds = gaps?.map((g) => g.concept_id) || []

    // Use provided target concepts or detected gaps
    const conceptsToTarget = targetConceptIds || gapConceptIds

    if (conceptsToTarget.length > 0) {
      const gapCardsLimit = Math.min(10, maxCards - cardsAdded)

      // Get cards that target these concepts and aren't already due
      const { data: gapCards } = await supabase
        .from('review_cards')
        .select('*')
        .eq('user_id', userId)
        .gt('due_date', new Date().toISOString())
        .overlaps('concept_ids', conceptsToTarget)
        .order('due_date', { ascending: true })
        .limit(gapCardsLimit)

      if (gapCards) {
        for (const card of gapCards) {
          // Don't add duplicates
          if (!sessionCards.find((sc) => sc.card.id === card.id)) {
            sessionCards.push({
              card: card as ReviewCard,
              source: 'gap',
              priority: 2,
              targetConceptIds: card.concept_ids?.filter((c: string) =>
                conceptsToTarget.includes(c)
              ),
            })
            gapCount++
          }
        }
      }
    }
  }

  // 3. Get reinforcement cards for decaying concepts
  if (sessionCards.length < maxCards) {
    // Get concepts showing decay
    const { data: decayingConcepts } = await supabase
      .from('user_concept_mastery')
      .select('concept_id')
      .eq('user_id', userId)
      .gt('peak_mastery', 0.6)
      .lt('mastery_level', 0.42) // 0.6 * 0.7 = 0.42 (30% decay)

    const decayConceptIds = decayingConcepts?.map((c) => c.concept_id) || []

    if (decayConceptIds.length > 0) {
      const reinforcementLimit = Math.min(5, maxCards - sessionCards.length)

      const existingCardIds = sessionCards.map((sc) => sc.card.id)

      const { data: reinforcementCards } = await supabase
        .from('review_cards')
        .select('*')
        .eq('user_id', userId)
        .gt('due_date', new Date().toISOString())
        .overlaps('concept_ids', decayConceptIds)
        .not('id', 'in', `(${existingCardIds.join(',')})`)
        .order('due_date', { ascending: true })
        .limit(reinforcementLimit)

      if (reinforcementCards) {
        for (const card of reinforcementCards) {
          if (!sessionCards.find((sc) => sc.card.id === card.id)) {
            sessionCards.push({
              card: card as ReviewCard,
              source: 'reinforcement',
              priority: 3,
            })
            reinforcementCount++
          }
        }
      }
    }
  }

  // 4. Fill remaining slots with new cards
  if (sessionCards.length < maxCards) {
    const newCardsToAdd = Math.min(newCardLimit, maxCards - sessionCards.length)

    const existingCardIds = sessionCards.map((sc) => sc.card.id)

    const { data: newCards } = await supabase
      .from('review_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('state', 'new')
      .not('id', 'in', existingCardIds.length > 0 ? `(${existingCardIds.join(',')})` : '()')
      .order('created_at', { ascending: true })
      .limit(newCardsToAdd)

    if (newCards) {
      for (const card of newCards) {
        sessionCards.push({
          card: card as ReviewCard,
          source: 'new',
          priority: 4,
        })
        newCount++
      }
    }
  }

  // 5. Create session record
  const { data: session } = await supabase
    .from('review_sessions')
    .insert({
      user_id: userId,
      session_type: sessionType,
      total_cards: sessionCards.length,
      review_cards: dueCount,
      new_cards: newCount,
      gap_cards: gapCount,
      reinforcement_cards: reinforcementCount,
      target_concept_ids: targetConceptIds,
    })
    .select('id')
    .single()

  // 6. Interleave cards for optimal learning
  const interleavedCards = interleaveSessionCards(sessionCards)

  return {
    id: session?.id || crypto.randomUUID(),
    sessionType,
    cards: interleavedCards,
    dueCards: dueCount,
    gapCards: gapCount,
    reinforcementCards: reinforcementCount,
    newCards: newCount,
    targetConceptIds,
    estimatedTimeMinutes: Math.ceil(
      (sessionCards.length * ESTIMATED_SECONDS_PER_CARD) / 60
    ),
  }
}

// =============================================================================
// Targeted Session Generator
// =============================================================================

/**
 * Generate a targeted session for specific concepts
 * Used for "Fix Gaps" or focused practice
 */
export async function generateTargetedSession(
  userId: string,
  conceptIds: string[],
  maxCards: number = 20
): Promise<DailySession> {
  return generateDailySession({
    userId,
    maxCards,
    newCardLimit: 0, // Don't introduce new cards in targeted sessions
    targetConceptIds: conceptIds,
    sessionType: 'targeted',
  })
}

/**
 * Generate a gap-fix session targeting all unresolved gaps
 */
export async function generateGapFixSession(
  userId: string,
  maxCards: number = 30
): Promise<DailySession> {
  const supabase = await createClient()

  // Get all gap concept IDs
  const { data: gaps } = await supabase
    .from('user_knowledge_gaps')
    .select('concept_id')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('severity', { ascending: true }) // Critical first

  const gapConceptIds = gaps?.map((g) => g.concept_id) || []

  return generateDailySession({
    userId,
    maxCards,
    newCardLimit: 0,
    targetConceptIds: gapConceptIds,
    sessionType: 'gap_fix',
  })
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Update session progress after a card review
 */
export async function updateSessionProgress(
  sessionId: string,
  isCorrect: boolean
): Promise<void> {
  const supabase = await createClient()

  // Get current session
  const { data: session } = await supabase
    .from('review_sessions')
    .select('cards_completed, cards_correct')
    .eq('id', sessionId)
    .single()

  if (!session) return

  await supabase
    .from('review_sessions')
    .update({
      cards_completed: (session.cards_completed || 0) + 1,
      cards_correct: (session.cards_correct || 0) + (isCorrect ? 1 : 0),
    })
    .eq('id', sessionId)
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  gapsAddressed?: string[]
): Promise<void> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('review_sessions')
    .select('cards_completed, cards_correct, started_at')
    .eq('id', sessionId)
    .single()

  if (!session) return

  const startTime = new Date(session.started_at).getTime()
  const totalTimeSeconds = Math.round((Date.now() - startTime) / 1000)
  const avgRating =
    session.cards_completed > 0
      ? (session.cards_correct / session.cards_completed) * 4
      : 0

  await supabase
    .from('review_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_time_seconds: totalTimeSeconds,
      average_rating: avgRating,
      gaps_addressed: gapsAddressed,
    })
    .eq('id', sessionId)
}

/**
 * Abandon a session (user quit early)
 */
export async function abandonSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('review_sessions')
    .update({
      status: 'abandoned',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Interleave session cards for optimal learning
 *
 * Research shows interleaving different types of material
 * improves long-term retention. We mix card sources while
 * maintaining priority order within each source.
 */
function interleaveSessionCards(cards: SessionCard[]): SessionCard[] {
  if (cards.length <= 5) return cards

  // Group by source
  const bySource: Record<CardSource, SessionCard[]> = {
    due: [],
    gap: [],
    reinforcement: [],
    new: [],
  }

  for (const card of cards) {
    bySource[card.source].push(card)
  }

  // Interleave: take from each source in rotation
  const result: SessionCard[] = []
  let hasMore = true

  while (hasMore) {
    hasMore = false

    // Take one from each source that has cards
    for (const source of ['due', 'gap', 'reinforcement', 'new'] as CardSource[]) {
      if (bySource[source].length > 0) {
        result.push(bySource[source].shift()!)
        hasMore = hasMore || bySource[source].length > 0
      }
    }
  }

  return result
}

/**
 * Get user's session stats
 */
export async function getSessionStats(userId: string, days: number = 7) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: sessions } = await supabase
    .from('review_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())

  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      totalCards: 0,
      totalCorrect: 0,
      averageAccuracy: 0,
      totalTimeMinutes: 0,
      gapsAddressed: 0,
    }
  }

  const stats = sessions.reduce(
    (acc, session) => ({
      totalSessions: acc.totalSessions + 1,
      totalCards: acc.totalCards + (session.cards_completed || 0),
      totalCorrect: acc.totalCorrect + (session.cards_correct || 0),
      totalTimeSeconds: acc.totalTimeSeconds + (session.total_time_seconds || 0),
      gapsAddressed:
        acc.gapsAddressed + (session.gaps_addressed?.length || 0),
    }),
    {
      totalSessions: 0,
      totalCards: 0,
      totalCorrect: 0,
      totalTimeSeconds: 0,
      gapsAddressed: 0,
    }
  )

  return {
    ...stats,
    averageAccuracy:
      stats.totalCards > 0
        ? Math.round((stats.totalCorrect / stats.totalCards) * 100)
        : 0,
    totalTimeMinutes: Math.round(stats.totalTimeSeconds / 60),
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  generateDailySession,
  generateTargetedSession,
  generateGapFixSession,
  updateSessionProgress,
  completeSession,
  abandonSession,
  getSessionStats,
}
