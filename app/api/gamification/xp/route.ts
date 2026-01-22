import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import {
  XP_REWARDS,
  type XPRewardType,
  calculateLevel,
  getLevelTitle as _getLevelTitle,
  awardXP,
  awardCustomXP as _awardCustomXP,
} from '@/lib/gamification/xp'
// Reserved for future XP system features
void _getLevelTitle
void _awardCustomXP

// =============================================================================
// Types
// =============================================================================

interface AwardXPRequest {
  event: XPRewardType
  bonusXP?: number
  metadata?: {
    courseId?: string
    lessonIndex?: number
    cardId?: string
    accuracy?: number
  }
}

interface AwardXPResponse {
  success: true
  xpAwarded: number
  newTotal: number
  levelUp: boolean
  newLevel?: number
  newTitle?: string
  previousLevel: number
}

// =============================================================================
// POST /api/gamification/xp - Award XP for an event
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to earn XP')
    }

    // Parse request body
    let body: AwardXPRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    // Validate event type
    if (!body.event || !(body.event in XP_REWARDS)) {
      return createErrorResponse(
        ErrorCodes.INVALID_INPUT,
        `Invalid event type. Valid types: ${Object.keys(XP_REWARDS).join(', ')}`
      )
    }

    // Get current gamification record
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const currentXP = gamification?.total_xp || 0
    const previousLevel = calculateLevel(currentXP)

    // Calculate XP to award
    const xpGain = body.bonusXP
      ? awardXP(currentXP, body.event, body.bonusXP)
      : awardXP(currentXP, body.event)

    // Prepare update data
    const updateData: Record<string, unknown> = {
      total_xp: xpGain.newTotal,
      current_level: calculateLevel(xpGain.newTotal),
    }

    // Update stat counters based on event type
    if (body.event === 'lesson_complete' || body.event === 'lesson_perfect') {
      updateData.total_lessons_completed = (gamification?.total_lessons_completed || 0) + 1
      // Check for perfect lesson
      if (body.metadata?.accuracy === 100 || body.event === 'lesson_perfect') {
        updateData.perfect_lessons = (gamification?.perfect_lessons || 0) + 1
      }
    } else if (
      body.event === 'card_reviewed' ||
      body.event === 'card_easy' ||
      body.event === 'card_good' ||
      body.event === 'card_hard'
    ) {
      updateData.total_cards_reviewed = (gamification?.total_cards_reviewed || 0) + 1
    } else if (body.event === 'first_course' || body.event === 'course_created') {
      updateData.total_courses_completed = (gamification?.total_courses_completed || 0) + 1
    }

    // Upsert gamification record
    if (gamification) {
      const { error: updateError } = await supabase
        .from('user_gamification')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) {
        logError('Gamification:xp:update', updateError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update XP')
      }
    } else {
      const { error: insertError } = await supabase.from('user_gamification').insert({
        user_id: user.id,
        ...updateData,
        current_streak: 0,
        longest_streak: 0,
        total_lessons_completed: updateData.total_lessons_completed || 0,
        total_courses_completed: updateData.total_courses_completed || 0,
        total_cards_reviewed: updateData.total_cards_reviewed || 0,
        perfect_lessons: updateData.perfect_lessons || 0,
      })

      if (insertError) {
        logError('Gamification:xp:insert', insertError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create gamification record')
      }
    }

    const response: AwardXPResponse = {
      success: true,
      xpAwarded: xpGain.amount,
      newTotal: xpGain.newTotal,
      levelUp: xpGain.leveledUp,
      previousLevel,
      ...(xpGain.leveledUp && {
        newLevel: xpGain.newLevel,
        newTitle: xpGain.newTitle,
      }),
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Gamification:xp:post', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to award XP')
  }
}

// =============================================================================
// GET /api/gamification/xp - Get XP info and rewards table
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view XP')
    }

    // Get current XP
    const { data: gamification } = await supabase
      .from('user_gamification')
      .select('total_xp, current_level')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      currentXP: gamification?.total_xp || 0,
      currentLevel: gamification?.current_level || 1,
      rewards: XP_REWARDS,
    })
  } catch (error) {
    logError('Gamification:xp:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch XP info')
  }
}
