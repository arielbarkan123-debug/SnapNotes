import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateGuide } from '@/lib/prepare/guide-generator'
import { searchMultipleQueries } from '@/lib/prepare/youtube-search'
import type { PrepareGuideInsert, GuideYouTubeVideo } from '@/types/prepare'

export const maxDuration = 120

interface GenerateRequest {
  content: string
  sourceType?: 'image' | 'pdf' | 'pptx' | 'docx' | 'text'
  imageUrls?: string[]
  documentUrl?: string
  language?: 'en' | 'he'
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Safari/iOS detection for aggressive heartbeat
  const userAgent = request.headers.get('user-agent') || ''
  const isSafari =
    userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium')
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const heartbeatFrequency = isSafari || isIOS ? 3000 : 10000

  let streamClosed = false
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (streamClosed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          streamClosed = true
        }
      }

      function startHeartbeat() {
        heartbeatInterval = setInterval(() => {
          if (!streamClosed) {
            send('heartbeat', { timestamp: Date.now() })
          }
        }, heartbeatFrequency)
      }

      function stopHeartbeat() {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
      }

      try {
        const supabase = await createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          send('error', { message: 'Please log in' })
          controller.close()
          return
        }

        let body: GenerateRequest
        try {
          body = await request.json()
        } catch {
          send('error', { message: 'Invalid request body' })
          controller.close()
          return
        }

        const { content, sourceType, imageUrls, documentUrl, language } = body

        // For image-based generation, content can be minimal
        if (!imageUrls?.length && (!content || content.trim().length < 20)) {
          send('error', { message: 'Content too short. Please provide more material.' })
          controller.close()
          return
        }

        // Start heartbeat to keep connection alive
        startHeartbeat()

        // Fetch user learning context
        let learningContext = undefined
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select(
              'education_level, study_system, study_goal, learning_styles, subjects, subject_levels'
            )
            .eq('user_id', user.id)
            .single()

          if (profile) {
            learningContext = {
              educationLevel: profile.education_level || 'high_school',
              studySystem: profile.study_system || 'general',
              studyGoal: profile.study_goal || 'exam_prep',
              learningStyles: profile.learning_styles || [],
              subjects: profile.subjects,
              subjectLevels: profile.subject_levels,
              language,
            }
          }
        } catch {
          // Continue without learning context
        }

        // Create initial guide record
        send('status', { stage: 'processing', message: 'Analyzing content...' })

        const initialInsert: PrepareGuideInsert = {
          user_id: user.id,
          title: 'Generating...',
          extracted_content: content.slice(0, 50000),
          source_type: sourceType || 'text',
          image_urls: imageUrls || null,
          document_url: documentUrl || null,
          generated_guide: {
            title: '',
            subtitle: '',
            subject: '',
            estimatedReadingTime: 0,
            generatedAt: '',
            topics: [],
          },
          generation_status: 'generating',
        }

        const { data: guideRecord, error: insertError } = await supabase
          .from('prepare_guides')
          .insert(initialInsert)
          .select('id')
          .single()

        if (insertError || !guideRecord) {
          stopHeartbeat()
          send('error', { message: 'Failed to create guide record' })
          controller.close()
          return
        }

        const guideId = guideRecord.id
        send('status', { stage: 'generating', guideId, message: 'Generating study guide...' })

        // Generate the guide (with retry and JSON repair)
        const guide = await generateGuide({
          content,
          imageUrls,
          learningContext,
          language,
        })

        send('status', { stage: 'videos', message: 'Searching for educational videos...' })

        // Search for YouTube videos
        let youtubeVideos: GuideYouTubeVideo[] = []
        if (guide.youtubeSearchQueries?.length) {
          youtubeVideos = await searchMultipleQueries(guide.youtubeSearchQueries)

          // Distribute videos into relevant sections
          if (youtubeVideos.length > 0) {
            let videoIndex = 0
            for (const topic of guide.topics) {
              for (const section of topic.sections) {
                if (
                  (section.type === 'theory' || section.type === 'overview') &&
                  videoIndex < youtubeVideos.length
                ) {
                  section.videos = [youtubeVideos[videoIndex]]
                  videoIndex++
                }
              }
            }
          }
        }

        // Update guide record with generated content
        const { error: updateError } = await supabase
          .from('prepare_guides')
          .update({
            title: guide.title,
            subtitle: guide.subtitle,
            subject: guide.subject,
            generated_guide: guide,
            generation_status: 'complete',
            youtube_videos: youtubeVideos.length > 0 ? youtubeVideos : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', guideId)

        if (updateError) {
          console.error('[Prepare] Failed to update guide:', updateError)
          await supabase
            .from('prepare_guides')
            .update({ generation_status: 'failed' })
            .eq('id', guideId)
          stopHeartbeat()
          send('error', { message: 'Failed to save guide' })
          controller.close()
          return
        }

        stopHeartbeat()
        send('complete', {
          guideId,
          title: guide.title,
          topicCount: guide.topics.length,
          hasVideos: youtubeVideos.length > 0,
        })
      } catch (error) {
        console.error('[Prepare] Generation error:', error)
        send('error', {
          message: error instanceof Error ? error.message : 'Failed to generate study guide',
        })
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        streamClosed = true
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      streamClosed = true
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
