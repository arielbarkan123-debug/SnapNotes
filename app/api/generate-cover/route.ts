import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCourseImage } from '@/lib/ai/image-generation'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { courseId, title } = body

    if (!courseId || !title) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Course ID and title are required')
    }

    // Generate the cover image URL
    const result = await generateCourseImage(title)

    if (!result.success || !result.imageUrl) {
      return createErrorResponse(ErrorCodes.AI_UNKNOWN, result.error || 'Failed to generate image')
    }

    // Update course with cover image URL
    const { error: updateError } = await supabase
      .from('courses')
      .update({ cover_image_url: result.imageUrl })
      .eq('id', courseId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update course with cover image:', updateError)
      return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to save cover image')
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
    })
  } catch (error) {
    console.error('Generate cover error:', error)
    return createErrorResponse(ErrorCodes.AI_UNKNOWN)
  }
}
