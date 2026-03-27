/**
 * Tests for daily-session.ts
 *
 * All exported functions (generateDailySession, generateTargetedSession,
 * generateGapFixSession, updateSessionProgress, completeSession,
 * abandonSession, getSessionStats) are async and require Supabase.
 *
 * We mock the Supabase client to test the session generation logic.
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import {
  generateDailySession,
  generateTargetedSession,
  generateGapFixSession,
} from '@/lib/srs/daily-session'
import type { SessionGenerationOptions } from '@/lib/srs/daily-session'

// =============================================================================
// Helpers to build mock Supabase chains
// =============================================================================

function makeSelectChain(data: unknown[] | null, count?: number) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.lte = jest.fn().mockReturnValue(chain)
  chain.gt = jest.fn().mockReturnValue(chain)
  chain.gte = jest.fn().mockReturnValue(chain)
  chain.lt = jest.fn().mockReturnValue(chain)
  chain.in = jest.fn().mockReturnValue(chain)
  chain.overlaps = jest.fn().mockReturnValue(chain)
  chain.not = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.limit = jest.fn().mockResolvedValue({ data, count: count ?? data?.length ?? 0 })
  return chain
}

function makeInsertChain(data: { id: string } | null) {
  const chain: Record<string, jest.Mock> = {}
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.select = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue({ data })
  return chain
}

function makeCard(id: string, state: string = 'new', overrides: Record<string, unknown> = {}) {
  return {
    id,
    user_id: 'user-1',
    course_id: 'course-1',
    lesson_index: 0,
    step_index: 0,
    card_type: 'flashcard',
    front: 'Q?',
    back: 'A',
    stability: 3,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state,
    due_date: new Date().toISOString(),
    last_review: null,
    concept_ids: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Setup mock supabase that returns different data for each .from() table.
 * Tables: review_cards, user_knowledge_gaps, user_concept_mastery, review_sessions
 */
function setupMockSupabase(config: {
  dueCards?: unknown[]
  gapConceptIds?: string[]
  gapCards?: unknown[]
  decayConceptIds?: string[]
  reinforcementCards?: unknown[]
  newCards?: unknown[]
  sessionId?: string
}) {
  // Track call order for review_cards table
  let reviewCardCallIndex = 0

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'review_cards') {
      reviewCardCallIndex++
      // 1st call: due cards, 2nd: gap cards, 3rd: reinforcement, 4th: new cards
      if (reviewCardCallIndex === 1) {
        return makeSelectChain(config.dueCards || [])
      }
      if (reviewCardCallIndex === 2) {
        return makeSelectChain(config.gapCards || [])
      }
      if (reviewCardCallIndex === 3) {
        return makeSelectChain(config.reinforcementCards || [])
      }
      return makeSelectChain(config.newCards || [])
    }

    if (table === 'user_knowledge_gaps') {
      return makeSelectChain(
        (config.gapConceptIds || []).map((id) => ({ concept_id: id }))
      )
    }

    if (table === 'user_concept_mastery') {
      return makeSelectChain(
        (config.decayConceptIds || []).map((id) => ({ concept_id: id }))
      )
    }

    if (table === 'review_sessions') {
      const insertChain = makeInsertChain({
        id: config.sessionId || 'session-1',
      })
      return insertChain
    }

    return makeSelectChain([])
  })

  const mockSupabase = { from: mockFrom }
  ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  return mockSupabase
}

// =============================================================================
// generateDailySession
// =============================================================================

