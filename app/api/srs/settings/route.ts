import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import type { UserSRSSettings } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface UpdateSettingsRequest {
  target_retention?: number
  max_new_cards_per_day?: number
  max_reviews_per_day?: number
  interleave_reviews?: boolean
}

// =============================================================================
// Default Settings
// =============================================================================

const DEFAULT_SETTINGS = {
  target_retention: 0.9,
  max_new_cards_per_day: 20,
  max_reviews_per_day: 100,
  interleave_reviews: true,
}

// =============================================================================
// GET /api/srs/settings - Get user's SRS settings
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view settings')
    }

    // Try to get existing settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_srs_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no settings exist, create default settings
    if (settingsError || !settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('user_srs_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
        .select()
        .single()

      if (createError) {
        logError('SRS:settings:create', createError)
        // Return defaults without persisting if creation fails
        return NextResponse.json({
          id: null,
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
      }

      return NextResponse.json(newSettings)
    }

    return NextResponse.json(settings)

  } catch (error) {
    logError('SRS:settings:get:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch settings')
  }
}

// =============================================================================
// PATCH /api/srs/settings - Update user's SRS settings
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to update settings')
    }

    // Parse request body
    let body: UpdateSettingsRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    // Validate values
    const updateData: Partial<UserSRSSettings> = {}

    if (body.target_retention !== undefined) {
      const retention = body.target_retention
      if (retention < 0.5 || retention > 0.99) {
        return createErrorResponse(
          ErrorCodes.INVALID_INPUT,
          'target_retention must be between 0.5 and 0.99'
        )
      }
      updateData.target_retention = retention
    }

    if (body.max_new_cards_per_day !== undefined) {
      const maxNew = body.max_new_cards_per_day
      if (maxNew < 0 || maxNew > 500) {
        return createErrorResponse(
          ErrorCodes.INVALID_INPUT,
          'max_new_cards_per_day must be between 0 and 500'
        )
      }
      updateData.max_new_cards_per_day = maxNew
    }

    if (body.max_reviews_per_day !== undefined) {
      const maxReviews = body.max_reviews_per_day
      if (maxReviews < 0 || maxReviews > 1000) {
        return createErrorResponse(
          ErrorCodes.INVALID_INPUT,
          'max_reviews_per_day must be between 0 and 1000'
        )
      }
      updateData.max_reviews_per_day = maxReviews
    }

    if (body.interleave_reviews !== undefined) {
      if (typeof body.interleave_reviews !== 'boolean') {
        return createErrorResponse(
          ErrorCodes.INVALID_INPUT,
          'interleave_reviews must be a boolean'
        )
      }
      updateData.interleave_reviews = body.interleave_reviews
    }

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'No valid fields to update')
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_srs_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let settings: UserSRSSettings

    if (existing) {
      // Update existing settings
      const { data: updated, error: updateError } = await supabase
        .from('user_srs_settings')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError || !updated) {
        logError('SRS:settings:update', updateError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update settings')
      }

      settings = updated
    } else {
      // Create new settings with defaults + updates
      const { data: created, error: createError } = await supabase
        .from('user_srs_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
          ...updateData,
        })
        .select()
        .single()

      if (createError || !created) {
        logError('SRS:settings:create', createError)
        return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create settings')
      }

      settings = created
    }

    return NextResponse.json({
      success: true,
      settings,
    })

  } catch (error) {
    logError('SRS:settings:patch:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update settings')
  }
}
