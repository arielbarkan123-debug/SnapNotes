import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, createErrorResponse, logError } from '@/lib/api/errors'
import {
  processDocument,
  getFileType,
  getFileTypeFromExtension,
  type ExtractedDocument,
  type DocumentType,
} from '@/lib/documents'

// ============================================================================
// Types
// ============================================================================

interface UploadDocumentSuccessResponse {
  success: true
  documentType: 'pptx' | 'pdf' | 'docx'
  extractedContent: ExtractedDocument
  storagePath: string
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZES: Record<DocumentType, number> = {
  pdf: 20 * 1024 * 1024, // 20MB
  pptx: 20 * 1024 * 1024, // 20MB
  docx: 20 * 1024 * 1024, // 20MB
  image: 10 * 1024 * 1024, // 10MB (not used here but for type completeness)
  unknown: 0,
}

const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25MB total payload limit

const BUCKET_NAME = 'documents'

// ============================================================================
// Helpers
// ============================================================================

function generateStoragePath(userId: string, originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf'
  return `${userId}/${timestamp}-${random}.${extension}`
}

function isStorageQuotaError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message).toLowerCase()
    return message.includes('quota') || message.includes('storage limit')
  }
  return false
}

function mapDocumentError(error: Error): { code: keyof typeof ErrorCodes; message: string } {
  const message = error.message.toLowerCase()

  if (message.includes('password')) {
    return {
      code: 'DOCUMENT_PASSWORD_PROTECTED',
      message: 'Password-protected documents are not supported. Please remove the password and try again.',
    }
  }

  if (message.includes('scanned') || message.includes('mostly images')) {
    return {
      code: 'DOCUMENT_SCANNED',
      message: error.message,
    }
  }

  if (message.includes('empty') || message.includes('no readable text') || message.includes('no slides')) {
    return {
      code: 'DOCUMENT_EMPTY',
      message: 'This document appears to be empty or contains no readable text.',
    }
  }

  return {
    code: 'DOCUMENT_PROCESSING_FAILED',
    message: error.message || 'Failed to process document. Please try again.',
  }
}

// ============================================================================
// POST - Upload and process document
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 0. Validate Content-Length to prevent DOS attacks
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > MAX_TOTAL_SIZE) {
        return createErrorResponse(
          ErrorCodes.FILE_TOO_LARGE,
          `Total upload size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit`
        )
      }
    }

    // 1. Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to upload documents')
    }

    // 2. Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid form data')
    }

    const file = formData.get('file') as File | null

    if (!file) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'No file provided')
    }

    // 3. Detect file type from MIME type or extension
    let fileType = getFileType(file.type)
    if (fileType === 'unknown') {
      fileType = getFileTypeFromExtension(file.name)
    }

    // 4. Validate file type
    if (fileType === 'unknown' || fileType === 'image') {
      return createErrorResponse(
        ErrorCodes.INVALID_FILE_TYPE,
        'Please upload a PDF, PowerPoint (PPTX), or Word (DOCX) document'
      )
    }

    // 5. Validate file size
    const maxSize = MAX_FILE_SIZES[fileType]
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return createErrorResponse(ErrorCodes.FILE_TOO_LARGE, `File size must be under ${maxSizeMB}MB`)
    }

    // 6. Convert file to buffer for processing
    // Note: We create Buffer only for processDocument(), then upload the original File
    // to avoid keeping two large copies in memory simultaneously
    const buffer = Buffer.from(await file.arrayBuffer())

    // 7. Process document to extract content
    let extractedContent: ExtractedDocument
    try {
      console.log('[UploadDocument] Processing document:', {
        name: file.name,
        type: file.type,
        size: file.size,
        detectedType: fileType,
      })
      extractedContent = await processDocument(buffer, file.type, file.name)
      console.log('[UploadDocument] Document processed successfully:', {
        title: extractedContent.title,
        sections: extractedContent.sections.length,
        pageCount: extractedContent.metadata.pageCount,
        imagesExtracted: extractedContent.images?.length || 0,
      })
    } catch (error) {
      console.error('[UploadDocument] Document processing error:', error)
      if (error instanceof Error) {
        const { code, message } = mapDocumentError(error)
        return createErrorResponse(ErrorCodes[code], message)
      }
      return createErrorResponse(
        ErrorCodes.DOCUMENT_PROCESSING_FAILED,
        'Failed to process document. Please try again.'
      )
    }

    // 8. Generate storage path
    const storagePath = generateStoragePath(user.id, file.name)

    // 9. Upload original file to Supabase Storage
    // Use the original File object (not buffer) to reduce memory usage
    // Supabase storage accepts File directly
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      logError('UploadDocument:storage', uploadError)

      // Check for specific storage errors
      if (isStorageQuotaError(uploadError)) {
        return createErrorResponse(
          ErrorCodes.STORAGE_QUOTA_EXCEEDED,
          'Storage quota exceeded. Please delete some files and try again.'
        )
      }

      // If bucket doesn't exist, log it but continue (document was processed successfully)
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        logError('UploadDocument:bucketMissing', `Bucket '${BUCKET_NAME}' does not exist. File not stored.`)
        // Continue without storing - the extracted content is still valid
      } else {
        return createErrorResponse(ErrorCodes.UPLOAD_FAILED, 'Failed to store document. Please try again.')
      }
    }

    // 10. Return success response
    const response: UploadDocumentSuccessResponse = {
      success: true,
      documentType: extractedContent.type,
      extractedContent,
      storagePath,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[UploadDocument] Unhandled error:', error)
    logError('UploadDocument:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred. Please try again.')
  }
}

// ============================================================================
// Handle other methods
// ============================================================================

export async function GET() {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed', 405)
}
