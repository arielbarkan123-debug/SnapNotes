/**
 * POST /api/cheatsheets/from-content
 *
 * Generates a cheatsheet directly from raw content (text / images / document).
 * 1. Creates a lightweight shell course to anchor the cheatsheet.
 * 2. Extracts lesson contents from the shell course.
 * 3. Calls generateCheatsheet to produce structured blocks.
 * 4. Inserts the cheatsheet into the database.
 *
 * Non-streaming — returns a JSON response.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createShellCourse } from '@/lib/content/create-shell-course'
import { generateCheatsheet } from '@/lib/cheatsheet/generator'
import { getContentLanguage } from '@/lib/ai/language'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cheatsheets-from-content')

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse body ─────────────────────────────────────────────────
    let body: {
      textContent?: string
      imageUrls?: string[]
      documentUrl?: string
      fileType?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { textContent, imageUrls, documentUrl } = body

    // ── 3. Validate ───────────────────────────────────────────────────
    if (!textContent && !imageUrls?.length && !documentUrl) {
      return NextResponse.json(
        { error: 'Provide textContent, imageUrls, or documentUrl' },
        { status: 400 },
      )
    }

    const content = textContent || ''
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'No text content provided. Extract text from your source first.' },
        { status: 400 },
      )
    }

    // ── 4. Resolve language ───────────────────────────────────────────
    const language = await getContentLanguage(supabase, user.id)

    // ── 5. Auto-detect title ──────────────────────────────────────────
    const firstLine = content.split('\n').find(l => l.trim())?.trim() || 'Untitled'
    const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine

    // ── 6. Determine source type ──────────────────────────────────────
    const sourceType = body.fileType === 'pptx' ? 'pptx' as const
      : body.fileType === 'docx' ? 'docx' as const
      : imageUrls?.length ? 'image' as const
      : 'text' as const

    // ── 7. Create shell course ────────────────────────────────────────
    let courseId: string
    let generatedCourse
    try {
      const result = await createShellCourse({
        supabase,
        userId: user.id,
        title,
        content,
        sourceType,
        imageUrls,
        documentUrl,
        language,
      })
      courseId = result.courseId
      generatedCourse = result.generatedCourse
    } catch (err) {
      log.error({ err }, 'Shell course creation failed')
      return NextResponse.json({ error: 'Failed to create course record' }, { status: 500 })
    }

    // ── 8. Extract lesson contents & generate cheatsheet ─────────────
    const lessonContents = generatedCourse.lessons.map(lesson => ({
      title: lesson.title || '',
      content: lesson.steps.map(s => s.content).join('\n\n'),
    }))

    const cheatsheet = await generateCheatsheet(title, lessonContents)

    // ── 9. Save to database (service client to bypass RLS) ───────────
    const serviceClient = createServiceClient()
    const { data: saved, error: saveError } = await serviceClient
      .from('cheatsheets')
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: cheatsheet.title,
        title_he: cheatsheet.titleHe,
        blocks: cheatsheet.blocks,
        exam_mode: false,
      })
      .select('id')
      .single()

    if (saveError || !saved) {
      log.error({ err: saveError }, 'Cheatsheet save error')
      return NextResponse.json({ error: 'Failed to save cheatsheet' }, { status: 500 })
    }

    // ── 10. Return ───────────────────────────────────────────────────
    log.info({ courseId, cheatsheetId: saved.id }, 'Cheatsheet from content created')

    return NextResponse.json({
      success: true,
      cheatsheetId: saved.id,
      courseId,
    })
  } catch (error) {
    log.error({ err: error }, 'Cheatsheet from content error')
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
