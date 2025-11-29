/**
 * PDF Document Processor
 *
 * NOTE: PDF text extraction is temporarily disabled due to pdf-parse
 * incompatibility with Next.js App Router. Users should upload images
 * or screenshots of their PDF pages instead.
 */

import { ExtractedDocument } from './pptx'

// =============================================================================
// Main Processor
// =============================================================================

/**
 * Process a PDF file and extract all text content
 *
 * @param _buffer - The PDF file as a Buffer (unused for now)
 * @returns Never returns - always throws an error
 * @throws Error indicating PDF processing is not yet supported
 */
export async function processPDF(_buffer: Buffer): Promise<ExtractedDocument> {
  throw new Error(
    'PDF text extraction is not yet supported. ' +
      'Please upload images or screenshots of your PDF pages instead for best results.'
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a preview of the PDF (first few pages)
 * NOTE: Currently disabled - throws error
 */
export async function getPDFPreview(
  _buffer: Buffer,
  _maxPages: number = 3
): Promise<{ title: string; pageCount: number; preview: string }> {
  throw new Error('PDF preview is not yet supported.')
}

/**
 * Check if a buffer is a valid PDF file by checking magic bytes
 */
export async function isValidPDF(buffer: Buffer): Promise<boolean> {
  try {
    // Check for PDF magic bytes
    const header = buffer.slice(0, 5).toString('ascii')
    return header === '%PDF-'
  } catch {
    return false
  }
}
