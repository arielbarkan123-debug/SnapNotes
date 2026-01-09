import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeHomework } from '@/lib/homework/checker-engine'
import type { CreateCheckRequest } from '@/lib/homework/types'

// Allow 2 minutes for homework analysis (vision AI + analysis)
export const maxDuration = 120

// ============================================================================
// POST - Create and analyze homework check
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    let body: CreateCheckRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.taskImageUrl || !body.answerImageUrl) {
      return NextResponse.json(
        { error: 'Task image and answer image are required' },
        { status: 400 }
      )
    }

    // Create initial check record
    const { data: check, error: insertError } = await supabase
      .from('homework_checks')
      .insert({
        user_id: user.id,
        task_image_url: body.taskImageUrl,
        answer_image_url: body.answerImageUrl,
        reference_image_urls: body.referenceImageUrls || [],
        teacher_review_urls: body.teacherReviewUrls || [],
        status: 'analyzing',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create homework check' },
        { status: 500 }
      )
    }

    // Analyze the homework
    console.log('[Homework Check] Starting analysis for check:', check.id)

    let result
    try {
      result = await analyzeHomework({
        taskImageUrl: body.taskImageUrl,
        answerImageUrl: body.answerImageUrl,
        referenceImageUrls: body.referenceImageUrls,
        teacherReviewUrls: body.teacherReviewUrls,
      })
      console.log('[Homework Check] Analysis completed, grade:', result.feedback?.gradeEstimate)
    } catch (analysisError) {
      console.error('[Homework Check] Analysis threw error:', analysisError)

      // Update check with error status
      await supabase
        .from('homework_checks')
        .update({ status: 'error' })
        .eq('id', check.id)
        .eq('user_id', user.id)

      // Return more specific error message
      const errorMessage = analysisError instanceof Error
        ? analysisError.message
        : 'Failed to analyze homework. Please try again.'

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Update check with results
    try {
      const { data: updatedCheck, error: updateError } = await supabase
        .from('homework_checks')
        .update({
          task_text: result.taskText,
          answer_text: result.answerText,
          subject: result.subject,
          topic: result.topic,
          feedback: result.feedback,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', check.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Homework Check] Update error:', updateError)
        // Mark as error so it doesn't stay stuck in 'analyzing'
        await supabase
          .from('homework_checks')
          .update({ status: 'error' })
          .eq('id', check.id)
          .eq('user_id', user.id)

        return NextResponse.json(
          { error: 'Failed to save analysis results. Please try again.' },
          { status: 500 }
        )
      }

      console.log('[Homework Check] Successfully saved check:', check.id)
      return NextResponse.json({ check: updatedCheck })
    } catch (saveError) {
      console.error('[Homework Check] Save threw error:', saveError)

      // Try to mark as error (ignore if this also fails)
      try {
        await supabase
          .from('homework_checks')
          .update({ status: 'error' })
          .eq('id', check.id)
          .eq('user_id', user.id)
      } catch {
        // Ignore secondary failure
      }

      return NextResponse.json(
        { error: 'Failed to save results. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Homework check error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Get user's homework checks
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: checks, error } = await supabase
      .from('homework_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch homework checks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ checks })
  } catch (error) {
    console.error('Get checks error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
