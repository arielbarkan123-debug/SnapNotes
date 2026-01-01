/**
 * Homework Session API
 * POST - Create a new homework help session
 * GET - List user's sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createSession,
  getUserSessions,
  analyzeQuestion,
  analyzeReferences,
  generateInitialGreeting,
  addMessage,
  type CreateSessionRequest,
  type QuestionAnalysis,
  type ReferenceAnalysis,
  type TutorContext,
} from '@/lib/homework'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { questionImageUrl, referenceImageUrls, initialAttempt } =
      body as CreateSessionRequest

    if (!questionImageUrl) {
      return NextResponse.json(
        { error: 'Question image URL is required' },
        { status: 400 }
      )
    }

    // Validate reference images limit (max 10)
    if (referenceImageUrls && referenceImageUrls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 reference images allowed' },
        { status: 400 }
      )
    }

    // Analyze the question using Claude Vision
    let questionAnalysis: QuestionAnalysis
    try {
      questionAnalysis = await analyzeQuestion(questionImageUrl)
    } catch (error) {
      console.error('Question analysis error:', error)
      return NextResponse.json(
        {
          error:
            'Failed to analyze question. Please ensure the image is clear and readable.',
        },
        { status: 400 }
      )
    }

    // Analyze reference materials if provided
    let referenceAnalysis: ReferenceAnalysis | undefined
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      try {
        referenceAnalysis = await analyzeReferences(
          referenceImageUrls,
          questionAnalysis
        )
      } catch (error) {
        console.error('Reference analysis error:', error)
        // Continue without reference analysis - it's optional
      }
    }

    // Create the session
    const session = await createSession(
      user.id,
      { questionImageUrl, referenceImageUrls, initialAttempt },
      questionAnalysis,
      referenceAnalysis
    )

    // Generate initial greeting
    const tutorContext: TutorContext = {
      session,
      questionAnalysis,
      referenceAnalysis,
      recentMessages: [],
      hintsUsed: 0,
      currentProgress: 0,
    }

    const greeting = await generateInitialGreeting(tutorContext)

    // Add greeting to conversation
    const updatedSession = await addMessage(session.id, user.id, {
      role: 'tutor',
      content: greeting.message,
      timestamp: new Date().toISOString(),
      pedagogicalIntent: greeting.pedagogicalIntent,
    })

    return NextResponse.json({
      session: updatedSession,
      analysis: questionAnalysis,
      referenceAnalysis,
    })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Failed to create homework session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'active' | 'completed' | 'abandoned' | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get sessions
    const sessions = await getUserSessions(user.id, {
      status: status || undefined,
      limit,
      offset,
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    )
  }
}
