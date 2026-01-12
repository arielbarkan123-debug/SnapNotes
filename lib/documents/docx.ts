/**
 * Word Document (DOCX) Processor
 *
 * Extracts text content from Word documents using mammoth library.
 * Parses document structure to identify headings and sections.
 * Also extracts embedded images from the word/media folder.
 *
 * NOTE: This file should only be imported in server-side code (API routes).
 * For client-side code, import types from './types' instead.
 */

import mammoth from 'mammoth'
import JSZip from 'jszip'
import type { ExtractedDocument, ExtractedImage } from './types'

// =============================================================================
// Configuration
// =============================================================================

// Timeout for ZIP/mammoth operations (30 seconds)
const PROCESS_TIMEOUT_MS = 30000

// Maximum file size (50MB)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId!)
  }
}

// =============================================================================
// Types
// =============================================================================

// Mammoth result type (not exported by the library)
interface MammothResult {
  value: string
  messages: Array<{ type: string; message: string }>
}

interface DocumentSection {
  title: string
  content: string
  pageNumber: number
}

// =============================================================================
// HTML Parsing Helpers
// =============================================================================

/**
 * Parse HTML content to extract structured sections based on headings
 */
function parseHTMLToSections(html: string): DocumentSection[] {
  const sections: DocumentSection[] = []

  // Split by heading tags (h1-h6)
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  const matches: { index: number; level: number; title: string }[] = []

  let match
  while ((match = headingRegex.exec(html)) !== null) {
    matches.push({
      index: match.index,
      level: parseInt(match[1], 10),
      title: stripHTMLTags(match[2]).trim(),
    })
  }

  if (matches.length === 0) {
    // No headings found, return entire content as single section
    const content = stripHTMLTags(html).trim()
    if (content) {
      sections.push({
        title: 'Document Content',
        content,
        pageNumber: 1,
      })
    }
    return sections
  }

  // Extract content between headings
  for (let i = 0; i < matches.length; i++) {
    const currentHeading = matches[i]
    const nextHeading = matches[i + 1]

    const startIndex = currentHeading.index
    const endIndex = nextHeading ? nextHeading.index : html.length

    // Get the HTML chunk between this heading and the next
    const chunk = html.substring(startIndex, endIndex)

    // Remove the heading itself from the chunk
    const headingEndRegex = new RegExp(`<\\/h${currentHeading.level}>`, 'i')
    const headingEndMatch = headingEndRegex.exec(chunk)
    const contentStart = headingEndMatch ? headingEndMatch.index + headingEndMatch[0].length : 0

    const content = stripHTMLTags(chunk.substring(contentStart)).trim()

    if (currentHeading.title || content) {
      sections.push({
        title: currentHeading.title || `Section ${i + 1}`,
        content,
        pageNumber: i + 1, // Approximate page number based on section index
      })
    }
  }

  // Handle content before the first heading
  if (matches[0].index > 0) {
    const preContent = stripHTMLTags(html.substring(0, matches[0].index)).trim()
    if (preContent) {
      sections.unshift({
        title: 'Introduction',
        content: preContent,
        pageNumber: 0,
      })
      // Re-number pages
      sections.forEach((section, index) => {
        section.pageNumber = index + 1
      })
    }
  }

  return sections
}

/**
 * Strip HTML tags from a string
 */
function stripHTMLTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<\/p>/gi, '\n\n') // Add paragraph breaks
    .replace(/<\/li>/gi, '\n') // Add line breaks after list items
    .replace(/<li[^>]*>/gi, '• ') // Add bullet points
    .replace(/<[^>]+>/g, '') // Remove all other tags
    .replace(/&nbsp;/gi, ' ') // Replace nbsp
    .replace(/&amp;/gi, '&') // Replace &
    .replace(/&lt;/gi, '<') // Replace <
    .replace(/&gt;/gi, '>') // Replace >
    .replace(/&quot;/gi, '"') // Replace "
    .replace(/&#39;/gi, "'") // Replace '
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()
}

/**
 * Estimate page count from content length
 * Assumes approximately 3000 characters per page
 */
function estimatePageCount(text: string): number {
  const charsPerPage = 3000
  return Math.max(1, Math.ceil(text.length / charsPerPage))
}

// =============================================================================
// Main Processor
// =============================================================================

/**
 * Extract images from DOCX file (stored in word/media folder)
 */
