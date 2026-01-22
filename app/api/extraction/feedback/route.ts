/**
 * Extraction Feedback API
 *
 * POST: Submit feedback on extraction quality
 * GET: Get feedback for a course
 * PATCH: Update feedback status
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  recordExtractionFeedback,
  getExtractionFeedback,
  updateFeedbackStatus,
  generateQualityReport,
  type ExtractionFeedback,
} from '@/lib/extraction/confidence-scorer'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// =============================================================================
// GET: Fetch extraction feedback
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const action = searchParams.get('action') || 'list'

    if (!courseId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Course ID is required')
    }

    switch (action) {
      case 'list': {
        const status = searchParams.get('status') as ExtractionFeedback['status'] | null
        const feedback = await getExtractionFeedback(courseId, status || undefined)
        return NextResponse.json({ success: true, feedback })
      }

      case 'report': {
        const report = await generateQualityReport(courseId)
        if (!report) {
          return createErrorResponse(ErrorCodes.RECORD_NOT_FOUND, 'Could not generate report')
        }
        return NextResponse.json({ success: true, report })
      }

      default:
        return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Invalid action')
    }
  } catch (error) {
    console.error('Error in extraction feedback GET:', error)
    return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch extraction feedback')
  }
}

// =============================================================================
// POST: Submit extraction feedback
// =============================================================================

interface FeedbackPayload {
  courseId: string
  sectionIndex?: number
  stepIndex?: number
  contentType: 'text' | 'formula' | 'diagram' | 'structure' | 'other'
  feedbackType: 'incorrect' | 'unclear' | 'missing' | 'garbled' | 'wrong_order' | 'other'
  originalContent?: string
  userCorrection?: string
  additionalNotes?: string
}

const VALID_CONTENT_TYPES = ['text', 'formula', 'diagram', 'structure', 'other']
const VALID_FEEDBACK_TYPES = ['incorrect', 'unclear', 'missing', 'garbled', 'wrong_order', 'other']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: FeedbackPayload = await request.json()

    // Validate required fields
    if (!body.courseId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Course ID is required')
    }

    if (!body.contentType || !VALID_CONTENT_TYPES.includes(body.contentType)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
      )
    }

    if (!body.feedbackType || !VALID_FEEDBACK_TYPES.includes(body.feedbackType)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        `Invalid feedback type. Must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}`
      )
    }

    const result = await recordExtractionFeedback({
      courseId: body.courseId,
      userId: user.id,
      sectionIndex: body.sectionIndex,
      stepIndex: body.stepIndex,
      contentType: body.contentType,
      feedbackType: body.feedbackType,
      originalContent: body.originalContent,
      userCorrection: body.userCorrection,
      additionalNotes: body.additionalNotes,
    })

    if (!result.success) {
      return createErrorResponse(ErrorCodes.INSERT_FAILED, result.error || 'Failed to submit feedback')
    }

    return NextResponse.json({
      success: true,
      feedbackId: result.feedbackId,
    })
  } catch (error) {
    console.error('Error in extraction feedback POST:', error)
    return createErrorResponse(ErrorCodes.INSERT_FAILED, 'Failed to submit extraction feedback')
  }
}

// =============================================================================
// PATCH: Update feedback status
// =============================================================================

interface StatusUpdatePayload {
  feedbackId: string
  status: 'pending' | 'reviewed' | 'applied' | 'dismissed'
}

const VALID_STATUSES = ['pending', 'reviewed', 'applied', 'dismissed']

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: StatusUpdatePayload = await request.json()

    if (!body.feedbackId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Feedback ID is required')
    }

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      )
    }

    const result = await updateFeedbackStatus(body.feedbackId, body.status)

    if (!result.success) {
      return createErrorResponse(ErrorCodes.UPDATE_FAILED, result.error || 'Failed to update feedback')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in extraction feedback PATCH:', error)
    return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to update feedback status')
  }
}
