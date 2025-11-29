import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { getXPProgress } from '@/lib/gamification/xp'
import {
  ACHIEVEMENTS as _ACHIEVEMENTS,
  mapEarnedAchievements,
  getAchievementSummary,
  getAllAchievementProgress,
  getCategoryLabel as _getCategoryLabel,
  type StreakStats,
  type LearningStats,
  type MasteryStats,
  type AchievementWithStatus,
  type AchievementCategory,
} from '@/lib/gamification/achievements'
// Reserved for future achievement system expansion
void _ACHIEVEMENTS
void _getCategoryLabel

// =============================================================================
// Types
// =============================================================================

interface AchievementsResponse {
  achievements: AchievementWithStatus[]
  summary: {
    total: number
    earned: number
    totalXP: number
    earnedXP: number
    byCategory: Record<AchievementCategory, { total: number; earned: number }>
  }
  progress: Array<{
    code: string
    current: number
    target: number
    percent: number
  }>
}

// =============================================================================
// GET /api/gamification/achievements - Get all achievements with progress
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view achievements')
    }

    // Get earned achievements from database
    const { data: earnedRecords, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })

    if (achievementsError) {
      logError('Gamification:achievements:fetch', achievementsError)
    }

    // Get gamification stats for progress calculation
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Map earned achievements
    const earnedCodes = new Set((earnedRecords || []).map((r) => r.achievement_code))
    const achievements = mapEarnedAchievements(earnedRecords || [])

    // Get summary
    const summary = getAchievementSummary(earnedCodes)

    // Prepare stats for progress calculation
    const xpProgress = getXPProgress(gamification?.total_xp || 0)

    const streakStats: StreakStats = {
      currentStreak: gamification?.current_streak || 0,
      longestStreak: gamification?.longest_streak || 0,
    }
    const learningStats: LearningStats = {
      totalLessonsCompleted: gamification?.total_lessons_completed || 0,
      totalCoursesCompleted: gamification?.total_courses_completed || 0,
      totalCardsReviewed: gamification?.total_cards_reviewed || 0,
      totalQuestionsAnswered: 0,
    }
    const masteryStats: MasteryStats = {
      perfectLessons: gamification?.perfect_lessons || 0,
      currentLevel: xpProgress.level,
      totalXP: gamification?.total_xp || 0,
      coursesWithFullMastery: 0,
    }

    // Calculate progress for all achievements
    const allProgress = getAllAchievementProgress(
      { streak: streakStats, learning: learningStats, mastery: masteryStats },
      earnedCodes,
      true // Include earned
    )

    const response: AchievementsResponse = {
      achievements,
      summary,
      progress: allProgress.map((p) => ({
        code: p.achievement.code,
        current: p.current,
        target: p.target,
        percent: p.percent,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Gamification:achievements:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch achievements')
  }
}
