import { createBrowserClient } from '@supabase/ssr'

// HEIC conversion is loaded dynamically from a separate module to avoid
// bundling heic2any (which uses Web Workers) into the main bundle.
// See lib/upload/heic-converter.ts

type ProgressCallback = (progress: number) => void

/**
 * Validate that a file is a valid image by checking magic bytes
 * Returns the detected format or an error message
 */
async function validateImageMagicBytes(file: File): Promise<{ valid: boolean; format?: string; error?: string }> {
  try {
    if (file.size < 12) {
      return { valid: false, error: 'File too small to be a valid image' }
    }

    const slice = file.slice(0, 12)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { valid: true, format: 'jpeg' }
    }

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { valid: true, format: 'png' }
    }

    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { valid: true, format: 'gif' }
    }

    // WebP: RIFF....WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return { valid: true, format: 'webp' }
    }

    // HEIC/HEIF: ftyp at bytes 4-7
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
      const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']
      if (heicBrands.includes(brand)) {
        return { valid: true, format: 'heic' }
      }
    }

    // Unknown format - log the bytes for debugging
    const hexBytes = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
    console.warn(`[Upload] Unknown image format, first 12 bytes: ${hexBytes}`)
    return { valid: false, error: `Unknown image format. Please use JPEG, PNG, or convert from your current format.` }
  } catch (error) {
    console.error('[Upload] Failed to read file magic bytes:', error)
    return { valid: false, error: 'Failed to read file. Please try again.' }
  }
}

// Note: HEIC detection is now handled by validateImageMagicBytes()
// which checks all image formats including HEIC

/**
 * Convert HEIC/HEIF to JPEG on the client side
 * This is needed because Claude Vision API doesn't support HEIC
 * Uses dynamic import to load converter only when needed (avoids SecurityError)
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamically import the converter module - this keeps heic2any out of the main bundle
  const { convertHeicToJpeg: convert } = await import('./heic-converter')
  return convert(file)
}
export type FileType = 'image' | 'pptx' | 'docx'

const ALLOWED_TYPES: Record<string, FileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export interface ValidationResult {
  valid: boolean
  error?: string
  fileType?: FileType
}

export function validateFile(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 50MB.' }
  }

  const fileType = ALLOWED_TYPES[file.type]
  if (!fileType) {
    // Check extension as fallback (some browsers don't set MIME type correctly)
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pptx') return { valid: true, fileType: 'pptx' }
    if (ext === 'docx') return { valid: true, fileType: 'docx' }
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) {
      return { valid: true, fileType: 'image' }
    }
    return { valid: false, error: 'Unsupported file type. Use images, PPTX, or DOCX.' }
  }

  return { valid: true, fileType }
}

export async function uploadFileToStorage(
  file: File,
  userId: string,
  onProgress?: ProgressCallback
): Promise<{ storagePath: string; fileType: FileType }> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Generate unique filename: userId/timestamp-random-safeName
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${userId}/${timestamp}-${random}-${safeName}`

  // Upload with retry logic
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Update progress based on attempt
      onProgress?.(attempt === 1 ? 10 : 10 + (attempt - 1) * 5)

      const { error } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      onProgress?.(90)
      return { storagePath, fileType: validation.fileType! }
    } catch (err) {
      lastError = err as Error
      console.warn(`Upload attempt ${attempt} failed:`, err)
      if (attempt < 3) {
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  }

  throw lastError || new Error('Upload failed after 3 attempts')
}

export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.storage.from('documents').remove([storagePath])
  if (error) {
    console.warn('Failed to delete file from storage:', error)
  }
}

// ============================================================================
// Image Upload (for notebook images - bypasses Vercel 4.5MB limit)
// ============================================================================

const IMAGE_BUCKET = 'notebook-images'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB per image
const MAX_TOTAL_IMAGES = 10

const ALLOWED_IMAGE_TYPES: Record<string, boolean> = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/webp': true,
  'image/heic': true,
  'image/heif': true,
  'image/gif': true,
}

export interface ImageUploadResult {
  storagePath: string
  index: number
  filename: string
}

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export function validateImageFile(file: File): ImageValidationResult {
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 10MB.` }
  }

  // Check MIME type
  if (ALLOWED_IMAGE_TYPES[file.type]) {
    return { valid: true }
  }

  // Fallback to extension check
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'].includes(ext || '')) {
    return { valid: true }
  }

  return { valid: false, error: 'Invalid file type. Use JPG, PNG, WebP, HEIC, or GIF.' }
}

/**
 * Upload multiple images directly to Supabase Storage
 * This bypasses Vercel's 4.5MB body size limit by uploading from browser
 */
