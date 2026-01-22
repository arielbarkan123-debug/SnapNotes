import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import { processDocument, type ExtractedDocument } from '@/lib/documents'
import { ErrorCodes, createErrorResponse, logError } from '@/lib/api/errors'

// Allow 3 minutes for document processing (PPTX/DOCX extraction is CPU-intensive)
// Increased to handle slower mobile network connections
export const maxDuration = 180

// ============================================================================
// Types
// ============================================================================

interface ProcessDocumentRequest {
  storagePath: string
  fileName: string
  fileType: 'image' | 'pptx' | 'docx'
  bucket?: string  // Optional: defaults to 'documents', can be 'notebook-images' for homework checker
}

interface ProcessDocumentSuccessResponse {
  success: true
  type: 'image' | 'document'
  imageUrl?: string
  extractedContent?: ExtractedDocument
  storagePath: string
  documentType?: 'pptx' | 'docx'
}

// ============================================================================
// MIME type mapping for processing
// ============================================================================

const FILE_TYPE_TO_MIME: Record<string, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

// ============================================================================
// POST - Process document from storage
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to process documents')
    }

    // 2. Parse request body
    let body: ProcessDocumentRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { storagePath, fileName, fileType, bucket = 'documents' } = body

    // 3. Validate required fields
    if (!storagePath || !fileName || !fileType) {
      return createErrorResponse(
        ErrorCodes.MISSING_FIELD,
        'Missing required fields: storagePath, fileName, fileType'
      )
    }

    // Validate bucket name (only allow specific buckets)
    const allowedBuckets = ['documents', 'notebook-images']
    if (!allowedBuckets.includes(bucket)) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid bucket name')
    }

    // 4. SECURITY: Verify path belongs to this user
    // Path format: {userId}/{timestamp}-{random}-{filename}
    if (!storagePath.startsWith(`${user.id}/`)) {
      console.error('[ProcessDocument] Access denied: path does not belong to user', {
        userId: user.id,
        storagePath,
      })
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }

    // 5. Handle image files - return URL for vision API
    if (fileType === 'image') {
      // Get a signed URL for the image (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600) // 1 hour

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('[ProcessDocument] Failed to create signed URL:', signedUrlError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to access uploaded image')
      }

      const response: ProcessDocumentSuccessResponse = {
        success: true,
        type: 'image',
        imageUrl: signedUrlData.signedUrl,
        storagePath,
      }

      return NextResponse.json(response)
    }

    // 6. Download file from storage for document processing
    console.log('[ProcessDocument] Downloading file from storage:', storagePath)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath)

    if (downloadError || !fileData) {
      console.error('[ProcessDocument] Download error:', downloadError)
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'File not found in storage')
    }

    // 7. Convert Blob to Buffer for processing
    const buffer = Buffer.from(await fileData.arrayBuffer())
    console.log('[ProcessDocument] File downloaded, size:', buffer.length)

    // 8. Process document (PPTX/DOCX)
    let extractedContent: ExtractedDocument
    try {
      const mimeType = FILE_TYPE_TO_MIME[fileType] || ''
      console.log('[ProcessDocument] Processing document:', {
        fileName,
        fileType,
        mimeType,
        bufferSize: buffer.length,
      })

      extractedContent = await processDocument(buffer, mimeType, fileName)

      console.log('[ProcessDocument] Document processed successfully:', {
        title: extractedContent.title,
        sections: extractedContent.sections.length,
        pageCount: extractedContent.metadata.pageCount,
      })
    } catch (error) {
      console.error('[ProcessDocument] Processing error:', error)
      if (error instanceof Error) {
        // Map common document errors
        const message = error.message.toLowerCase()
        if (message.includes('password')) {
          return createErrorResponse(
            ErrorCodes.DOCUMENT_PASSWORD_PROTECTED,
            'Password-protected documents are not supported'
          )
        }
        if (message.includes('empty') || message.includes('no readable text')) {
          return createErrorResponse(
            ErrorCodes.DOCUMENT_EMPTY,
            'This document appears to be empty or contains no readable text'
          )
        }
        if (message.includes('scanned') || message.includes('mostly images')) {
          return createErrorResponse(
            ErrorCodes.DOCUMENT_SCANNED,
            'This looks like a scanned document. For best results, take photos of each page instead'
          )
        }
        // Don't expose raw error message to users - use generic message
        return createErrorResponse(ErrorCodes.DOCUMENT_PROCESSING_FAILED, 'Failed to process document. Please try again or use a different file')
      }
      return createErrorResponse(ErrorCodes.DOCUMENT_PROCESSING_FAILED, 'Failed to process document')
    }

    // 9. Return success response
    const response: ProcessDocumentSuccessResponse = {
      success: true,
      type: 'document',
      extractedContent,
      storagePath,
      documentType: fileType as 'pptx' | 'docx',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[ProcessDocument] Unhandled error:', error)
    logError('ProcessDocument:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
  }
}
