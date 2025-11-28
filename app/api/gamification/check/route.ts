import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { calculateLevel, getXPProgress, awardCustomXP } from '@/lib/gamification/xp'
import {
  checkAllAchievements,
  getAchievement,
  getAchievementMessage,
  prepareAchievementInsert,
  type Achievement,
  type StreakStats,
  type LearningStats,
  type MasteryStats,
} from '@/lib/gamification/achievements'

// =============================================================================
// Types
// =============================================================================

interface CheckAchievementsResponse {
  success: true
  newAchievements: Array<{
    code: string
    name: string
    description: string
    emoji: string
    xpReward: number
    message: string
  }>
  totalXPAwarded: number
  levelUp: boolean
  newLevel?: number
}

// =============================================================================
// POST /api/gamification/check - Check and award new achievements
// =============================================================================

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to check achievements')
    }

    // Get current gamification stats
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!gamification) {
      return NextResponse.json({
        success: true,
        newAchievements: [],
        totalXPAwarded: 0,
        levelUp: false,
      })
    }

    // Get already earned achievements
    const { data: earnedRecords } = await supabase
      .from('user_achievements')
      .select('achievement_code')
      .eq('user_id', user.id)

    const earnedCodes = new Set((earnedRecords || []).map((r) => r.achievement_code))

    // Get courses with full mastery (mastery_score >= 0.9)
    const { data: masteredCourses } = await supabase
      .from('user_mastery')
      .select('course_id')
      .eq('user_id', user.id)
      .gte('mastery_score', 0.9)

    // Prepare stats
    const xpProgress = getXPProgress(gamification.total_xp)

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
      coursesWithFullMastery: masteredCourses?.length || 0,
    }

    // Check for new achievements
    const newlyEarned = checkAllAchievements(streakStats, learningStats, masteryStats, earnedCodes)

    if (newlyEarned.length === 0) {
      return NextResponse.json({
        success: true,
        newAchievements: [],
        totalXPAwarded: 0,
        levelUp: false,
      })
    }

    // Award achievements and calculate total XP
    let totalXPAwarded = 0
    const achievementInserts = []

    for (const achievement of newlyEarned) {
      totalXPAwarded += achievement.xpReward
      achievementInserts.push(prepareAchievementInsert(user.id, achievement.code))
    }

    // Insert achievements
    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert(achievementInserts)

    if (insertError) {
      logError('Gamification:check:insert', insertError)
      // Continue anyway - achievements might have been partially inserted
    }

    // Award XP from achievements
    let levelUp = false
    let newLevel: number | undefined

    if (totalXPAwarded > 0) {
      const xpGain = awardCustomXP(gamification.total_xp, totalXPAwarded)
      levelUp = xpGain.leveledUp
      newLevel = xpGain.newLevel

      // Update user's XP
      const { error: updateError } = await supabase
        .from('user_gamification')
        .update({
          total_xp: xpGain.newTotal,
          current_level: calculateLevel(xpGain.newTotal),
        })
        .eq('user_id', user.id)

      if (updateError) {
        logError('Gamification:check:updateXP', updateError)
      }
    }

    // Prepare response
    const response: CheckAchievementsResponse = {
      success: true,
      newAchievements: newlyEarned.map((a) => ({
        code: a.code,
        name: a.name,
        description: a.description,
        emoji: a.emoji,
        xpReward: a.xpReward,
        message: getAchievementMessage(a),
      })),
      totalXPAwarded,
      levelUp,
      ...(levelUp && { newLevel }),
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Gamification:check:post', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to check achievements')
  }
}
