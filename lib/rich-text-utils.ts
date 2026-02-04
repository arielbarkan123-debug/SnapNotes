/**
 * Utilities for converting between Tiptap editor JSON, markdown (with links),
 * and HTML. These keep the RichTextInput component's value format as markdown
 * strings with [label](url) links so existing API calls don't need to change.
 */

interface TiptapMark {
  type: string
  attrs?: Record<string, string>
}

interface TiptapNode {
  type: string
  text?: string
  marks?: TiptapMark[]
  content?: TiptapNode[]
}

/**
 * Convert Tiptap editor JSON to markdown string.
 * Links become [text](url). If link text === url, just output the bare URL.
 */
export function editorJsonToMarkdown(doc: TiptapNode): string {
  if (!doc.content || doc.content.length === 0) return ''

  const paragraphs: string[] = []

  for (const node of doc.content) {
    if (node.type === 'paragraph') {
      paragraphs.push(nodeContentToMarkdown(node.content || []))
    }
  }

  return paragraphs.join('\n\n')
}

function nodeContentToMarkdown(content: TiptapNode[]): string {
  let result = ''
  for (const node of content) {
    if (node.type === 'text' && node.text) {
      const linkMark = node.marks?.find((m) => m.type === 'link')
      if (linkMark?.attrs?.href) {
        const href = linkMark.attrs.href
        // If link text is the same as URL, output bare URL
        if (node.text === href) {
          result += href
        } else {
          result += `[${node.text}](${href})`
        }
      } else {
        result += node.text
      }
    } else if (node.type === 'hardBreak') {
      result += '\n'
    }
  }
  return result
}

/**
 * Convert markdown string (with [label](url) links) to HTML for Tiptap.
 * Also auto-links bare URLs. Uses string replacement only — no raw innerHTML.
 */
export function markdownToEditorHtml(markdown: string): string {
  if (!markdown) return ''

  const paragraphs = markdown.split(/\n\n+/)
  const htmlParts: string[] = []

  for (const para of paragraphs) {
    // Extract markdown links first into placeholders to avoid double-linking
    const links: string[] = []
    let withPlaceholders = para.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, text, url) => {
        // Only allow http/https URLs to prevent javascript: URI injection
        if (!/^https?:\/\//i.test(url)) return escapeHtml(text)
        const idx = links.length
        links.push(`<a href="${url}">${escapeHtml(text)}</a>`)
        return `%%LINK_${idx}%%`
      }
    )

    // Escape remaining HTML
    withPlaceholders = escapeHtml(withPlaceholders)

    // Auto-link bare URLs (won't match placeholders)
    withPlaceholders = withPlaceholders.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1">$1</a>'
    )

    // Restore markdown link placeholders
    let html = withPlaceholders.replace(/%%LINK_(\d+)%%/g, (_m, idx) => links[Number(idx)])

    // Convert single newlines to <br>
    html = html.replace(/\n/g, '<br>')

    htmlParts.push(`<p>${html}</p>`)
  }

  return htmlParts.join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Count plain text characters (excluding link URLs, just visible text).
 * Used for character count display.
 */
export function getPlainTextLength(doc: TiptapNode): number {
  if (!doc.content) return 0

  let length = 0
  for (const node of doc.content) {
    if (node.content) {
      for (const child of node.content) {
        if (child.type === 'text' && child.text) {
          length += child.text.length
        }
      }
    }
  }
  return length
}
