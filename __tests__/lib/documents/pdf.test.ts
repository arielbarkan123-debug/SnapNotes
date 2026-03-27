/**
 * Tests for documents/pdf.ts
 *
 * Covers: isValidPDF (magic bytes), processPDF (throws).
 */

import { isValidPDF, processPDF, getPDFPreview } from '@/lib/documents/pdf'

describe('isValidPDF', () => {
  it('accepts a buffer starting with %PDF-', async () => {
    const buf = Buffer.from('%PDF-1.4 some content here')
    expect(await isValidPDF(buf)).toBe(true)
  })

  it('rejects a non-PDF buffer', async () => {
    const buf = Buffer.from('This is just plain text')
    expect(await isValidPDF(buf)).toBe(false)
  })

  it('rejects an empty buffer', async () => {
    const buf = Buffer.alloc(0)
    expect(await isValidPDF(buf)).toBe(false)
  })

  it('rejects a buffer with partial header (%PD)', async () => {
    const buf = Buffer.from('%PD')
    expect(await isValidPDF(buf)).toBe(false)
  })

  it('accepts exact 5-byte PDF header', async () => {
    const buf = Buffer.from('%PDF-')
    expect(await isValidPDF(buf)).toBe(true)
  })

  it('rejects a ZIP file (PK header)', async () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])
    expect(await isValidPDF(buf)).toBe(false)
  })
})

describe('processPDF', () => {
  it('throws an error saying PDF extraction is not supported', async () => {
    const buf = Buffer.from('%PDF-1.4 some content')
    await expect(processPDF(buf)).rejects.toThrow('PDF text extraction is not yet supported')
  })
})

describe('getPDFPreview', () => {
  it('throws an error saying preview is not supported', async () => {
    const buf = Buffer.from('%PDF-1.4 some content')
    await expect(getPDFPreview(buf)).rejects.toThrow('PDF preview is not yet supported')
  })
})
