/**
 * Past Exam Template Analysis API
 * POST: Trigger or retry AI analysis of a past exam template
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeExamImage, getMediaTypeFromExtension } from '@/lib/past-exams'
import type { PastExamTemplate, PastExamAnalyzeResponse } from '@/types/past-exam'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Timeout for analysis (2 minutes)
const ANALYSIS_TIMEOUT_MS = 120000

/**
 * POST /api/past-exams/[id]/analyze
 * Trigger AI analysis of a past exam template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check if already analyzing
    if (template.analysis_status === 'analyzing') {
      return NextResponse.json(
        { success: false, error: 'Analysis already in progress' },
        { status: 409 }
      )
    }

    // Update status to analyzing
    await supabase
      .from('past_exam_templates')
      .update({ analysis_status: 'analyzing', analysis_error: null })
      .eq('id', id)

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), ANALYSIS_TIMEOUT_MS)
      })

      // Perform analysis based on file type
      let analysisPromise

      if (template.file_type === 'image') {
        // For images, download and analyze with vision API
        const response = await fetch(template.file_url)
        if (!response.ok) {
          throw new Error('Failed to fetch image file')
        }

        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const extension = template.original_filename.split('.').pop() || 'jpg'
        const mediaType = getMediaTypeFromExtension(extension)

        analysisPromise = analyzeExamImage(base64, mediaType)
      } else {
        // For documents, we need to extract text first
        // For now, use vision API on PDFs or extracted text
        if (template.file_type === 'pdf') {
          // Download PDF and use vision API (treating first page as image)
          // This is a simplified approach - could be enhanced with proper PDF processing
          const response = await fetch(template.file_url)
          if (!response.ok) {
            throw new Error('Failed to fetch PDF file')
          }

          // For PDF, we'll analyze via text extraction message
          // In a production app, you'd extract PDF pages as images
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')

          // Use vision API with PDF (Claude can read PDFs)
          analysisPromise = analyzeExamImage(base64, 'image/jpeg') // Claude handles various formats
        } else {
          // For PPTX/DOCX, would need document extraction
          // For now, return a placeholder message
          throw new Error('Document analysis for PPTX/DOCX requires text extraction. Please upload an image or PDF of the exam.')
        }
      }

      // Race between analysis and timeout
      const analysis = await Promise.race([analysisPromise, timeoutPromise])

      // Update template with analysis results
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('past_exam_templates')
        .update({
          analysis_status: 'completed',
          analyzed_at: new Date().toISOString(),
          extracted_analysis: analysis,
          analysis_error: null,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating template with analysis:', updateError)
        throw new Error('Failed to save analysis results')
      }

      const response: PastExamAnalyzeResponse = {
        success: true,
        template: updatedTemplate as PastExamTemplate,
        message: 'Analysis completed successfully',
      }

      return NextResponse.json(response)
    } catch (analysisError) {
      // Update status to failed
      const errorMessage = analysisError instanceof Error
        ? analysisError.message
        : 'Analysis failed'

      await supabase
        .from('past_exam_templates')
        .update({
          analysis_status: 'failed',
          analysis_error: errorMessage,
        })
        .eq('id', id)

      console.error('Analysis error:', analysisError)
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST /api/past-exams/[id]/analyze:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
