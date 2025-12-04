/**
 * PowerPoint (PPTX) Document Processor
 *
 * Extracts text content from PowerPoint presentations.
 * PPTX files are ZIP archives containing XML files for each slide.
 *
 * Structure of a PPTX file:
 * - ppt/slides/slide1.xml, slide2.xml, etc. - Slide content
 * - ppt/slideMasters/ - Master slide templates
 * - docProps/core.xml - Document metadata (title, author, etc.)
 * - [Content_Types].xml - Content type definitions
 */

import JSZip from 'jszip'

// =============================================================================
// Types
// =============================================================================

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

interface SlideContent {
  slideNumber: number
  title: string
  content: string
  notes?: string
  /** Image references found in this slide */
  imageRefs?: string[]
}

// =============================================================================
// XML Parsing Helpers
// =============================================================================

/**
 * Extract text content from XML string
 * Handles the Office Open XML format used in PPTX files
 */
function extractTextFromXML(xml: string): string {
  const textParts: string[] = []

  // Match all <a:t> tags (text runs in Office Open XML)
  const textRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g
  let match

  while ((match = textRegex.exec(xml)) !== null) {
    const text = match[1].trim()
    if (text) {
      textParts.push(text)
    }
  }

  // Also match <a:t/> self-closing tags with text content (rare but possible)
  // And handle CDATA sections
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g
  while ((match = cdataRegex.exec(xml)) !== null) {
    const text = match[1].trim()
    if (text) {
      textParts.push(text)
    }
  }

  return textParts.join(' ')
}

/**
 * Extract slide title from XML
 * Titles are typically in <p:sp> elements with <p:ph type="title"/> or <p:ph type="ctrTitle"/>
 */
function extractTitleFromXML(xml: string): string {
  // Look for title placeholder
  const titlePlaceholderRegex = /<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*\/>/
  const hasTitlePlaceholder = titlePlaceholderRegex.test(xml)

  if (hasTitlePlaceholder) {
    // Find the shape containing the title placeholder and extract its text
    // This is a simplified approach - look for the first significant text block
    const shapeRegex = /<p:sp[^>]*>([\s\S]*?)<\/p:sp>/g
    let match

    while ((match = shapeRegex.exec(xml)) !== null) {
      const shapeContent = match[1]
      if (shapeContent.includes('type="title"') || shapeContent.includes('type="ctrTitle"')) {
        const titleText = extractTextFromXML(shapeContent)
        if (titleText) {
          return titleText
        }
      }
    }
  }

  // Fallback: try to get the first text element as title
  const firstTextMatch = /<a:t[^>]*>([^<]+)<\/a:t>/.exec(xml)
  if (firstTextMatch && firstTextMatch[1].trim().length > 0 && firstTextMatch[1].trim().length < 200) {
    return firstTextMatch[1].trim()
  }

  return ''
}

/**
 * Extract image references from slide XML
 * Images are referenced via r:embed attributes that point to relationship IDs
 */
function extractImageRefsFromXML(xml: string): string[] {
  const imageRefs: string[] = []

  // Match image references in blip elements (a:blip r:embed="rId...")
  const blipRegex = /r:embed="([^"]+)"/g
  let match

  while ((match = blipRegex.exec(xml)) !== null) {
    imageRefs.push(match[1])
  }

  return imageRefs
}

/**
 * Extract structured content from slide XML
 * Separates title from body content
 */
function parseSlideXML(xml: string, slideNumber: number): SlideContent {
  const title = extractTitleFromXML(xml)
  const allText = extractTextFromXML(xml)
  const imageRefs = extractImageRefsFromXML(xml)

  // Remove title from content if found
  let content = allText
  if (title && content.startsWith(title)) {
    content = content.substring(title.length).trim()
  }

  // Clean up content - remove excessive whitespace
  content = content.replace(/\s+/g, ' ').trim()

  return {
    slideNumber,
    title: title || `Slide ${slideNumber}`,
    content,
    imageRefs: imageRefs.length > 0 ? imageRefs : undefined,
  }
}

/**
 * Extract metadata from docProps/core.xml
 */
function parseMetadataXML(xml: string): { title?: string; author?: string; created?: string; modified?: string } {
  const metadata: { title?: string; author?: string; created?: string; modified?: string } = {}

  // Extract title
  const titleMatch = /<dc:title>([^<]*)<\/dc:title>/.exec(xml)
  if (titleMatch) {
    metadata.title = titleMatch[1].trim()
  }

  // Extract author/creator
  const creatorMatch = /<dc:creator>([^<]*)<\/dc:creator>/.exec(xml)
  if (creatorMatch) {
    metadata.author = creatorMatch[1].trim()
  }

  // Extract created date
  const createdMatch = /<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/.exec(xml)
  if (createdMatch) {
    metadata.created = createdMatch[1].trim()
  }

  // Extract modified date
  const modifiedMatch = /<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/.exec(xml)
  if (modifiedMatch) {
    metadata.modified = modifiedMatch[1].trim()
  }

  return metadata
}

/**
 * Extract notes from slide notes XML
 */
function parseNotesXML(xml: string): string {
  return extractTextFromXML(xml)
}

// =============================================================================
// Main Processor
// =============================================================================