export async function uploadImagesToStorage(
  files: File[],
  userId: string,
  courseId: string,
  onProgress?: (current: number, total: number) => void
): Promise<ImageUploadResult[]> {
  if (files.length === 0) {
    throw new Error('No files to upload')
  }

  if (files.length > MAX_TOTAL_IMAGES) {
    throw new Error(`Maximum ${MAX_TOTAL_IMAGES} images allowed`)
  }

  // Validate all files first
  for (const file of files) {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw new Error(`${file.name}: ${validation.error}`)
    }
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const results: ImageUploadResult[] = []
  const errors: string[] = []

  // Upload files sequentially to show accurate progress
  for (let i = 0; i < files.length; i++) {
    let file = files[i]
    const originalFilename = file.name

    // Log detailed file info for debugging Safari issues
    console.log(`[Upload] Processing file ${i + 1}/${files.length}:`, {
      name: originalFilename,
      type: file.type || 'empty',
      size: file.size,
    })

    // CRITICAL: Validate file is not empty (Safari mobile can sometimes pass empty files)
    if (file.size === 0) {
      console.error(`[Upload] File is empty: ${originalFilename}`)
      errors.push(`${originalFilename}: File is empty. Please try selecting the image again.`)
      continue
    }

    // CRITICAL: Validate file has valid image magic bytes before upload
    // This catches corrupted files or files that aren't actually images
    const magicBytesValid = await validateImageMagicBytes(file)
    if (!magicBytesValid.valid) {
      console.error(`[Upload] Invalid image format: ${originalFilename}`, magicBytesValid)
      errors.push(`${originalFilename}: ${magicBytesValid.error || 'Not a valid image file'}`)
      continue
    }
    console.log(`[Upload] Magic bytes valid for ${originalFilename}:`, magicBytesValid.format)

    // Check for HEIC format - magic bytes validation already detected it
    const isHeic = magicBytesValid.format === 'heic'

    // Convert HEIC to JPEG before uploading (Claude Vision doesn't support HEIC)
    if (isHeic) {
      console.log(`[Upload] File ${originalFilename} is HEIC, attempting conversion...`)
      try {
        console.log(`[Upload] Converting HEIC file: ${originalFilename}`)
        file = await convertHeicToJpeg(file)
        console.log(`[Upload] HEIC conversion successful: ${originalFilename} -> ${file.name}`)
      } catch (conversionError) {
        const errorMsg = conversionError instanceof Error ? conversionError.message : 'Unknown error'
        console.error(`[Upload] HEIC conversion failed for ${originalFilename}:`, errorMsg)

        // Provide specific error message for Safari users
        if (errorMsg.includes('SecurityError') || errorMsg.includes('not supported')) {
          errors.push(`${originalFilename}: HEIC format not supported on this browser. Please convert to JPEG first, or go to iPhone Settings > Camera > Formats and select "Most Compatible" to take photos in JPEG format.`)
        } else {
          errors.push(`${originalFilename}: Failed to convert HEIC image - ${errorMsg}`)
        }
        continue
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const storagePath = `${userId}/${courseId}/page-${i}.${ext}`

    try {
      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || `image/${ext}`,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        errors.push(`${file.name}: ${error.message}`)
        continue
      }

      results.push({
        storagePath,
        index: i,
        filename: file.name,
      })

      onProgress?.(i + 1, files.length)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      errors.push(`${file.name}: ${message}`)
    }
  }

  // If all uploads failed, throw error
  if (results.length === 0 && errors.length > 0) {
    throw new Error(`All uploads failed: ${errors.join('; ')}`)
  }

  return results
}

/**
 * Delete uploaded images (for cleanup on error)
 */
export async function deleteImagesFromStorage(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(storagePaths)
  if (error) {
    console.warn('Failed to delete images from storage:', error)
  }
}

/**
 * Generate a course ID for organizing uploaded images
 */
export function generateCourseId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
