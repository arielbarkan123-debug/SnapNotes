import { editorJsonToMarkdown, markdownToEditorHtml, getPlainTextLength } from '@/lib/rich-text-utils'

describe('editorJsonToMarkdown', () => {
  it('converts plain text to plain text', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    }
    expect(editorJsonToMarkdown(json)).toBe('Hello world')
  })

  it('converts linked text to markdown links', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Click ' },
            {
              type: 'text',
              text: 'here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
            { type: 'text', text: ' to view' },
          ],
        },
      ],
    }
    expect(editorJsonToMarkdown(json)).toBe('Click [here](https://example.com) to view')
  })

  it('handles multiple paragraphs with newlines', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line one' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line two' }],
        },
      ],
    }
    expect(editorJsonToMarkdown(json)).toBe('Line one\n\nLine two')
  })

  it('handles empty document', () => {
    const json = { type: 'doc', content: [] }
    expect(editorJsonToMarkdown(json)).toBe('')
  })

  it('handles bare URLs as links', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'https://docs.google.com/document/d/abc123',
              marks: [{ type: 'link', attrs: { href: 'https://docs.google.com/document/d/abc123' } }],
            },
          ],
        },
      ],
    }
    // When link text === href, just output the URL (no markdown wrapping)
    expect(editorJsonToMarkdown(json)).toBe('https://docs.google.com/document/d/abc123')
  })
})

describe('markdownToEditorHtml', () => {
  it('converts plain text to HTML', () => {
    expect(markdownToEditorHtml('Hello world')).toBe('<p>Hello world</p>')
  })

  it('converts markdown links to anchor tags', () => {
    expect(markdownToEditorHtml('Click [here](https://example.com) to view')).toBe(
      '<p>Click <a href="https://example.com">here</a> to view</p>'
    )
  })

  it('converts bare URLs to anchor tags', () => {
    const input = 'Visit https://example.com for details'
    const result = markdownToEditorHtml(input)
    expect(result).toContain('<a href="https://example.com">https://example.com</a>')
  })

  it('handles multiple paragraphs', () => {
    expect(markdownToEditorHtml('Line one\n\nLine two')).toBe('<p>Line one</p><p>Line two</p>')
  })

  it('handles empty string', () => {
    expect(markdownToEditorHtml('')).toBe('')
  })
})

describe('getPlainTextLength', () => {
  it('counts text without link URLs', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Click ' },
            {
              type: 'text',
              text: 'here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
      ],
    }
    expect(getPlainTextLength(json)).toBe(10) // "Click here"
  })
})
