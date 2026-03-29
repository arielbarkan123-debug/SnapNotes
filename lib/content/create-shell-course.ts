/**
 * Create Shell Course
 *
 * Creates a minimal course record with NO AI call.
 * Used by "from-content" flows (exams, SRS cards) that need a course
 * record to anchor generated artefacts to, but the user only provided
 * raw text/images/document — not a full course generation request.
 */

import { type GeneratedCourse, type CourseInsert } from '@/types'
import { createLogger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

const log = createLogger('lib:create-shell-course')

export async function createShellCourse(params: {
  supabase: SupabaseClient
  userId: string
  title: string
  content: string
  sourceType: 'text' | 'image' | 'pptx' | 'docx'
  imageUrls?: string[]
  documentUrl?: string
  language: 'en' | 'he'
}): Promise<{ courseId: string; generatedCourse: GeneratedCourse }> {
  const { supabase, userId, title, content, sourceType, imageUrls, documentUrl, language } = params

  // Build a minimal GeneratedCourse — single lesson wrapping the raw content
  const generatedCourse: GeneratedCourse = {
    title,
    overview: '',
    lessons: [
      {
        title,
        steps: [
          {
            type: 'explanation' as const,
            content,
          },
        ],
      },
    ],
  }

  const courseData: CourseInsert = {
    user_id: userId,
    title,
    generated_course: generatedCourse,
    extracted_content: content.slice(0, 50_000),
    source_type: sourceType,
    original_image_url: imageUrls?.[0] || null,
    image_urls: imageUrls || null,
    document_url: documentUrl || null,
    generation_status: 'complete',
    content_language: language,
    lessons_ready: 1,
    total_lessons: 1,
  }

  log.info({ title, sourceType, contentLength: content.length }, 'Creating shell course')

  const { data: course, error: dbError } = await supabase
    .from('courses')
    .insert(courseData)
    .select('id')
    .single()

  if (dbError || !course) {
    log.error({ err: dbError }, 'Failed to insert shell course')
    throw new Error(`Failed to create shell course: ${dbError?.message || 'unknown error'}`)
  }

  log.info({ courseId: course.id }, 'Shell course created')

  return { courseId: course.id, generatedCourse }
}
