import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError
} from '@/lib/api/errors'

// ============================================================================
// Types
// ============================================================================

interface UploadSuccessResponse {
  success: true
  imageUrl: string
  fileName: string
  storagePath: string
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET_NAME = 'notebook-images'

// ============================================================================
// Helpers
// ============================================================================

function generateFileName(userId: string, originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `${userId}/${timestamp}-${random}.${extension}`
}

function isStorageQuotaError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message).toLowerCase()
    return message.includes('quota') || message.includes('storage limit')
  }
  return false
}

// ============================================================================
// POST - Upload file
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to upload')
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

    // 3. Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return createErrorResponse(
        ErrorCodes.INVALID_FILE_TYPE,
        'Please upload a JPG, PNG, or PDF file'
      )
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        ErrorCodes.FILE_TOO_LARGE,
        'File size must be under 10MB'
      )
    }

    // 5. Generate unique filename
    const fileName = generateFileName(user.id, file.name)

    // 6. Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 7. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logError('Upload:storage', uploadError)

      // Check for specific storage errors
      if (isStorageQuotaError(uploadError)) {
        return createErrorResponse(
          ErrorCodes.STORAGE_QUOTA_EXCEEDED,
          'Storage quota exceeded. Please delete some files and try again.'
        )
      }

      return createErrorResponse(
        ErrorCodes.UPLOAD_FAILED,
        'Failed to upload image. Please try again.'
      )
    }

    // 8. Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path)

    // Since bucket may be private, try to create a signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365) // 1 year expiry

    if (signedUrlError) {
      logError('Upload:signedUrl', signedUrlError)
      // Continue with public URL as fallback
    }

    const imageUrl = signedUrlData?.signedUrl || urlData.publicUrl

    // 9. Return success response
    const response: UploadSuccessResponse = {
      success: true,
      imageUrl,
      fileName: file.name,
      storagePath: uploadData.path,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('Upload:unhandled', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred. Please try again.'
    )
  }
}

// ============================================================================
// Handle other methods
// ============================================================================

export async function GET() {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed', 405)
}
