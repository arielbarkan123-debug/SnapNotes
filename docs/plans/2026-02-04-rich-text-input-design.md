# Rich Text Input with Link Preservation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace plain textareas with a Tiptap-based rich text input that preserves hyperlinks when users paste content from Google Docs, emails, and websites — so links appear blue/clickable and the AI model receives them as URLs.

**Architecture:** A single reusable `RichTextInput` component built on Tiptap (ProseMirror) configured as "links-only" (no bold/italic/lists). The component accepts and emits markdown strings with `[label](url)` link format, so existing state variables and API calls don't change. It replaces `<textarea>` in 4 locations across Prepare and Homework features.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/pm`), Next.js 14, React 18, Tailwind CSS, RTL support

**Security Note:** All pasted HTML is sanitized through Tiptap's built-in ProseMirror schema which only allows whitelisted node types (paragraph, text, link). This is not raw innerHTML — Tiptap parses HTML into its document model and only permits configured extensions. The `transformPastedHTML` hook uses DOMParser for safe HTML processing.

---

### Task 1: Install Tiptap Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/pm
```

Expected: packages added to `package.json` dependencies, no errors

**Step 2: Verify install**

Run:
```bash
node -e "require('@tiptap/react'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Tiptap rich text editor dependencies"
```

---

### Task 2: Create Rich Text Utility Functions

**Files:**
- Create: `lib/rich-text-utils.ts`
- Create: `__tests__/lib/rich-text-utils.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/lib/rich-text-utils.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npx jest __tests__/lib/rich-text-utils.test.ts --no-coverage 2>&1 | head -20
```

Expected: FAIL — module `@/lib/rich-text-utils` not found

**Step 3: Implement the utility functions**

Create `lib/rich-text-utils.ts`:

```typescript
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
    let html = escapeHtml(para)

    // Convert markdown links [text](url) to <a> tags
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>'
    )

    // Auto-link bare URLs that aren't already inside <a> tags
    html = html.replace(
      /(?<!href=&quot;|&quot;&gt;)(https?:\/\/[^\s<]+)/g,
      '<a href="$1">$1</a>'
    )

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
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npx jest __tests__/lib/rich-text-utils.test.ts --no-coverage
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/rich-text-utils.ts __tests__/lib/rich-text-utils.test.ts
git commit -m "feat: add rich text utility functions for link preservation"
```

---

### Task 3: Create the RichTextInput Component

**Files:**
- Create: `components/ui/RichTextInput.tsx`

**Step 1: Create the component**

Create `components/ui/RichTextInput.tsx`. The component uses Tiptap's built-in ProseMirror schema for HTML sanitization — only configured extensions (paragraph, text, link) are allowed. The `transformPastedHTML` hook uses the browser's DOMParser for safe parsing, never raw innerHTML assignment.

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { editorJsonToMarkdown, markdownToEditorHtml, getPlainTextLength } from '@/lib/rich-text-utils'

interface RichTextInputProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: string
  maxLength?: number
  className?: string
}

export default function RichTextInput({
  value,
  onChange,
  placeholder = '',
  minHeight = '160px',
  maxLength,
  className = '',
}: RichTextInputProps) {
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable all formatting — we only want plain text + links
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-violet-600 dark:text-violet-400 underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownToEditorHtml(value),
    editorProps: {
      attributes: {
        class: 'outline-none h-full',
        dir: 'auto',
      },
      // Strip all formatting on paste except links.
      // Uses DOMParser for safe HTML parsing — Tiptap's schema then
      // filters to only allow configured node types (paragraph, text, link).
      transformPastedHTML(html: string) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        function cleanNode(node: Node): string {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || ''
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            const tag = el.tagName.toLowerCase()
            const childContent = Array.from(el.childNodes).map(cleanNode).join('')

            if (tag === 'a') {
              const href = el.getAttribute('href')
              if (href) {
                return `<a href="${encodeURI(href)}">${childContent}</a>`
              }
            }
            if (tag === 'br') return '<br>'
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tag)) {
              return `<p>${childContent}</p>`
            }
            return childContent
          }
          return ''
        }

        return Array.from(doc.body.childNodes).map(cleanNode).join('')
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isUpdatingRef.current) return
      const json = ed.getJSON()
      const markdown = editorJsonToMarkdown(json)
      onChange(markdown)
    },
  })

  // Sync external value changes into editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const currentMarkdown = editorJsonToMarkdown(editor.getJSON())
    if (value !== currentMarkdown) {
      isUpdatingRef.current = true
      editor.commands.setContent(markdownToEditorHtml(value))
      isUpdatingRef.current = false
    }
  }, [value, editor])

  const charCount = editor ? getPlainTextLength(editor.getJSON()) : 0

  return (
    <div className={`relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all ${className}`}>
      <EditorContent
        editor={editor}
        className="px-4 py-3 text-gray-900 dark:text-white overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap_p]:my-0 [&_.tiptap_p:not(:first-child)]:mt-2 [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-right [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_.tiptap]:min-h-[var(--min-height)]"
        style={{ '--min-height': minHeight } as React.CSSProperties}
      />
      {maxLength !== undefined && (
        <div className="px-4 py-1.5 text-end">
          <span className={`text-xs ${charCount > maxLength ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} characters
          </span>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify it builds**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "RichTextInput" | head -10
