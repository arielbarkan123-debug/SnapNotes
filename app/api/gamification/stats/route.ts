import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { getXPProgress, getLevelTitle, getLevelBadge } from '@/lib/gamification/xp'
import { getStreakStatus, type StreakData } from '@/lib/gamification/streak'
import {
  getAchievementSummary,
  getNextAchievements,
  type StreakStats,
  type LearningStats,
  type MasteryStats,
} from '@/lib/gamification/achievements'

// =============================================================================
// Types
// =============================================================================

interface GamificationStats {
  // XP & Level
  totalXP: number
  level: number
  levelTitle: string
  levelBadge: string
  levelProgress: {
    current: number
    target: number
    percent: number
    xpToNextLevel: number
  }
  // Streak
  streak: {
    current: number
    longest: number
    isAtRisk: boolean
    activeToday: boolean
    hoursRemaining: number
  }
  // Learning stats
  stats: {
    lessonsCompleted: number
    coursesCompleted: number
    cardsReviewed: number
    perfectLessons: number
  }
  // Achievements
  achievements: {
    total: number
    earned: number
    recentlyEarned: string[]
    nextUp: Array<{
      code: string
      name: string
      emoji: string
      percent: number
    }>
  }
}

// =============================================================================
// GET /api/gamification/stats - Get user's gamification stats
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view stats')
    }

    // Get or create gamification record
    const gamification = await getOrCreateGamification(supabase, user.id)

    // Get earned achievements
    const { data: earnedAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_code, earned_at')
      .eq('user_id', user.id)

    const earnedCodes = new Set((earnedAchievements || []).map((a) => a.achievement_code))

    // Calculate level progress
    const xpProgress = getXPProgress(gamification.total_xp)

    // Calculate streak status
    const streakData: StreakData = {
      userId: user.id,
      currentStreak: gamification.current_streak,
      longestStreak: gamification.longest_streak,
      lastActivityDate: gamification.last_activity_date,
      streakFreezes: gamification.streak_freezes,
      lastFreezeUsed: gamification.last_freeze_used,
    }
    const streakStatus = getStreakStatus(streakData)

    // Prepare stats for achievement progress calculation
    const streakStats: StreakStats = {
      currentStreak: gamification.current_streak,
      longestStreak: gamification.longest_streak,
    }
    const learningStats: LearningStats = {
      totalLessonsCompleted: gamification.total_lessons_completed,
      totalCoursesCompleted: gamification.total_courses_completed,
      totalCardsReviewed: gamification.total_cards_reviewed,
      totalQuestionsAnswered: 0,
    }
    const masteryStats: MasteryStats = {
      perfectLessons: gamification.perfect_lessons,
      currentLevel: xpProgress.level,
      totalXP: gamification.total_xp,
      coursesWithFullMastery: 0,
    }

    // Get achievement summary and next achievements
    const achievementSummary = getAchievementSummary(earnedCodes)
    const nextAchievements = getNextAchievements(
      { streak: streakStats, learning: learningStats, mastery: masteryStats },
      earnedCodes,
      3
    )

    // Get recently earned (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentlyEarned = (earnedAchievements || [])
      .filter((a) => a.earned_at >= oneDayAgo)
      .map((a) => a.achievement_code)

    const response: GamificationStats = {
      totalXP: gamification.total_xp,
      level: xpProgress.level,
      levelTitle: getLevelTitle(xpProgress.level),
      levelBadge: getLevelBadge(xpProgress.level),
      levelProgress: {
        current: xpProgress.xpInLevel,
        target: xpProgress.xpNeeded,
        percent: xpProgress.percent,
        xpToNextLevel: xpProgress.xpNeeded - xpProgress.xpInLevel,
      },
      streak: {
        current: streakStatus.current,
        longest: streakStatus.longest,
        isAtRisk: streakStatus.isAtRisk,
        activeToday: streakStatus.activeToday,
        hoursRemaining: streakStatus.hoursRemaining,
      },
      stats: {
        lessonsCompleted: gamification.total_lessons_completed,
        coursesCompleted: gamification.total_courses_completed,
        cardsReviewed: gamification.total_cards_reviewed,
        perfectLessons: gamification.perfect_lessons,
      },
      achievements: {
        total: achievementSummary.total,
        earned: achievementSummary.earned,
        recentlyEarned,
        nextUp: nextAchievements.map((p) => ({
          code: p.achievement.code,
          name: p.achievement.name,
          emoji: p.achievement.emoji,
          percent: p.percent,
        })),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Gamification:stats:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch gamification stats')
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

interface GamificationRecord {
  id: string
  user_id: string
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  streak_freezes: number
  last_freeze_used: string | null
  total_lessons_completed: number
  total_courses_completed: number
  total_cards_reviewed: number
  perfect_lessons: number
}

async function getOrCreateGamification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<GamificationRecord> {
  // Try to get existing record
  const { data: existing } = await supabase
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing) {
    return existing
  }

  // Create new record
  const { data: created, error: createError } = await supabase
    .from('user_gamification')
    .insert({
      user_id: userId,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_lessons_completed: 0,
      total_courses_completed: 0,
      total_cards_reviewed: 0,
      perfect_lessons: 0,
    })
    .select()
    .single()

  if (createError || !created) {
    // Return defaults if creation fails
    return {
      id: '',
      user_id: userId,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      streak_freezes: 0,
      last_freeze_used: null,
      total_lessons_completed: 0,
      total_courses_completed: 0,
      total_cards_reviewed: 0,
      perfect_lessons: 0,
    }
  }

  return created
}
