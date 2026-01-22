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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const action = searchParams.get('action') || 'list'

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
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
          return NextResponse.json({ error: 'Could not generate report' }, { status: 404 })
        }
        return NextResponse.json({ success: true, report })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in extraction feedback GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch extraction feedback' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: FeedbackPayload = await request.json()

    // Validate required fields
    if (!body.courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    if (!body.contentType || !VALID_CONTENT_TYPES.includes(body.contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.feedbackType || !VALID_FEEDBACK_TYPES.includes(body.feedbackType)) {
      return NextResponse.json(
        { error: `Invalid feedback type. Must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}` },
        { status: 400 }
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
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedbackId: result.feedbackId,
    })
  } catch (error) {
    console.error('Error in extraction feedback POST:', error)
    return NextResponse.json(
      { error: 'Failed to submit extraction feedback' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StatusUpdatePayload = await request.json()

    if (!body.feedbackId) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 })
    }

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await updateFeedbackStatus(body.feedbackId, body.status)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in extraction feedback PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback status' },
      { status: 500 }
    )
  }
}
