/**
 * Tests for documents/docx.ts
 *
 * Mocks mammoth for controlled testing.
 * Covers: processDOCX, isValidDOCX, sections, title detection, edge cases.
 */

// Mock mammoth
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
  convertToHtml: jest.fn(),
}))

// Mock JSZip for image extraction in processDOCX
jest.mock('jszip', () => {
  const mockZip = {
    forEach: jest.fn(),
    file: jest.fn(() => null),
  }
  return {
    __esModule: true,
    default: {
      loadAsync: jest.fn(() => Promise.resolve(mockZip)),
    },
  }
})

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

import mammoth from 'mammoth'
import { processDOCX, isValidDOCX } from '@/lib/documents/docx'

const mockExtractRawText = mammoth.extractRawText as jest.Mock
const mockConvertToHtml = mammoth.convertToHtml as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('processDOCX', () => {
  it('extracts heading-based sections from HTML', async () => {
    mockExtractRawText.mockResolvedValue({
      value: 'Introduction content\nChapter 1 content here',
      messages: [],
    })
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Introduction</h1><p>Introduction content</p><h2>Chapter 1</h2><p>Chapter 1 content here</p>',
      messages: [],
    })

    const buf = Buffer.from('dummy docx content that is long enough to pass')
    const doc = await processDOCX(buf)

    expect(doc.type).toBe('docx')
    expect(doc.sections.length).toBeGreaterThanOrEqual(2)
    expect(doc.sections[0].title).toBe('Introduction')
    expect(doc.sections[1].title).toBe('Chapter 1')
  })

  it('detects document title from first heading', async () => {
    mockExtractRawText.mockResolvedValue({
      value: 'My Document Title\nSome body text that is long enough to pass.',
      messages: [],
    })
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>My Document Title</h1><p>Some body text that is long enough to pass.</p>',
      messages: [],
    })

    const buf = Buffer.from('dummy docx content that is long enough to pass')
    const doc = await processDOCX(buf)

    expect(doc.title).toBe('My Document Title')
  })

  it('falls back to first line as title when no headings', async () => {
    const text = 'A Short Title Line\nLots of body text here that continues for a while and fills the page.'
    mockExtractRawText.mockResolvedValue({
      value: text,
      messages: [],
    })
    mockConvertToHtml.mockResolvedValue({
      value: `<p>${text}</p>`,
      messages: [],
    })

    const buf = Buffer.from('dummy docx content that is long enough to pass')
    const doc = await processDOCX(buf)

    // Should either use 'Document Content' section title fallback or
    // first line as document title
    expect(doc.title).toBe('A Short Title Line')
  })

  it('throws for empty document', async () => {
    mockExtractRawText.mockResolvedValue({ value: '', messages: [] })
    mockConvertToHtml.mockResolvedValue({ value: '', messages: [] })

    const buf = Buffer.from('dummy docx')
    await expect(processDOCX(buf)).rejects.toThrow('empty or contains no readable text')
  })

  it('throws for very short document', async () => {
    mockExtractRawText.mockResolvedValue({ value: 'Hi', messages: [] })
    mockConvertToHtml.mockResolvedValue({ value: '<p>Hi</p>', messages: [] })

    const buf = Buffer.from('dummy docx')
    await expect(processDOCX(buf)).rejects.toThrow('empty or contains no readable text')
  })

  it('throws for oversized file', async () => {
    // 51MB buffer
    const buf = Buffer.alloc(51 * 1024 * 1024)
    await expect(processDOCX(buf)).rejects.toThrow('File too large')
  })

  it('creates single section when no headings found', async () => {
    const text = 'This is a document with no headings but enough text to be valid for parsing.'
    mockExtractRawText.mockResolvedValue({
      value: text,
      messages: [],
    })
    mockConvertToHtml.mockResolvedValue({
      value: `<p>${text}</p>`,
      messages: [],
    })

    const buf = Buffer.from('dummy docx content')
    const doc = await processDOCX(buf)

    expect(doc.sections.length).toBeGreaterThanOrEqual(1)
    expect(doc.sections[0].title).toBe('Document Content')
  })
})

describe('isValidDOCX', () => {
  it('returns false for non-ZIP buffer (wrong magic bytes)', async () => {
    const buf = Buffer.from('This is plain text, not a DOCX')
    expect(await isValidDOCX(buf)).toBe(false)
  })

  it('returns true when mammoth can extract text (with ZIP magic bytes)', async () => {
    // Build a buffer with ZIP magic bytes (PK header)
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from('rest of data')])
    mockExtractRawText.mockResolvedValue({ value: 'Some content', messages: [] })

    expect(await isValidDOCX(buf)).toBe(true)
  })

  it('returns false when mammoth throws (with ZIP magic bytes)', async () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from('corrupt data')])
    mockExtractRawText.mockRejectedValue(new Error('Cannot read'))

    expect(await isValidDOCX(buf)).toBe(false)
  })
})
