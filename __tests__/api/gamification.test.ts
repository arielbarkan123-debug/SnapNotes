/**
 * Tests for Gamification API
 * GET  /api/gamification/achievements - Get all achievements with progress
 * POST /api/gamification/check       - Check and award new achievements
 * GET  /api/gamification/stats        - Get gamification stats
 * POST /api/gamification/streak       - Update streak on daily activity
 * GET  /api/gamification/streak       - Get current streak status
 * POST /api/gamification/xp           - Award XP for an event
 * GET  /api/gamification/xp           - Get XP info and rewards table
 */

import { GET as achievementsGET } from '@/app/api/gamification/achievements/route'
import { POST as checkPOST } from '@/app/api/gamification/check/route'
import { GET as statsGET } from '@/app/api/gamification/stats/route'
import { POST as streakPOST, GET as streakGET } from '@/app/api/gamification/streak/route'
import { POST as xpPOST, GET as xpGET } from '@/app/api/gamification/xp/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-DB-001': 500,
      'NS-DB-099': 500,
      'NS-VAL-002': 400,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    DATABASE_ERROR: 'NS-DB-001',
    INTERNAL_ERROR: 'NS-DB-099',
    INVALID_INPUT: 'NS-VAL-002',
  },
  logError: jest.fn(),
}))

jest.mock('@/lib/gamification/xp', () => ({
  XP_REWARDS: {
    lesson_complete: 10,
    lesson_perfect: 5,
    card_reviewed: 2,
    card_easy: 3,
    card_good: 2,
    card_hard: 1,
    first_course: 50,
    course_created: 25,
    streak_7: 20,
  },
  getXPProgress: jest.fn().mockReturnValue({
    level: 3,
    xpInLevel: 50,
    xpNeeded: 200,
    percent: 25,
  }),
  calculateLevel: jest.fn().mockReturnValue(3),
  getLevelTitle: jest.fn().mockReturnValue('Scholar'),
  getLevelBadge: jest.fn().mockReturnValue('badge-scholar'),
  awardXP: jest.fn().mockReturnValue({
    amount: 10,
    newTotal: 310,
    leveledUp: false,
    newLevel: 3,
    newTitle: 'Scholar',
  }),
  awardCustomXP: jest.fn().mockReturnValue({
    amount: 25,
    newTotal: 325,
    leveledUp: false,
    newLevel: 3,
  }),
}))

jest.mock('@/lib/gamification/achievements', () => ({
  ACHIEVEMENTS: [],
  mapEarnedAchievements: jest.fn().mockReturnValue([
    { code: 'first_login', name: 'First Login', earned: true },
  ]),
  getAchievementSummary: jest.fn().mockReturnValue({
    total: 20,
    earned: 5,
    totalXP: 500,
    earnedXP: 100,
    byCategory: {},
  }),
  getAllAchievementProgress: jest.fn().mockReturnValue([
    { achievement: { code: 'first_login' }, current: 1, target: 1, percent: 100 },
    { achievement: { code: 'streak_7' }, current: 3, target: 7, percent: 42 },
  ]),
  getCategoryLabel: jest.fn().mockReturnValue('Streak'),
  checkAllAchievements: jest.fn().mockReturnValue([]),
  getAchievement: jest.fn(),
  getAchievementMessage: jest.fn().mockReturnValue('Congrats!'),
  prepareAchievementInsert: jest.fn().mockReturnValue({
    user_id: 'user-123',
    achievement_code: 'streak_7',
    earned_at: new Date().toISOString(),
  }),
  getNextAchievements: jest.fn().mockReturnValue([
    { achievement: { code: 'streak_7', name: 'Week Warrior', emoji: '🔥' }, percent: 42 },
  ]),
}))

jest.mock('@/lib/gamification/streak', () => ({
  checkAndUpdateStreak: jest.fn().mockReturnValue({
    currentStreak: 4,
    longestStreak: 10,
    streakMaintained: true,
    streakBroken: false,
    streakStarted: false,
    xpEarned: 5,
  }),
  getStreakStatus: jest.fn().mockReturnValue({
    current: 4,
    longest: 10,
    isAtRisk: false,
    activeToday: true,
    hoursRemaining: 18,
    nextMilestone: 7,
    daysToMilestone: 3,
  }),
  getTodayDateString: jest.fn().mockReturnValue('2026-03-27'),
  getReachedMilestone: jest.fn().mockReturnValue(null),
  getMilestoneMessage: jest.fn().mockReturnValue(''),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}))

