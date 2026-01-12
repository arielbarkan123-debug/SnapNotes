/**
 * HEIC to JPEG converter module
 *
 * This module MUST be dynamically imported to avoid bundling heic2any
 * into the main bundle. heic2any uses Web Workers internally which can
 * cause SecurityError on mobile browsers.
 *
 * Usage:
 *   const { convertHeicToJpeg } = await import('@/lib/upload/heic-converter')
 *   const jpegFile = await convertHeicToJpeg(heicFile)
 */

/**
 * Check if file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif' ||
         file.type === 'image/heic' || file.type === 'image/heif'
}

/**
 * Convert HEIC/HEIF to JPEG
 * This function dynamically imports heic2any to avoid loading it until needed
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  console.log('[HEIC Converter] Converting HEIC to JPEG:', file.name)

  try {
    // Dynamic import - heic2any is only loaded when this function is called
    const heic2any = (await import('heic2any')).default

    const jpegBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    })

    // heic2any can return single blob or array
    const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob

    // Create new File with .jpg extension
    const newFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
    const convertedFile = new File([resultBlob], newFileName, { type: 'image/jpeg' })

    console.log('[HEIC Converter] Conversion successful:', newFileName, 'size:', convertedFile.size)
    return convertedFile
  } catch (error) {
    console.error('[HEIC Converter] Conversion failed:', error)

    // Check if it's a SecurityError from Web Worker
    if (error instanceof Error && error.name === 'SecurityError') {
      throw new Error('HEIC conversion not supported in this browser. Please convert to JPEG before uploading.')
    }
    throw new Error('Failed to convert HEIC image. Please convert to JPEG before uploading.')
  }
}
