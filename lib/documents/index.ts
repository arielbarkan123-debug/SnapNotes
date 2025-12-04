/**
 * Document Processing Utilities
 *
 * This module handles extraction of text content from various document formats:
 * - PDF files
 * - PowerPoint presentations (PPTX/PPT)
 * - Word documents (DOCX/DOC)
 *
 * Used for processing uploaded documents before sending to AI for course generation.
 */

// Import from specific processors
import { processPPTX, getPPTXPreview, isValidPPTX } from './pptx'
import { processPDF, getPDFPreview, isValidPDF } from './pdf'
import { processDOCX, getDOCXPreview, isValidDOCX } from './docx'

// Re-export types and functions from specific processors
export { type ExtractedDocument, type ExtractedImage } from './pptx'
export { processPPTX, getPPTXPreview, isValidPPTX }
export { processPDF, getPDFPreview, isValidPDF }
export { processDOCX, getDOCXPreview, isValidDOCX }

// =============================================================================
// Types
// =============================================================================

export type DocumentType = 'image' | 'pdf' | 'pptx' | 'docx' | 'unknown'

export interface ProcessedDocument {
  text: string
  pageCount?: number
  metadata?: Record<string, string>
}

// =============================================================================
// MIME Type Detection
// =============================================================================

const MIME_TYPE_MAP: Record<string, DocumentType> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  // PDF
  'application/pdf': 'pdf',
  // PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
}

/**
 * Determine the document type from MIME type
 */
export function getFileType(mimeType: string): DocumentType {
  return MIME_TYPE_MAP[mimeType] || 'unknown'
}

/**
 * Get file type from file extension (fallback)
 */
export function getFileTypeFromExtension(filename: string): DocumentType {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'heic':
      return 'image'
    case 'pdf':
      return 'pdf'
    case 'pptx':
    case 'ppt':
      return 'pptx'
    case 'docx':
    case 'doc':
      return 'docx'
    default:
      return 'unknown'
  }
}

// =============================================================================
// Unified Processor
// =============================================================================

/**
 * Process any supported document type and return ExtractedDocument format
 *
 * @param buffer - The file as a Buffer
 * @param mimeType - The MIME type of the file
 * @param filename - Optional filename for extension-based fallback
 * @returns Extracted document with structured content
 */
export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<import('./pptx').ExtractedDocument> {
  let fileType = getFileType(mimeType)

  // Fallback to extension if MIME type is unknown
  if (fileType === 'unknown' && filename) {
    fileType = getFileTypeFromExtension(filename)
  }

  switch (fileType) {
    case 'pdf':
      return processPDF(buffer)
    case 'pptx':
      return processPPTX(buffer)
    case 'docx':
      return processDOCX(buffer)
    case 'image':
      // Images are handled separately via vision API
      throw new Error('Images should be processed via vision API, not text extraction')
    default:
      throw new Error(`Unsupported file type: ${mimeType}`)
  }
}

/**
 * Process document and return simplified ProcessedDocument format
 * (for backwards compatibility)
 */
export async function processDocumentSimple(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<ProcessedDocument> {
  const extracted = await processDocument(buffer, mimeType, filename)

  return {
    text: extracted.content,
    pageCount: extracted.metadata.pageCount,
    metadata: {
      title: extracted.title,
      author: extracted.metadata.author || '',
      createdDate: extracted.metadata.createdDate || '',
      modifiedDate: extracted.metadata.modifiedDate || '',
    },
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a file type is supported for text extraction
 */
export function isTextExtractable(mimeType: string): boolean {
  const fileType = getFileType(mimeType)
  return fileType === 'pdf' || fileType === 'pptx' || fileType === 'docx'
}

/**
 * Check if a file type is an image
 */
export function isImage(mimeType: string): boolean {
  return getFileType(mimeType) === 'image'
}

/**
 * Get human-readable file type label
 */
export function getFileTypeLabel(mimeType: string): string {
  const fileType = getFileType(mimeType)

  switch (fileType) {
    case 'image':
      return 'Image'
    case 'pdf':
      return 'PDF'
    case 'pptx':
      return 'PowerPoint'
    case 'docx':
      return 'Word Document'
    default:
      return 'Unknown'
  }
}

/**
 * Validate a document file
 */
export async function isValidDocument(buffer: Buffer, mimeType: string): Promise<boolean> {
  const fileType = getFileType(mimeType)

  switch (fileType) {
    case 'pdf':
      return isValidPDF(buffer)
    case 'pptx':
      return isValidPPTX(buffer)
    case 'docx':
      return isValidDOCX(buffer)
    default:
      return false
  }
}
