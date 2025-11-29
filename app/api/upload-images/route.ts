import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError
} from '@/lib/api/errors'

// ============================================================================
// Types
// ============================================================================

interface UploadedImage {
  url: string
  filename: string
  index: number
  storagePath: string
}

interface UploadError {
  index: number
  filename: string
  error: string
  code?: string
}

interface UploadImagesSuccessResponse {
  success: true
  courseId: string
  images: UploadedImage[]
  errors?: UploadError[]
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_FILES = 10
const BUCKET_NAME = 'notebook-images'

// ============================================================================
// Helpers
// ============================================================================

function generateCourseId(): string {
  // Generate a UUID-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg'
}

function isValidFileType(file: File): boolean {
  // Check MIME type
  if (ACCEPTED_FILE_TYPES.includes(file.type)) {
    return true
  }

  // Check for empty MIME type (can happen with some browsers)
  if (!file.type || file.type === '') {
    // Fallback to extension only
    const ext = getFileExtension(file.name)
    return ACCEPTED_EXTENSIONS.includes(ext)
  }

  // Check if it's an image type we might have missed (e.g., image/pjpeg)
  if (file.type.startsWith('image/')) {
    const ext = getFileExtension(file.name)
    return ACCEPTED_EXTENSIONS.includes(ext)
  }

  // Fallback: check extension (for HEIC which may not have correct MIME)
  const ext = getFileExtension(file.name)
  return ACCEPTED_EXTENSIONS.includes(ext)
}

function isStorageQuotaError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message).toLowerCase()
    return message.includes('quota') || message.includes('storage limit')
  }
  return false
}

function validateFile(file: File, index: number): UploadError | null {
  // Validate file type
  if (!isValidFileType(file)) {
    return {
      index,
      filename: file.name,
      error: `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      code: ErrorCodes.INVALID_FILE_TYPE,
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      index,
      filename: file.name,
      error: 'File too large. Maximum size is 10MB',
      code: ErrorCodes.FILE_TOO_LARGE,
    }
  }

  return null
}

// ============================================================================
// POST - Upload multiple files
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

    // 3. Get all files from FormData
    // Support both "files" and "files[]" keys
    const files: File[] = []

    // Check for "files" key (multiple files)
    const filesEntries = formData.getAll('files')
    for (const entry of filesEntries) {
      if (entry instanceof File) {
        files.push(entry)
      }
    }

    // Also check for "files[]" key (some form libraries use this)
    const filesArrayEntries = formData.getAll('files[]')
    for (const entry of filesArrayEntries) {
      if (entry instanceof File) {
        files.push(entry)
      }
    }

    // Fallback: check for numbered keys like "file0", "file1", etc.
    for (let i = 0; i < MAX_FILES; i++) {
      const file = formData.get(`file${i}`) as File | null
      if (file instanceof File) {
        files.push(file)
      }
    }

    if (files.length === 0) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'No files provided')
    }

    // 4. Validate total file count
    if (files.length > MAX_FILES) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${MAX_FILES} files allowed. You provided ${files.length}.`
      )
    }

    // 5. Generate course ID for this upload batch
    const courseId = generateCourseId()

    // 6. Validate all files first and collect errors
    const validationErrors: UploadError[] = []
    const validFiles: { file: File; index: number }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateFile(file, i)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push({ file, index: i })
      }
    }

    // If all files are invalid, return error
    if (validFiles.length === 0) {
      // Log detailed info for debugging
      console.error('[UploadImages] All files failed validation:', {
        fileCount: files.length,
        files: files.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          extension: getFileExtension(f.name),
        })),
        validationErrors,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'All files failed validation',
          errors: validationErrors,
        },
        { status: 400 }
      )
    }

    // 7. Upload valid files in parallel
    const uploadPromises = validFiles.map(async ({ file, index }) => {
      try {
        // Generate storage path: notebook-images/{user_id}/{course_id}/page-{index}.{ext}
        const extension = getFileExtension(file.name)
        const storagePath = `${user.id}/${courseId}/page-${index}.${extension}`

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: file.type || `image/${extension}`,
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          logError('UploadImages:storage', uploadError)

          if (isStorageQuotaError(uploadError)) {
            return {
              type: 'error' as const,
              error: {
                index,
                filename: file.name,
                error: 'Storage quota exceeded',
                code: ErrorCodes.STORAGE_QUOTA_EXCEEDED,
              },
            }
          }

          return {
            type: 'error' as const,
            error: {
              index,
              filename: file.name,
              error: 'Failed to upload file',
              code: ErrorCodes.UPLOAD_FAILED,
            },
          }
        }

        // Get signed URL (long expiry for course images)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365) // 1 year expiry

        if (signedUrlError) {
          logError('UploadImages:signedUrl', signedUrlError)
          // Fallback to public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(uploadData.path)

          return {
            type: 'success' as const,
            image: {
              url: urlData.publicUrl,
              filename: file.name,
              index,
              storagePath: uploadData.path,
            },
          }
        }

        return {
          type: 'success' as const,
          image: {
            url: signedUrlData.signedUrl,
            filename: file.name,
            index,
            storagePath: uploadData.path,
          },
        }
      } catch (err) {
        logError('UploadImages:file', err)
        return {
          type: 'error' as const,
          error: {
            index,
            filename: file.name,
            error: 'Unexpected error uploading file',
            code: ErrorCodes.UPLOAD_FAILED,
          },
        }
      }
    })

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises)

    // 8. Separate successful uploads and errors
    const uploadedImages: UploadedImage[] = []
    const uploadErrors: UploadError[] = [...validationErrors]

    for (const result of results) {
      if (result.type === 'success') {
        uploadedImages.push(result.image)
      } else {
        uploadErrors.push(result.error)
      }
    }

    // Sort images by index to maintain order
    uploadedImages.sort((a, b) => a.index - b.index)

    // 9. Determine response status
    if (uploadedImages.length === 0) {
      // All uploads failed
      return NextResponse.json(
        {
          success: false,
          error: 'All file uploads failed',
          courseId,
          errors: uploadErrors,
        },
        { status: 500 }
      )
    }

    // 10. Return success response (partial or complete)
    const response: UploadImagesSuccessResponse = {
      success: true,
      courseId,
      images: uploadedImages,
    }

    // Include errors array if there were any failures
    if (uploadErrors.length > 0) {
      response.errors = uploadErrors
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('UploadImages:unhandled', error)
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
