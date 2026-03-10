import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import { processDocument, type ExtractedDocument } from '@/lib/documents'
import { ErrorCodes, createErrorResponse, logError } from '@/lib/api/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:process-document')

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
      log.error({
        userId: user.id,
        storagePath,
      }, 'Access denied: path does not belong to user')
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }

    // 5. Handle image files - return URL for vision API
    if (fileType === 'image') {
      // Get a signed URL for the image (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600) // 1 hour

      if (signedUrlError || !signedUrlData?.signedUrl) {
        log.error({ err: signedUrlError }, 'Failed to create signed URL')
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
    log.debug({ storagePath }, 'Downloading file from storage')
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath)

    if (downloadError || !fileData) {
      log.error({ err: downloadError }, 'Download error')
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'File not found in storage')
    }

    // 7. Convert Blob to Buffer for processing
    const buffer = Buffer.from(await fileData.arrayBuffer())
    log.debug({ size: buffer.length }, 'File downloaded')

    // 8. Process document (PPTX/DOCX)
    let extractedContent: ExtractedDocument
    try {
      const mimeType = FILE_TYPE_TO_MIME[fileType] || ''
      log.debug({
        fileName,
        fileType,
        mimeType,
        bufferSize: buffer.length,
      }, 'Processing document')

      extractedContent = await processDocument(buffer, mimeType, fileName)

      log.debug({
        title: extractedContent.title,
        sections: extractedContent.sections.length,
        pageCount: extractedContent.metadata.pageCount,
      }, 'Document processed successfully')
    } catch (error) {
      log.error({ err: error }, 'Processing error')
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
    log.error({ err: error }, 'Unhandled error')
    logError('ProcessDocument:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
  }
}
