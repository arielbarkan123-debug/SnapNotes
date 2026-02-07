'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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
    immediatelyRender: false,
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
        // Link is built into StarterKit v3 — configure here, not separately
        link: {
          openOnClick: true,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class: 'text-violet-600 dark:text-violet-400 underline cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
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
              if (href && /^https?:\/\//i.test(href)) {
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
        className="px-4 py-3 text-gray-900 dark:text-white overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap_p]:my-0 [&_.tiptap_p:not(:first-child)]:mt-2 [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_.tiptap]:min-h-[var(--min-height)]"
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
