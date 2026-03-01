import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { extractYouTubeTranscript, parseVideoId } from '@/lib/youtube/transcript'
import { generateCourseFromVideo } from '@/lib/youtube/course-from-video'

export const maxDuration = 180

/**
 * POST /api/courses/from-youtube
 *
 * Generates a course from a YouTube video URL.
 * Uses SSE streaming for progress updates.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { youtubeUrl } = body as { youtubeUrl?: string }

    if (!youtubeUrl) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'YouTube URL is required')
    }

    const videoId = parseVideoId(youtubeUrl)
    if (!videoId) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid YouTube URL')
    }

    // SSE stream for progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Step 1: Extract transcript
          send('progress', { step: 'extracting', message: 'Extracting video transcript...' })
          const transcript = await extractYouTubeTranscript(youtubeUrl)

          send('progress', {
            step: 'extracted',
            message: `Transcript extracted: "${transcript.title}" (${Math.round(transcript.duration / 60)} min)`,
            title: transcript.title,
            duration: transcript.duration,
          })

          // Step 2: Generate course
          send('progress', { step: 'generating', message: 'Generating course from transcript...' })
          const course = await generateCourseFromVideo(
            transcript.transcript,
            transcript.title,
            transcript.duration,
          )

          send('progress', { step: 'saving', message: 'Saving course...' })

          // Step 3: Save to database
          const courseData = {
            user_id: user.id,
            title: `${course.thumbnailEmoji} ${course.title}`,
            source_type: 'youtube',
            source_url: youtubeUrl,
            generated_course: {
              title: course.title,
              titleHe: course.titleHe,
              description: course.description,
              descriptionHe: course.descriptionHe,
              subject: course.subject,
              lessons: course.lessons.map((lesson, idx) => ({
                id: `lesson-${idx}`,
                title: lesson.title,
                titleHe: lesson.titleHe,
                content: lesson.content,
                contentHe: lesson.contentHe,
                summary: lesson.summary,
                summaryHe: lesson.summaryHe,
                practiceQuestions: lesson.practiceQuestions,
                order: idx,
              })),
            },
          }

          const { data: savedCourse, error: saveError } = await supabase
            .from('courses')
            .insert(courseData)
            .select('id')
            .single()

          if (saveError) {
            send('error', { message: 'Failed to save course' })
            controller.close()
            return
          }

          // Step 4: Complete
          send('complete', {
            courseId: savedCourse.id,
            title: course.title,
            lessonsCount: course.lessons.length,
          })

          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          send('error', { message })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[YouTube] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process YouTube video'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
