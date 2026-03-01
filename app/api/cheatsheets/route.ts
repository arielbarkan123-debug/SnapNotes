import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { generateCheatsheet } from '@/lib/cheatsheet/generator'

export const maxDuration = 120

// GET: List user's cheatsheets
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: cheatsheets, error } = await supabase
      .from('cheatsheets')
      .select('id, title, title_he, course_id, exam_mode, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Cheatsheets] List error:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch cheatsheets')
    }

    return NextResponse.json({
      success: true,
      cheatsheets: cheatsheets || [],
    })
  } catch (error) {
    console.error('[Cheatsheets] Error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list cheatsheets')
  }
}

// POST: Generate cheatsheet from course
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { courseId, examMode } = body as { courseId?: string; examMode?: boolean }

    if (!courseId) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'courseId is required')
    }

    // Fetch course content
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Course not found')
    }

    const generatedCourse = course.generated_course as Record<string, unknown> | null
    const lessons = (generatedCourse?.lessons as Array<Record<string, unknown>>) || []

    if (lessons.length === 0) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Course has no lessons')
    }

    // Extract lesson content
    const lessonContents = lessons.map(l => ({
      title: (l.title as string) || '',
      content: (l.content as string) || (l.summary as string) || '',
    }))

    // Generate cheatsheet
    const cheatsheet = await generateCheatsheet(course.title, lessonContents)

    // Filter for exam mode if needed
    let blocks = cheatsheet.blocks
    if (examMode) {
      blocks = blocks.filter(b => b.type !== 'example')
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('cheatsheets')
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: cheatsheet.title,
        title_he: cheatsheet.titleHe,
        blocks,
        exam_mode: examMode || false,
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('[Cheatsheets] Save error:', saveError)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to save cheatsheet')
    }

    return NextResponse.json({
      success: true,
      cheatsheetId: saved.id,
      cheatsheet: {
        ...cheatsheet,
        blocks,
      },
    })
  } catch (error) {
    console.error('[Cheatsheets] Generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate cheatsheet'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
