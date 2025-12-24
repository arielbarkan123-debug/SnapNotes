import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCourseImage } from '@/lib/ai/image-generation'

export const maxDuration = 300 // 5 minutes for multiple images

/**
 * Generate cover images for all courses that don't have one
 * POST /api/generate-all-covers
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all courses without cover images
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('user_id', user.id)
      .is('cover_image_url', null)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All courses already have cover images',
        updated: 0
      })
    }

    let updated = 0
    const errors: string[] = []

    // Generate cover images for each course
    for (const course of courses) {
      try {
        console.log(`[GenerateAllCovers] Generating cover for: ${course.title}`)
        const result = await generateCourseImage(course.title)

        if (!result.success) {
          errors.push(`${course.title}: ${result.error}`)
          continue
        }

        let coverUrl: string

        // If we got base64 image data, upload to Supabase storage
        if (result.imageBase64) {
          const imageBuffer = Buffer.from(result.imageBase64, 'base64')
          const fileName = `covers/${user.id}/${course.id}-cover.png`

          const { error: uploadError } = await supabase.storage
            .from('course-images')
            .upload(fileName, imageBuffer, {
              contentType: result.mimeType || 'image/png',
              upsert: true,
            })

          if (uploadError) {
            console.error(`[GenerateAllCovers] Upload failed for ${course.title}:`, uploadError)
            // Use data URL as fallback
            coverUrl = `data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`
          } else {
            // Get public URL from storage
            const { data: { publicUrl } } = supabase.storage
              .from('course-images')
              .getPublicUrl(fileName)
            coverUrl = publicUrl
          }
        } else if (result.imageUrl) {
          coverUrl = result.imageUrl
        } else {
          errors.push(`${course.title}: No image data returned`)
          continue
        }

        // Update course with cover URL
        const { error: updateError } = await supabase
          .from('courses')
          .update({ cover_image_url: coverUrl })
          .eq('id', course.id)
          .eq('user_id', user.id)

        if (!updateError) {
          updated++
          console.log(`[GenerateAllCovers] Updated cover for: ${course.title}`)
        } else {
          errors.push(`${course.title}: Failed to update database`)
        }
      } catch (err) {
        errors.push(`${course.title}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${updated} cover images`,
      updated,
      total: courses.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Generate all covers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
