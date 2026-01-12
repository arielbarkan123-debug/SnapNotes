/**
 * Document Processing Types
 *
 * This file contains only type definitions for document processing.
 * It is safe to import in client-side code because it has no runtime dependencies.
 *
 * The actual implementations in docx.ts, pdf.ts, and pptx.ts should only be
 * imported in server-side code (API routes) because they use libraries like
 * mammoth and JSZip that may cause issues with Web Workers in browsers.
 */

/**
 * ExtractedImage - An image extracted from a document
 */
export interface ExtractedImage {
  /** Base64 encoded image data */
  data: string
  /** MIME type of the image */
  mimeType: string
  /** Original filename in the document */
  filename?: string
  /** Page/slide number where the image was found */
  pageNumber?: number
  /** Alt text or description if available */
  alt?: string
}

/**
 * ExtractedDocument - Represents extracted content from a document
 */
export interface ExtractedDocument {
  type: 'pptx' | 'pdf' | 'docx'
  title: string
  content: string
  sections: {
    title: string
    content: string
    pageNumber: number
  }[]
  metadata: {
    pageCount: number
    author?: string
    createdDate?: string
    modifiedDate?: string
  }
  /** Images extracted from the document */
  images?: ExtractedImage[]
}

/**
 * DocumentType - Supported document types
 */
export type DocumentType = 'image' | 'pdf' | 'pptx' | 'docx' | 'unknown'

/**
 * ProcessedDocument - Result of processing a document
 */
export interface ProcessedDocument {
  text: string
  pageCount?: number
  metadata?: Record<string, string>
}