```

Expected: No errors related to RichTextInput (pre-existing errors in test files are OK)

**Step 3: Commit**

```bash
git add components/ui/RichTextInput.tsx
git commit -m "feat: create RichTextInput component with Tiptap link support"
```

---

### Task 4: Integrate into PrepareUploadModal

**Files:**
- Modify: `components/prepare/PrepareUploadModal.tsx`

**Step 1: Replace textarea with RichTextInput**

In `components/prepare/PrepareUploadModal.tsx`:

1. Add import at the top (after existing imports):
```typescript
import RichTextInput from '@/components/ui/RichTextInput'
```

2. Remove the `handlePaste` callback (lines 126-155 — the entire `const handlePaste = useCallback(...)` block).

3. Replace the textarea element (lines 490-496):

Replace:
```tsx
<textarea
  value={textContent}
  onChange={(e) => setTextContent(e.target.value)}
  onPaste={handlePaste}
  placeholder={t('generate.textPlaceholder')}
  className="w-full h-64 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
/>
```

With:
```tsx
<RichTextInput
  value={textContent}
  onChange={setTextContent}
  placeholder={t('generate.textPlaceholder')}
  minHeight="256px"
/>
```

4. The character count display (lines 508-511) stays as-is — it already reads `textContent.length`.

**Step 2: Verify it builds**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "PrepareUploadModal\|RichTextInput" | head -10
```

Expected: No errors

**Step 3: Test manually**

Run:
```bash
npm run dev
```

Open `http://localhost:3000/prepare`, click "Create Study Guide", select "Paste Text", paste text containing links from a Google Doc or website. Verify links appear blue and clickable.

**Step 4: Commit**

```bash
git add components/prepare/PrepareUploadModal.tsx
git commit -m "feat: replace textarea with RichTextInput in PrepareUploadModal"
```

---

### Task 5: Integrate into HomeworkCheckPage

**Files:**
- Modify: `app/(main)/homework/check/page.tsx`

**Step 1: Replace both textareas**

In `app/(main)/homework/check/page.tsx`:

1. Add import at the top:
```typescript
import RichTextInput from '@/components/ui/RichTextInput'
```

2. Replace the `taskText` textarea:

Replace:
```tsx
<textarea
  value={taskText}
  onChange={(e) => onTaskTextChange(e.target.value)}
  placeholder={t('inputMode.taskTextPlaceholder')}
  rows={6}
  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
/>
```

With:
```tsx
<RichTextInput
  value={taskText}
  onChange={onTaskTextChange}
  placeholder={t('inputMode.taskTextPlaceholder')}
  minHeight="144px"
/>
```

3. Replace the `answerText` textarea:

Replace:
```tsx
<textarea
  value={answerText}
  onChange={(e) => onAnswerTextChange(e.target.value)}
  placeholder={t('inputMode.answerTextPlaceholder')}
  rows={4}
  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
/>
```

With:
```tsx
<RichTextInput
  value={answerText}
  onChange={onAnswerTextChange}
  placeholder={t('inputMode.answerTextPlaceholder')}
  minHeight="96px"
/>
```

**Step 2: Verify it builds**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "homework/check" | head -10
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/\(main\)/homework/check/page.tsx
git commit -m "feat: replace textareas with RichTextInput in HomeworkCheckPage"
```

---

### Task 6: Integrate into HomeworkHelpPage

**Files:**
- Modify: `app/(main)/homework/help/page.tsx`

**Step 1: Replace the questionText textarea**

In `app/(main)/homework/help/page.tsx`:

1. Add import at the top:
```typescript
import RichTextInput from '@/components/ui/RichTextInput'
```

2. Replace the `questionText` textarea:

Replace:
```tsx
<textarea
  value={questionText}
  onChange={(e) => onChange(e.target.value)}
  placeholder="Paste or type your homework question here...

Example:
Solve for x: 2x + 5 = 13

Or:
Find the derivative of f(x) = 3x² + 2x - 5"
  rows={6}
  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
/>
```

With:
```tsx
<RichTextInput
  value={questionText}
  onChange={onChange}
  placeholder="Paste or type your homework question here..."
  minHeight="144px"
/>
```

**Step 2: Verify it builds**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "homework/help" | head -10
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/\(main\)/homework/help/page.tsx
git commit -m "feat: replace textarea with RichTextInput in HomeworkHelpPage"
```

---

### Task 7: Deploy and Verify

**Step 1: Run full type check**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | tail -5
```

Expected: Only pre-existing test file errors (FullScreenDiagramView.test.tsx), no new errors

**Step 2: Run tests**

Run:
```bash
npx jest __tests__/lib/rich-text-utils.test.ts --no-coverage
```

Expected: All tests PASS

**Step 3: Deploy to production**

Run:
```bash
vercel --prod
```

Expected: Build succeeds, deployed to production

**Step 4: Verify on production**

Open https://snap-notes-j68u-three.vercel.app/prepare, create a new guide, paste text with links from Google Docs. Verify:
- Links appear blue and clickable in the input
- Links are preserved when guide is generated
- Character count works
- RTL text works

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: polish RichTextInput after production testing"
```
