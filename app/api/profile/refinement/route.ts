/**
 * Profile Refinement API
 *
 * Endpoints for dynamic profile refinement system (RLPA-style).
 *
 * GET: Fetch current refinement state and effective profile
 * POST: Process a learning signal
 * PUT: Update refinement settings (locks, sync)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type QuestionSignal,
  type SessionSignal,
  type SelfAssessmentSignal,
  getRefinementState,
  initializeRefinementState,
  processLearningSignal,
  getProfileHistory,
  rollbackProfile,
} from '@/lib/profile'
import {
  getUserProfile,
  calculateEffectiveProfile,
  syncRefinementToProfile,
  lockAttribute,
  unlockAttribute,
  getLockedAttributes,
} from '@/lib/profile/profile-sync'

// =============================================================================
// GET: Fetch refinement state and effective profile
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10', 10)

    // Fetch profile and refinement state
    const [profile, refinementState, lockedAttrs] = await Promise.all([
      getUserProfile(user.id),
      getRefinementState(user.id),
      getLockedAttributes(user.id),
    ])

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Calculate effective profile
    const effectiveProfile = calculateEffectiveProfile(profile, refinementState)

    // Optionally fetch history
    let history = null
    if (includeHistory) {
      history = await getProfileHistory(user.id, historyLimit)
    }

    return NextResponse.json({
      success: true,
      data: {
        effectiveProfile,
        refinementState,
        lockedAttributes: lockedAttrs,
        isRefinementEnabled: refinementState !== null,
        dataPointsAnalyzed: refinementState?.totalQuestionsAnalyzed || 0,
        ...(history && { history }),
      },
    })
  } catch (error) {
    console.error('Error fetching refinement state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refinement state' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST: Process a learning signal
// =============================================================================

interface SignalPayload {
  type: 'question_answered' | 'session_ended' | 'self_assessment' | 'initialize'
  data?: QuestionSignal | SessionSignal | SelfAssessmentSignal
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SignalPayload = await request.json()

    // Handle initialization request
    if (body.type === 'initialize') {
      await initializeRefinementState(user.id)
      return NextResponse.json({
        success: true,
        message: 'Refinement state initialized',
      })
    }

    // Validate signal data
    if (!body.data) {
      return NextResponse.json(
        { error: 'Signal data is required' },
        { status: 400 }
      )
    }

    // Process the signal - construct properly typed signal object
    let updates: Awaited<ReturnType<typeof processLearningSignal>>

    switch (body.type) {
      case 'question_answered':
        updates = await processLearningSignal(user.id, {
          type: 'question_answered',
          data: body.data as QuestionSignal,
        })
        break
      case 'session_ended':
        updates = await processLearningSignal(user.id, {
          type: 'session_ended',
          data: body.data as SessionSignal,
        })
        break
      case 'self_assessment':
        updates = await processLearningSignal(user.id, {
          type: 'self_assessment',
          data: body.data as SelfAssessmentSignal,
        })
        break
      default:
        return NextResponse.json(
          { error: 'Invalid signal type' },
          { status: 400 }
        )
    }

    // Get updated state
    const refinementState = await getRefinementState(user.id)

    return NextResponse.json({
      success: true,
      updatesApplied: updates.length,
      updates,
      refinementState: refinementState
        ? {
            rollingAccuracy: refinementState.rollingAccuracy,
            estimatedAbility: refinementState.estimatedAbility,
            currentDifficultyTarget: refinementState.currentDifficultyTarget,
            totalQuestionsAnalyzed: refinementState.totalQuestionsAnalyzed,
          }
        : null,
    })
  } catch (error) {
    console.error('Error processing signal:', error)
    return NextResponse.json(
      { error: 'Failed to process signal' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT: Update refinement settings
// =============================================================================

interface SettingsPayload {
  action: 'lock' | 'unlock' | 'sync' | 'rollback'
  attribute?: string
  snapshotId?: string
  syncOptions?: {
    force?: boolean
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SettingsPayload = await request.json()

    switch (body.action) {
      case 'lock': {
        if (!body.attribute) {
          return NextResponse.json(
            { error: 'Attribute is required for lock action' },
            { status: 400 }
          )
        }
        const success = await lockAttribute(user.id, body.attribute)
        return NextResponse.json({ success, action: 'lock', attribute: body.attribute })
      }

      case 'unlock': {
        if (!body.attribute) {
          return NextResponse.json(
            { error: 'Attribute is required for unlock action' },
            { status: 400 }
          )
        }
        const success = await unlockAttribute(user.id, body.attribute)
        return NextResponse.json({ success, action: 'unlock', attribute: body.attribute })
      }

      case 'sync': {
        const refinementState = await getRefinementState(user.id)
        if (!refinementState) {
          return NextResponse.json(
            { error: 'No refinement state to sync' },
            { status: 400 }
          )
        }
        const result = await syncRefinementToProfile(
          user.id,
          refinementState,
          body.syncOptions || {}
        )
        return NextResponse.json(result)
      }

      case 'rollback': {
        if (!body.snapshotId) {
          return NextResponse.json(
            { error: 'Snapshot ID is required for rollback action' },
            { status: 400 }
          )
        }
        const success = await rollbackProfile(user.id, body.snapshotId)
        return NextResponse.json({ success, action: 'rollback', snapshotId: body.snapshotId })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating refinement settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
