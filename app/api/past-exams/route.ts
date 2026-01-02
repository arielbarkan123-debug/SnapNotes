/**
 * Past Exam Templates API
 * GET: List user's past exam templates
 * POST: Upload a new past exam template
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PastExamTemplate, PastExamTemplatesResponse, PastExamUploadResponse, PastExamFileType } from '@/types/past-exam'

const MAX_TEMPLATES = 3
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB

// Allowed MIME types
const ALLOWED_MIME_TYPES: Record<string, PastExamFileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
}

/**
 * GET /api/past-exams
 * List all past exam templates for the authenticated user
 */
export async function GET() {
  try {
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

    // Fetch templates
    const { data: templates, error: fetchError } = await supabase
      .from('past_exam_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching past exam templates:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    const response: PastExamTemplatesResponse = {
      success: true,
      templates: templates as PastExamTemplate[],
      count: templates?.length || 0,
      limit: MAX_TEMPLATES,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/past-exams:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/past-exams
 * Upload a new past exam template
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check template limit
    const { count, error: countError } = await supabase
      .from('past_exam_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting templates:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to check template limit' },
        { status: 500 }
      )
    }

    if ((count || 0) >= MAX_TEMPLATES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_TEMPLATES} templates allowed` },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const description = (formData.get('description') as string) || null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileType = ALLOWED_MIME_TYPES[file.type]
    if (!fileType) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: images, PDF, PowerPoint, Word' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 20MB allowed' },
        { status: 400 }
      )
    }

    // Generate storage path
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'bin'
    const storagePath = `${user.id}/${timestamp}-${randomId}.${extension}`

    // Upload file to Supabase storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('past-exams')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from('past-exams')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

    if (urlError || !urlData?.signedUrl) {
      console.error('Error getting signed URL:', urlError)
      // Clean up uploaded file
      await supabase.storage.from('past-exams').remove([storagePath])
      return NextResponse.json(
        { success: false, error: 'Failed to generate file URL' },
        { status: 500 }
      )
    }

    // Create database record
    const templateData = {
      user_id: user.id,
      title: title || file.name,
      description,
      file_url: urlData.signedUrl,
      file_type: fileType,
      original_filename: file.name,
      file_size_bytes: file.size,
      analysis_status: 'pending' as const,
    }

    const { data: template, error: insertError } = await supabase
      .from('past_exam_templates')
      .insert(templateData)
      .select()
      .single()

    if (insertError || !template) {
      console.error('Error creating template record:', insertError)
      // Clean up uploaded file
      await supabase.storage.from('past-exams').remove([storagePath])
      return NextResponse.json(
        { success: false, error: 'Failed to create template record' },
        { status: 500 }
      )
    }

    const response: PastExamUploadResponse = {
      success: true,
      template: template as PastExamTemplate,
      message: 'Template uploaded successfully. Analysis will start shortly.',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/past-exams:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
