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
 * Validate that the converted file is a valid JPEG by checking magic bytes
 */
async function isValidJpeg(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 3)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    // JPEG magic bytes: FF D8 FF
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  } catch {
    return false
  }
}

/**
 * Convert HEIC/HEIF to JPEG
 * This function dynamically imports heic2any to avoid loading it until needed
 * Includes validation to ensure the converted file is a valid JPEG
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  console.log('[HEIC Converter] Converting HEIC to JPEG:', file.name, 'size:', file.size)

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

    // Validate the blob exists and has content
    if (!resultBlob || resultBlob.size === 0) {
      console.error('[HEIC Converter] Conversion produced empty blob')
      throw new Error('HEIC conversion produced empty file')
    }

    // Create new File with .jpg extension
    const newFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
    const convertedFile = new File([resultBlob], newFileName, { type: 'image/jpeg' })

    // Validate the converted file is a proper JPEG (check magic bytes)
    const isValid = await isValidJpeg(convertedFile)
    if (!isValid) {
      console.error('[HEIC Converter] Conversion produced invalid JPEG (bad magic bytes), size:', convertedFile.size)
      throw new Error('HEIC conversion produced corrupted file')
    }

    // Validate reasonable size (at least 1KB for a real image)
    if (convertedFile.size < 1024) {
      console.error('[HEIC Converter] Conversion produced suspiciously small file:', convertedFile.size)
      throw new Error('HEIC conversion produced invalid file (too small)')
    }

    console.log('[HEIC Converter] Conversion successful:', newFileName, 'size:', convertedFile.size, 'valid JPEG: true')
    return convertedFile
  } catch (error) {
    console.error('[HEIC Converter] Conversion failed:', error)

    // Check if it's a SecurityError from Web Worker
    if (error instanceof Error && error.name === 'SecurityError') {
      throw new Error('HEIC conversion not supported in this browser. Please convert to JPEG before uploading.')
    }

    // Pass through our custom errors
    if (error instanceof Error && (
      error.message.includes('empty') ||
      error.message.includes('corrupted') ||
      error.message.includes('invalid')
    )) {
      throw error
    }

    throw new Error('Failed to convert HEIC image. Please convert to JPEG before uploading.')
  }
}
