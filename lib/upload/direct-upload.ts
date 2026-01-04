import { createBrowserClient } from '@supabase/ssr'

type ProgressCallback = (progress: number) => void
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