async function extractImagesFromDOCX(buffer: Buffer): Promise<ExtractedImage[]> {
  const extractedImages: ExtractedImage[] = []

  try {
    const zip = await withTimeout(
      JSZip.loadAsync(buffer),
      PROCESS_TIMEOUT_MS,
      'Image extraction from Word document timed out.'
    )
    const mediaFiles: { path: string; filename: string }[] = []

    zip.forEach((relativePath) => {
      if (relativePath.startsWith('word/media/')) {
        const filename = relativePath.split('/').pop() || ''
        // Only extract common image formats
        if (/\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i.test(filename)) {
          mediaFiles.push({ path: relativePath, filename })
        }
      }
    })

    // Extract images (limit to 20 to avoid memory issues)
    const maxImages = 20
    for (const mediaFile of mediaFiles.slice(0, maxImages)) {
      const file = zip.file(mediaFile.path)
      if (!file) continue

      try {
        const arrayBuffer = await file.async('arraybuffer')
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Determine MIME type from filename
        let mimeType = 'image/jpeg'
        const ext = mediaFile.filename.split('.').pop()?.toLowerCase()
        if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'webp') mimeType = 'image/webp'
        else if (ext === 'bmp') mimeType = 'image/bmp'
        else if (ext === 'tif' || ext === 'tiff') mimeType = 'image/tiff'

        extractedImages.push({
          data: base64,
          mimeType,
          filename: mediaFile.filename,
        })
      } catch {
        // Skip images that fail to extract
        console.warn(`Failed to extract image: ${mediaFile.filename}`)
      }
    }
  } catch {
    // Image extraction failed, continue without images
    console.warn('Failed to extract images from DOCX')
  }

  return extractedImages
}

/**
 * Process a Word document and extract all text content
 *
 * @param buffer - The DOCX file as a Buffer
 * @returns Extracted document with structured content
 * @throws Error if file is corrupted or unreadable
 */
export async function processDOCX(buffer: Buffer): Promise<ExtractedDocument> {
  // Validate file size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`)
  }

  let rawTextResult: MammothResult
  let htmlResult: MammothResult

  try {
    // Extract both raw text and HTML for structure with timeout protection
    ;[rawTextResult, htmlResult] = await withTimeout(
      Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]),
      PROCESS_TIMEOUT_MS,
      'Word document processing timed out. The file may be too large or corrupted.'
    )
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('encrypted') || error.message.includes('password')) {
        throw new Error('Password-protected Word documents are not supported')
      }
      throw new Error(`Failed to read Word document: ${error.message}`)
    }
    throw new Error('Failed to read Word document: Unknown error')
  }

  const rawText = rawTextResult.value.trim()

  // Check for empty documents
  if (!rawText || rawText.length < 10) {
    throw new Error('This Word document appears to be empty or contains no readable text')
  }

  // Parse HTML to extract structured sections
  const sections = parseHTMLToSections(htmlResult.value)

  // If no sections were extracted, create one from raw text
  if (sections.length === 0) {
    sections.push({
      title: 'Document Content',
      content: rawText,
      pageNumber: 1,
    })
  }

  // Try to extract document title from first heading or first line
  let documentTitle = ''
  if (sections.length > 0 && sections[0].title !== 'Document Content') {
    documentTitle = sections[0].title
  } else {
    // Use first non-empty line as title
    const firstLines = rawText.split('\n').slice(0, 5)
    for (const line of firstLines) {
      const trimmed = line.trim()
      if (trimmed.length > 3 && trimmed.length < 150) {
        documentTitle = trimmed
        break
      }
    }
  }

  // Extract images from the document
  const extractedImages = await extractImagesFromDOCX(buffer)

  // Build formatted content
  const formattedContent = sections
    .map((section) => `## ${section.title}\n\n${section.content}`)
    .join('\n\n---\n\n')

  // Estimate page count
  const estimatedPages = estimatePageCount(rawText)

  return {
    type: 'docx',
    title: documentTitle || 'Untitled Document',
    content: formattedContent,
    sections,
    metadata: {
      pageCount: Math.max(sections.length, estimatedPages),
    },
    images: extractedImages.length > 0 ? extractedImages : undefined,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a preview of the document (first few sections)
 */
export async function getDOCXPreview(
  buffer: Buffer,
  maxSections: number = 3
): Promise<{ title: string; sectionCount: number; preview: string }> {
  const doc = await processDOCX(buffer)

  const previewSections = doc.sections.slice(0, maxSections)
  const preview = previewSections
    .map((s) => `${s.title}\n${s.content.substring(0, 200)}...`)
    .join('\n\n')

  return {
    title: doc.title,
    sectionCount: doc.sections.length,
    preview,
  }
}

/**
 * Check if a buffer is a valid DOCX file
 * DOCX files are ZIP archives with specific structure
 */
export async function isValidDOCX(buffer: Buffer): Promise<boolean> {
  try {
    // Check for ZIP magic bytes (DOCX is a ZIP file)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return false
    }

    // Try to extract text
    await mammoth.extractRawText({ buffer })
    return true
  } catch {
    return false
  }
}