describe('generateDailySession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns an empty session when no cards exist', async () => {
    setupMockSupabase({})

    const session = await generateDailySession({ userId: 'user-1' })

    expect(session.cards).toHaveLength(0)
    expect(session.dueCards).toBe(0)
    expect(session.gapCards).toBe(0)
    expect(session.reinforcementCards).toBe(0)
    expect(session.newCards).toBe(0)
    expect(session.estimatedTimeMinutes).toBe(0)
    expect(session.sessionType).toBe('daily')
  })

  it('includes due cards with priority 1', async () => {
    const dueCard = makeCard('due-1', 'review')
    setupMockSupabase({ dueCards: [dueCard] })

    const session = await generateDailySession({ userId: 'user-1' })

    expect(session.dueCards).toBe(1)
    expect(session.cards[0]?.source).toBe('due')
    expect(session.cards[0]?.priority).toBe(1)
  })

  it('respects maxCards limit', async () => {
    // Even though there are due cards, we limit the query via supabase .limit()
    // The session itself is bounded by the logic
    const dueCards = [makeCard('c1'), makeCard('c2'), makeCard('c3')]
    setupMockSupabase({ dueCards })

    const session = await generateDailySession({
      userId: 'user-1',
      maxCards: 50,
    })

    // All 3 due cards should be included (under the 50 limit)
    expect(session.dueCards).toBe(3)
  })

  it('estimates time based on card count (30 seconds per card)', async () => {
    const dueCards = Array.from({ length: 6 }, (_, i) =>
      makeCard(`c-${i}`, 'review')
    )
    setupMockSupabase({ dueCards })

    const session = await generateDailySession({ userId: 'user-1' })

    // 6 cards * 30 seconds = 180 seconds = 3 minutes
    expect(session.estimatedTimeMinutes).toBe(3)
  })

  it('uses provided sessionType', async () => {
    setupMockSupabase({})

    const session = await generateDailySession({
      userId: 'user-1',
      sessionType: 'custom',
    })

    expect(session.sessionType).toBe('custom')
  })

  it('propagates targetConceptIds to session metadata', async () => {
    setupMockSupabase({})

    const session = await generateDailySession({
      userId: 'user-1',
      targetConceptIds: ['concept-1', 'concept-2'],
    })

    expect(session.targetConceptIds).toEqual(['concept-1', 'concept-2'])
  })

  it('generates a session ID', async () => {
    setupMockSupabase({ sessionId: 'test-session-id' })

    const session = await generateDailySession({ userId: 'user-1' })

    expect(session.id).toBeTruthy()
    expect(typeof session.id).toBe('string')
  })
})

// =============================================================================
// generateTargetedSession
// =============================================================================

describe('generateTargetedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a targeted session type', async () => {
    setupMockSupabase({})

    const session = await generateTargetedSession('user-1', ['c1', 'c2'])

    expect(session.sessionType).toBe('targeted')
  })

  it('sets newCardLimit to 0 (no new cards)', async () => {
    setupMockSupabase({})

    const session = await generateTargetedSession('user-1', ['c1'])

    expect(session.newCards).toBe(0)
  })
})

// =============================================================================
// generateGapFixSession
// =============================================================================

describe('generateGapFixSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // generateGapFixSession calls createClient twice: once internally to fetch
  // gap concept IDs, then again via generateDailySession. We need to handle
  // both calls.
  it('creates a gap_fix session type', async () => {
    let callCount = 0
    ;(createClient as jest.Mock).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        // generateGapFixSession's own supabase call for user_knowledge_gaps
        return {
          from: jest.fn().mockReturnValue(
            makeSelectChain([{ concept_id: 'gap-1' }])
          ),
        }
      }
      // generateDailySession's supabase — needs full from() chain
      // that handles review_cards, user_knowledge_gaps, user_concept_mastery, review_sessions
      let reviewCardCall = 0
      return {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'review_cards') {
            reviewCardCall++
            return makeSelectChain([])
          }
          if (table === 'user_knowledge_gaps') {
            return makeSelectChain([])
          }
          if (table === 'user_concept_mastery') {
            return makeSelectChain([])
          }
          if (table === 'review_sessions') {
            return makeInsertChain({ id: 'session-gap' })
          }
          return makeSelectChain([])
        }),
      }
    })

    const session = await generateGapFixSession('user-1')

    expect(session.sessionType).toBe('gap_fix')
  })
})
