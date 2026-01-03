import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeHomework } from '@/lib/homework/checker-engine'
import type { CreateCheckRequest } from '@/lib/homework/types'

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
    const body: CreateCheckRequest = await request.json()

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
    try {
      const result = await analyzeHomework({
        taskImageUrl: body.taskImageUrl,
        answerImageUrl: body.answerImageUrl,
        referenceImageUrls: body.referenceImageUrls,
        teacherReviewUrls: body.teacherReviewUrls,
      })

      // Update check with results
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
        console.error('Update error:', updateError)
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

      return NextResponse.json({ check: updatedCheck })
    } catch (analysisError) {
      console.error('Analysis error:', analysisError)

      // Update check with error status so it doesn't stay stuck in 'analyzing'
      await supabase
        .from('homework_checks')
        .update({ status: 'error' })
        .eq('id', check.id)
        .eq('user_id', user.id)

      return NextResponse.json(
        { error: 'Failed to analyze homework. Please try again.' },
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
