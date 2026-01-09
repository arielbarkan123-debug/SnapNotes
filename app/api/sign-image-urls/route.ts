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

interface SignedImage {
  url: string
  storagePath: string
  index: number
  filename: string
}

interface SignImageUrlsRequest {
  storagePaths: string[]
  courseId: string
}

// ============================================================================
// Constants
// ============================================================================

const BUCKET_NAME = 'notebook-images'
const URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 // 1 year

// ============================================================================
// POST - Generate signed URLs for uploaded images
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // 2. Parse request body
    let body: SignImageUrlsRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { storagePaths, courseId } = body

    // 3. Validate request
    if (!storagePaths || !Array.isArray(storagePaths) || storagePaths.length === 0) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'storagePaths is required')
    }

    if (!courseId || typeof courseId !== 'string') {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'courseId is required')
    }

    // 4. Security check: Verify all paths belong to the authenticated user
    const userPrefix = `${user.id}/`
    for (const path of storagePaths) {
      if (!path.startsWith(userPrefix)) {
        logError('SignImageUrls:unauthorized_path', new Error(`Path ${path} does not belong to user ${user.id}`))
        return createErrorResponse(
          ErrorCodes.UNAUTHORIZED,
          'You do not have permission to access these files'
        )
      }
    }

    // 5. Generate signed URLs for all paths
    const signedImages: SignedImage[] = []
    const errors: string[] = []

    for (let i = 0; i < storagePaths.length; i++) {
      const storagePath = storagePaths[i]

      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, URL_EXPIRY_SECONDS)

        if (signedUrlError) {
          logError('SignImageUrls:signedUrl', signedUrlError)
          errors.push(`Failed to sign ${storagePath}`)
          continue
        }

        // Extract filename from path (format: userId/courseId/page-N.ext)
        const filename = storagePath.split('/').pop() || `page-${i}.jpg`

        signedImages.push({
          url: signedUrlData.signedUrl,
          storagePath,
          index: i,
          filename,
        })
      } catch (err) {
        logError('SignImageUrls:file', err)
        errors.push(`Error processing ${storagePath}`)
      }
    }

    // 6. Check if we have any successful URLs
    if (signedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate signed URLs',
          errors,
        },
        { status: 500 }
      )
    }

    // 7. Return signed URLs
    return NextResponse.json({
      success: true,
      courseId,
      images: signedImages,
      ...(errors.length > 0 && { errors }),
    })

  } catch (error) {
    logError('SignImageUrls:unhandled', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred'
    )
  }
}

// ============================================================================
// Handle other methods
// ============================================================================

export async function GET() {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed', 405)
}
