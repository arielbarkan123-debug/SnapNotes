/**
 * Past Exam Template API - Single Template Operations
 * GET: Get a single template by ID
 * DELETE: Delete a template
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PastExamTemplate } from '@/types/past-exam'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/past-exams/[id]
 * Get a single past exam template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch template
    const { data: template, error: fetchError } = await supabase
      .from('past_exam_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      template: template as PastExamTemplate,
    })
  } catch (error) {
    console.error('Error in GET /api/past-exams/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/past-exams/[id]
 * Delete a past exam template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, get the template to find the file path
    const { data: template, error: fetchError } = await supabase
      .from('past_exam_templates')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Extract storage path from URL
    // URL format: https://.../storage/v1/object/sign/past-exams/user_id/filename?token=...
    try {
      const url = new URL(template.file_url)
      const pathMatch = url.pathname.match(/\/past-exams\/(.+)$/)
      if (pathMatch) {
        const storagePath = pathMatch[1]
        // Delete file from storage (ignore errors - file might not exist)
        await supabase.storage.from('past-exams').remove([storagePath])
      }
    } catch {
      // Ignore URL parsing errors
      console.warn('Could not extract storage path from URL:', template.file_url)
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('past_exam_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/past-exams/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