describe('Gamification API', () => {
  let mockSupabase: any

  const mockGamification = {
    id: 'gam-1',
    user_id: 'user-123',
    total_xp: 300,
    current_level: 3,
    current_streak: 4,
    longest_streak: 10,
    last_activity_date: '2026-03-27',
    streak_freezes: 2,
    last_freeze_used: null,
    total_lessons_completed: 15,
    total_courses_completed: 2,
    total_cards_reviewed: 50,
    perfect_lessons: 5,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: mockGamification, error: null })
          builder.update.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue(
                  Promise.resolve({ data: [{ ...mockGamification, total_xp: 310 }], error: null })
                ),
              }),
              select: jest.fn().mockReturnValue(
                Promise.resolve({ data: [{ ...mockGamification, total_xp: 310 }], error: null })
              ),
            }),
          })
        } else if (table === 'user_achievements') {
          builder.order.mockResolvedValue({
            data: [{ achievement_code: 'first_login', earned_at: '2026-03-01T00:00:00Z' }],
            error: null,
          })
          // For select without order (check route)
          builder.eq.mockReturnThis()
          builder.insert.mockResolvedValue({ error: null })
        } else if (table === 'user_mastery') {
          builder.gte.mockResolvedValue({ data: [{ course_id: 'c-1' }], error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  // =========================================================================
  // GET /api/gamification/achievements
  // =========================================================================

  describe('GET /api/gamification/achievements', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await achievementsGET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns achievements with progress', async () => {
      const response = await achievementsGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements).toBeTruthy()
      expect(data.summary).toBeTruthy()
      expect(data.summary.total).toBe(20)
      expect(data.summary.earned).toBe(5)
      expect(data.progress).toHaveLength(2)
    })

    it('returns 500 on unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected'))

      const response = await achievementsGET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // =========================================================================
  // POST /api/gamification/check
  // =========================================================================

  describe('POST /api/gamification/check', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await checkPOST()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns empty when no new achievements earned', async () => {
      const response = await checkPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newAchievements).toHaveLength(0)
      expect(data.totalXPAwarded).toBe(0)
    })

    it('returns new achievements when earned', async () => {
      const { checkAllAchievements } = require('@/lib/gamification/achievements')
      checkAllAchievements.mockReturnValue([
        { code: 'streak_7', name: 'Week Warrior', description: '7-day streak', emoji: '🔥', xpReward: 25 },
      ])

      const response = await checkPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newAchievements).toHaveLength(1)
      expect(data.newAchievements[0].code).toBe('streak_7')
      expect(data.totalXPAwarded).toBe(25)
    })

    it('returns empty when no gamification record exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const response = await checkPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newAchievements).toHaveLength(0)
    })
  })

  // =========================================================================
  // GET /api/gamification/stats
  // =========================================================================

  describe('GET /api/gamification/stats', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await statsGET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns gamification stats', async () => {
      const response = await statsGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalXP).toBe(300)
      expect(data.level).toBe(3)
      expect(data.levelTitle).toBe('Scholar')
      expect(data.streak).toBeTruthy()
      expect(data.streak.current).toBe(4)
      expect(data.stats).toBeTruthy()
      expect(data.achievements).toBeTruthy()
    })

    it('returns 500 on unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected'))

      const response = await statsGET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // =========================================================================
  // POST /api/gamification/streak
  // =========================================================================

  describe('POST /api/gamification/streak', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await streakPOST()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('updates streak and returns result', async () => {
      // Ensure the update mock works for streak
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: mockGamification, error: null })
        }

        return builder
      })

      const response = await streakPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.streak.current).toBe(4)
      expect(data.streak.maintained).toBe(true)
    })

    it('handles new user without gamification record', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }

        return builder
      })

      const response = await streakPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on database error (non-PGRST116)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: null, error: { code: 'OTHER_ERR', message: 'DB error' } })
        }

        return builder
      })

      const response = await streakPOST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // =========================================================================
  // GET /api/gamification/streak
  // =========================================================================

  describe('GET /api/gamification/streak', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await streakGET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns streak status', async () => {
      const response = await streakGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.current).toBe(4)
      expect(data.longest).toBe(10)
      expect(data.activeToday).toBe(true)
      expect(data.hoursRemaining).toBe(18)
      expect(data.nextMilestone).toBe(7)
    })

    it('returns 500 on unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected'))

      const response = await streakGET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // =========================================================================
  // POST /api/gamification/xp
  // =========================================================================

  describe('POST /api/gamification/xp', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/gamification/xp', {
        method: 'POST',
        body: JSON.stringify({ event: 'lesson_complete' }),
      })

      const response = await xpPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/gamification/xp', {
        method: 'POST',
        body: 'not-json',
      })

      const response = await xpPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns 400 for invalid event type', async () => {
      const request = new NextRequest('http://localhost/api/gamification/xp', {
        method: 'POST',
        body: JSON.stringify({ event: 'invalid_event' }),
      })

      const response = await xpPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('awards XP for valid event', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue(
                  Promise.resolve({ data: [{ ...mockGamification, total_xp: 310 }], error: null })
                ),
              }),
            }),
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: mockGamification, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/gamification/xp', {
        method: 'POST',
        body: JSON.stringify({ event: 'lesson_complete' }),
      })

      const response = await xpPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.xpAwarded).toBe(10)
      expect(data.newTotal).toBe(310)
    })

    it('creates gamification record for new user', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/gamification/xp', {
        method: 'POST',
        body: JSON.stringify({ event: 'lesson_complete' }),
      })

      const response = await xpPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // =========================================================================
  // GET /api/gamification/xp
  // =========================================================================

  describe('GET /api/gamification/xp', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await xpGET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns XP info and rewards table', async () => {
      const response = await xpGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.currentXP).toBe(300)
      expect(data.currentLevel).toBe(3)
      expect(data.rewards).toBeTruthy()
      expect(data.rewards.lesson_complete).toBe(10)
    })

    it('returns defaults when no gamification record exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'user_gamification') {
          builder.single.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const response = await xpGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.currentXP).toBe(0)
      expect(data.currentLevel).toBe(1)
    })
  })
})
