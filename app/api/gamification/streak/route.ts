import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import {
  checkAndUpdateStreak,
  getStreakStatus,
  getTodayDateString,
  type StreakData,
  type StreakResult,
  getReachedMilestone,
  getMilestoneMessage,
} from '@/lib/gamification/streak'
import { calculateLevel, awardCustomXP } from '@/lib/gamification/xp'

// =============================================================================
// Types
// =============================================================================

interface StreakResponse {
  success: true
  streak: {
    current: number
    longest: number
    maintained: boolean
    broken: boolean
    started: boolean
  }
  bonusXP: number
  milestone?: {
    days: number
    label: string
    emoji: string
    message: string
  }
  levelUp: boolean
  newLevel?: number
}

// =============================================================================
// POST /api/gamification/streak - Update streak on daily activity
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to update streak')
    }

    // Get current gamification record
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Prepare streak data
    const streakData: StreakData = {
      userId: user.id,
      currentStreak: gamification?.current_streak || 0,
      longestStreak: gamification?.longest_streak || 0,
      lastActivityDate: gamification?.last_activity_date || null,
      streakFreezes: gamification?.streak_freezes || 0,
      lastFreezeUsed: gamification?.last_freeze_used || null,
    }

    // Check and update streak
    const result: StreakResult = checkAndUpdateStreak(streakData)

    // Calculate level up from streak XP
    const currentXP = gamification?.total_xp || 0
    const xpGain = result.xpEarned > 0 ? awardCustomXP(currentXP, result.xpEarned) : null

    // Prepare update data
    const updateData: Record<string, unknown> = {
      current_streak: result.currentStreak,
      longest_streak: result.longestStreak,
      last_activity_date: getTodayDateString(),
    }

    // Add XP if earned
    if (xpGain) {
      updateData.total_xp = xpGain.newTotal
      updateData.current_level = calculateLevel(xpGain.newTotal)
    }

    // Upsert gamification record
    if (gamification) {
      const { error: updateError } = await supabase
        .from('user_gamification')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) {
        logError('Gamification:streak:update', updateError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update streak')
      }
    } else {
      const { error: insertError } = await supabase.from('user_gamification').insert({
        user_id: user.id,
        total_xp: xpGain?.newTotal || 0,
        current_level: xpGain ? calculateLevel(xpGain.newTotal) : 1,
        current_streak: result.currentStreak,
        longest_streak: result.longestStreak,
        last_activity_date: getTodayDateString(),
        total_lessons_completed: 0,
        total_courses_completed: 0,
        total_cards_reviewed: 0,
        perfect_lessons: 0,
      })

      if (insertError) {
        logError('Gamification:streak:insert', insertError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create gamification record')
      }
    }

    // Check for milestone
    const milestone = getReachedMilestone(result.currentStreak)

    const response: StreakResponse = {
      success: true,
      streak: {
        current: result.currentStreak,
        longest: result.longestStreak,
        maintained: result.streakMaintained,
        broken: result.streakBroken,
        started: result.streakStarted,
      },
      bonusXP: result.xpEarned,
      levelUp: xpGain?.leveledUp || false,
      ...(xpGain?.leveledUp && { newLevel: xpGain.newLevel }),
      ...(milestone && {
        milestone: {
          days: milestone.days,
          label: milestone.label,
          emoji: milestone.emoji,
          message: getMilestoneMessage(milestone),
        },
      }),
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Gamification:streak:post', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update streak')
  }
}

// =============================================================================
// GET /api/gamification/streak - Get current streak status
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view streak')
    }

    // Get current gamification record
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('current_streak, longest_streak, last_activity_date, streak_freezes, last_freeze_used')
      .eq('user_id', user.id)
      .single()

    // Prepare streak data
    const streakData: StreakData = {
      userId: user.id,
      currentStreak: gamification?.current_streak || 0,
      longestStreak: gamification?.longest_streak || 0,
      lastActivityDate: gamification?.last_activity_date || null,
      streakFreezes: gamification?.streak_freezes || 0,
      lastFreezeUsed: gamification?.last_freeze_used || null,
    }

    // Get streak status
    const status = getStreakStatus(streakData)

    return NextResponse.json({
      current: status.current,
      longest: status.longest,
      isAtRisk: status.isAtRisk,
      activeToday: status.activeToday,
      hoursRemaining: status.hoursRemaining,
      nextMilestone: status.nextMilestone,
      daysToMilestone: status.daysToMilestone,
    })
  } catch (error) {
    logError('Gamification:streak:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch streak status')
  }
}
