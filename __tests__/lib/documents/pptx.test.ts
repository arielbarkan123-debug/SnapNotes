/**
 * Tests for documents/pptx.ts
 *
 * Creates real PPTX buffers in-memory with JSZip.
 * Covers: processPPTX, isValidPPTX, slide ordering, metadata, error cases.
 */

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

import JSZip from 'jszip'
import { processPPTX, isValidPPTX } from '@/lib/documents/pptx'

/**
 * Build a minimal valid PPTX buffer with the given slides.
 */
async function buildPPTX(options: {
  slides?: Array<{ number: number; title?: string; body?: string }>
  metadata?: { title?: string; author?: string }
}): Promise<Buffer> {
  const zip = new JSZip()

  // Content types
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
</Types>`
  )

  // Presentation file
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
</p:presentation>`
  )

  // Metadata (docProps/core.xml)
  if (options.metadata) {
    zip.file(
      'docProps/core.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/">
  ${options.metadata.title ? `<dc:title>${options.metadata.title}</dc:title>` : ''}
  ${options.metadata.author ? `<dc:creator>${options.metadata.author}</dc:creator>` : ''}
</cp:coreProperties>`
    )
  }

  // Slides
  const slides = options.slides || []
  for (const slide of slides) {
    const titleXml = slide.title
      ? `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${slide.title}</a:t></a:r></a:p></p:txBody></p:sp>`
      : ''
    const bodyXml = slide.body
      ? `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${slide.body}</a:t></a:r></a:p></p:txBody></p:sp>`
      : ''

    zip.file(
      `ppt/slides/slide${slide.number}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      ${titleXml}
      ${bodyXml}
    </p:spTree>
  </p:cSld>
</p:sld>`
    )
  }

  const arrayBuf = await zip.generateAsync({ type: 'arraybuffer' })
  return Buffer.from(arrayBuf)
}

describe('processPPTX', () => {
  it('extracts content from a single slide', async () => {
    const buf = await buildPPTX({
      slides: [{ number: 1, title: 'Hello World', body: 'Some content here' }],
    })
    const doc = await processPPTX(buf)
    expect(doc.type).toBe('pptx')
    expect(doc.content).toContain('Hello World')
    expect(doc.content).toContain('Some content here')
    expect(doc.metadata.pageCount).toBe(1)
  })

  it('extracts slides in correct order', async () => {
    const buf = await buildPPTX({
      slides: [
        { number: 3, title: 'Third', body: 'C' },
        { number: 1, title: 'First', body: 'A' },
        { number: 2, title: 'Second', body: 'B' },
      ],
    })
    const doc = await processPPTX(buf)
    expect(doc.metadata.pageCount).toBe(3)
    // Sections should be sorted by slide number
    expect(doc.sections[0].title).toContain('First')
    expect(doc.sections[1].title).toContain('Second')
    expect(doc.sections[2].title).toContain('Third')
  })

  it('extracts metadata (title, author)', async () => {
    const buf = await buildPPTX({
      slides: [{ number: 1, title: 'My Presentation', body: 'Content' }],
      metadata: { title: 'Test Deck', author: 'Test Author' },
    })
    const doc = await processPPTX(buf)
    expect(doc.title).toBe('Test Deck')
  })

  it('uses first slide title as document title when metadata is missing', async () => {
    const buf = await buildPPTX({
      slides: [{ number: 1, title: 'Slide One Title', body: 'Body text' }],
    })
    const doc = await processPPTX(buf)
    expect(doc.title).toContain('Slide One Title')
  })

  it('throws on invalid ZIP', async () => {
    const buf = Buffer.from('this is not a zip file')
    await expect(processPPTX(buf)).rejects.toThrow()
  })

  it('throws when presentation.xml is missing', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types/>')
    // No ppt/presentation.xml
    const arrayBuf = await zip.generateAsync({ type: 'arraybuffer' })
    const buf = Buffer.from(arrayBuf)
    await expect(processPPTX(buf)).rejects.toThrow('Missing presentation data')
  })

  it('throws when no slides are found', async () => {
    const buf = await buildPPTX({ slides: [] })
    await expect(processPPTX(buf)).rejects.toThrow('No slides found')
  })

  it('returns correct page count', async () => {
    const buf = await buildPPTX({
      slides: [
        { number: 1, title: 'S1' },
        { number: 2, title: 'S2' },
        { number: 3, title: 'S3' },
        { number: 4, title: 'S4' },
        { number: 5, title: 'S5' },
      ],
    })
    const doc = await processPPTX(buf)
    expect(doc.metadata.pageCount).toBe(5)
  })
})

describe('isValidPPTX', () => {
  it('returns true for a valid PPTX', async () => {
    const buf = await buildPPTX({
      slides: [{ number: 1, title: 'Test' }],
    })
    expect(await isValidPPTX(buf)).toBe(true)
  })

  it('returns false for a non-ZIP buffer', async () => {
    const buf = Buffer.from('not a zip')
    expect(await isValidPPTX(buf)).toBe(false)
  })

  it('returns false for a ZIP without presentation.xml', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types/>')
    zip.file('random.txt', 'hello')
    const arrayBuf = await zip.generateAsync({ type: 'arraybuffer' })
    const buf = Buffer.from(arrayBuf)
    expect(await isValidPPTX(buf)).toBe(false)
  })
})
