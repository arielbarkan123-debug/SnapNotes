/**
 * Image Upload Utility
 *
 * Provides functions to upload extracted images to Supabase storage.
 * Used to persist images extracted from documents (PPTX, DOCX).
 */

import { createClient } from '@/lib/supabase/server'
import type { ExtractedImage } from '@/lib/documents/pptx'

// =============================================================================
// Types
// =============================================================================

export interface UploadedImageResult {
  /** URL to access the image */
  url: string
  /** Storage path in Supabase */
  storagePath: string
  /** Original filename */
  filename: string
  /** Success status */
  success: true
}

export interface UploadImageError {
  /** Original filename */
  filename: string
  /** Error message */
  error: string
  /** Success status */
  success: false
}

export type ImageUploadResult = UploadedImageResult | UploadImageError

// =============================================================================
// Constants
// =============================================================================

const BUCKET_NAME = 'notebook-images'
const MAX_IMAGES_TO_UPLOAD = 10 // Limit to avoid excessive storage usage

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Upload extracted images to Supabase storage
 *
 * @param images - Array of extracted images from documents
 * @param userId - User ID for storage path
 * @param courseId - Course ID for storage path
 * @returns Array of upload results (success or error for each image)
 */
export async function uploadExtractedImages(
  images: ExtractedImage[],
  userId: string,
  courseId: string
): Promise<ImageUploadResult[]> {
  const supabase = await createClient()
  const results: ImageUploadResult[] = []

  // Limit the number of images to upload
  const imagesToUpload = images.slice(0, MAX_IMAGES_TO_UPLOAD)

  for (let i = 0; i < imagesToUpload.length; i++) {
    const image = imagesToUpload[i]
    const filename = image.filename || `image-${i}.jpg`

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(image.data, 'base64')

      // Generate storage path
      const extension = getExtensionFromMime(image.mimeType)
      const storagePath = `${userId}/${courseId}/extracted-${i}.${extension}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: image.mimeType,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error(`Failed to upload image ${filename}:`, uploadError)
        results.push({
          filename,
          error: uploadError.message,
          success: false,
        })
        continue
      }

      // Get signed URL (1 year expiry)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365)

      if (signedUrlError) {
        // Fallback to public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(uploadData.path)

        results.push({
          url: urlData.publicUrl,
          storagePath: uploadData.path,
          filename,
          success: true,
        })
      } else {
        results.push({
          url: signedUrlData.signedUrl,
          storagePath: uploadData.path,
          filename,
          success: true,
        })
      }
    } catch (error) {
      console.error(`Failed to upload image ${filename}:`, error)
      results.push({
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      })
    }
  }

  return results
}

/**
 * Upload a single base64 image to Supabase storage
 *
 * @param base64Data - Base64 encoded image data
 * @param mimeType - MIME type of the image
 * @param userId - User ID for storage path
 * @param courseId - Course ID for storage path
 * @param filename - Optional filename
 * @returns Upload result
 */
export async function uploadBase64Image(
  base64Data: string,
  mimeType: string,
  userId: string,
  courseId: string,
  filename?: string
): Promise<ImageUploadResult> {
  const supabase = await createClient()
  const finalFilename = filename || `image-${Date.now()}.${getExtensionFromMime(mimeType)}`

  try {
    const buffer = Buffer.from(base64Data, 'base64')
    const storagePath = `${userId}/${courseId}/${finalFilename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true, // Allow overwrite for single uploads
      })

    if (uploadError) {
      return {
        filename: finalFilename,
        error: uploadError.message,
        success: false,
      }
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365)

    if (signedUrlError) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path)

      return {
        url: urlData.publicUrl,
        storagePath: uploadData.path,
        filename: finalFilename,
        success: true,
      }
    }

    return {
      url: signedUrlData.signedUrl,
      storagePath: uploadData.path,
      filename: finalFilename,
      success: true,
    }
  } catch (error) {
    return {
      filename: finalFilename,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
  }

  return mimeMap[mimeType] || 'jpg'
}
