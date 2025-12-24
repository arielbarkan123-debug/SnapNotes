import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCourseImage } from '@/lib/ai/image-generation'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, title } = body

    if (!courseId || !title) {
      return NextResponse.json(
        { error: 'Course ID and title are required' },
        { status: 400 }
      )
    }

    // Generate the cover image URL
    const result = await generateCourseImage(title)

    if (!result.success || !result.imageUrl) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate image' },
        { status: 500 }
      )
    }

    // Update course with cover image URL
    const { error: updateError } = await supabase
      .from('courses')
      .update({ cover_image_url: result.imageUrl })
      .eq('id', courseId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update course with cover image:', updateError)
      return NextResponse.json(
        { error: 'Failed to save cover image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
    })
  } catch (error) {
    console.error('Generate cover error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
