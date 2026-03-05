/**
 * Upload pre-rendered step images to Supabase Storage.
 *
 * Bucket: diagram-steps
 * Path: {userId}/{diagramHash}/step_{N}.png
 *
 * All uploads run in parallel. Individual failures return null URL
 * (the step is skipped in the frontend walkthrough).
 */

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'diagram-steps'

/**
 * Generate a short deterministic hash for a diagram (used as folder name).
 * Combines question text + pipeline to make it unique per generation context.
 */
export function generateDiagramHash(question: string, pipeline: string): string {
  return createHash('sha256')
    .update(`${question}::${pipeline}`)
    .digest('hex')
    .slice(0, 12)
}

/**
 * Upload step image buffers to Supabase Storage.
 *
 * @param buffers - PNG image buffers (one per step, in order)
 * @param userId - User ID for storage path
 * @param diagramHash - Short hash for grouping step images
 * @returns Array of public URLs (null for failed uploads)
 */
export async function uploadStepImages(
  buffers: Buffer[],
  userId: string,
  diagramHash: string,
): Promise<(string | null)[]> {
  const supabase = await createClient()

  const uploadPromises = buffers.map(async (buffer, index) => {
    const storagePath = `${userId}/${diagramHash}/step_${index + 1}.png`

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          cacheControl: '86400', // 24 hours
          upsert: true,          // Allow re-generation overwrites
        })

      if (error || !data) {
        console.warn(`[StepCapture] Failed to upload step ${index + 1}:`, error?.message)
        return null
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (err) {
      console.error(`[StepCapture] Upload error step ${index + 1}:`, err)
      return null
    }
  })

  return Promise.all(uploadPromises)
}