/**
 * Process a PowerPoint file and extract all text content
 *
 * @param buffer - The PPTX file as a Buffer
 * @returns Extracted document with structured content
 * @throws Error if file is corrupted, password-protected, or empty
 */
export async function processPPTX(buffer: Buffer): Promise<ExtractedDocument> {
  let zip: JSZip

  // Try to open the ZIP archive
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('encrypted') || error.message.includes('password')) {
        throw new Error('Password-protected PowerPoint files are not supported')
      }
      throw new Error(`Failed to read PowerPoint file: ${error.message}`)
    }
    throw new Error('Failed to read PowerPoint file: Unknown error')
  }

  // Verify this is a valid PPTX file
  const contentTypes = zip.file('[Content_Types].xml')
  if (!contentTypes) {
    throw new Error('Invalid PowerPoint file: Missing content types')
  }

  // Check for presentation.xml to confirm it's a PPTX
  const presentation = zip.file('ppt/presentation.xml')
  if (!presentation) {
    throw new Error('Invalid PowerPoint file: Missing presentation data')
  }

  // Extract metadata
  let documentTitle = ''
  let author: string | undefined
  let createdDate: string | undefined
  let modifiedDate: string | undefined

  const corePropsFile = zip.file('docProps/core.xml')
  if (corePropsFile) {
    try {
      const corePropsXML = await corePropsFile.async('string')
      const metadata = parseMetadataXML(corePropsXML)
      documentTitle = metadata.title || ''
      author = metadata.author
      createdDate = metadata.created
      modifiedDate = metadata.modified
    } catch {
      // Metadata extraction failed, continue without it
    }
  }

  // Find all slide files
  const slideFiles: { path: string; number: number }[] = []
  zip.forEach((relativePath) => {
    const slideMatch = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/)
    if (slideMatch) {
      slideFiles.push({
        path: relativePath,
        number: parseInt(slideMatch[1], 10),
      })
    }
  })

  // Sort slides by number
  slideFiles.sort((a, b) => a.number - b.number)

  if (slideFiles.length === 0) {
    throw new Error('Empty PowerPoint file: No slides found')
  }

  // Process each slide
  const slides: SlideContent[] = []

  for (const slideFile of slideFiles) {
    const file = zip.file(slideFile.path)
    if (!file) continue

    try {
      const slideXML = await file.async('string')
      const slideContent = parseSlideXML(slideXML, slideFile.number)

      // Try to get notes for this slide
      const notesPath = `ppt/notesSlides/notesSlide${slideFile.number}.xml`
      const notesFile = zip.file(notesPath)
      if (notesFile) {
        try {
          const notesXML = await notesFile.async('string')
          slideContent.notes = parseNotesXML(notesXML)
        } catch {
          // Notes extraction failed, continue without them
        }
      }

      slides.push(slideContent)
    } catch {
      // Skip slides that fail to parse
      console.warn(`Failed to parse slide ${slideFile.number}`)
    }
  }

  if (slides.length === 0) {
    throw new Error('Failed to extract content from PowerPoint file')
  }

  // Use first slide title as document title if not set in metadata
  if (!documentTitle && slides[0].title) {
    documentTitle = slides[0].title
  }

  // Extract images from ppt/media folder
  const extractedImages: ExtractedImage[] = []
  const mediaFiles: { path: string; filename: string }[] = []

  zip.forEach((relativePath) => {
    if (relativePath.startsWith('ppt/media/')) {
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

  // Build sections from slides
  const sections = slides.map((slide) => ({
    title: slide.title,
    content: slide.notes ? `${slide.content}\n\nNotes: ${slide.notes}` : slide.content,
    pageNumber: slide.slideNumber,
  }))

  // Build full content string
  const contentParts = slides.map((slide) => {
    let slideText = `## Slide ${slide.slideNumber}: ${slide.title}\n\n${slide.content}`
    if (slide.notes) {
      slideText += `\n\n**Speaker Notes:** ${slide.notes}`
    }
    return slideText
  })

  const fullContent = contentParts.join('\n\n---\n\n')

  return {
    type: 'pptx',
    title: documentTitle || 'Untitled Presentation',
    content: fullContent,
    sections,
    metadata: {
      pageCount: slides.length,
      author,
      createdDate,
      modifiedDate,
    },
    images: extractedImages.length > 0 ? extractedImages : undefined,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a preview of the presentation (first few slides)
 */
export async function getPPTXPreview(
  buffer: Buffer,
  maxSlides: number = 3
): Promise<{ title: string; slideCount: number; preview: string }> {
  const doc = await processPPTX(buffer)

  const previewSections = doc.sections.slice(0, maxSlides)
  const preview = previewSections
    .map((s) => `Slide ${s.pageNumber}: ${s.title}\n${s.content.substring(0, 200)}...`)
    .join('\n\n')

  return {
    title: doc.title,
    slideCount: doc.metadata.pageCount,
    preview,
  }
}

/**
 * Check if a buffer is a valid PPTX file
 */
export async function isValidPPTX(buffer: Buffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const hasContentTypes = zip.file('[Content_Types].xml') !== null
    const hasPresentation = zip.file('ppt/presentation.xml') !== null
    return hasContentTypes && hasPresentation
  } catch {
    return false
  }
}
