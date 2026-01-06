'use client'

import { useEffect, useState } from 'react'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  math: string
  block?: boolean
  className?: string
}

/**
 * Renders LaTeX math using KaTeX with DOMPurify sanitization
 * @param math - LaTeX string to render
 * @param block - If true, renders as block (display) math; otherwise inline
 */
export function MathRenderer({ math, block = false, className = '' }: MathRendererProps) {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const rendered = katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: true,
      })
      // Sanitize KaTeX output with DOMPurify for security
      const sanitized = DOMPurify.sanitize(rendered, {
        ADD_TAGS: ['semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'annotation'],
        ADD_ATTR: ['encoding', 'mathvariant', 'stretchy', 'fence', 'separator', 'accent'],
      })
      setHtml(sanitized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render math')
      setHtml('')
    }
  }, [math, block])

  if (error) {
    return <span className="text-red-500 font-mono text-sm">{math}</span>
  }

  return (
    <span
      className={`math-renderer ${block ? 'block my-2' : 'inline'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Parses text containing inline $...$ and block $$...$$ math expressions
 * and renders them with KaTeX while keeping regular text as-is
 */
interface MathTextProps {
  children: string
  className?: string
}

export function MathText({ children, className = '' }: MathTextProps) {
  if (!children) return null

  // Split by math delimiters while keeping the delimiters
  // Match $$...$$ (block) first, then $...$ (inline)
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null

        // Block math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim()
          return (
            <span key={index} className="block my-2">
              <MathRenderer math={math} block />
            </span>
          )
        }

        // Inline math: $...$
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1)
          return <MathRenderer key={index} math={math} />
        }

        // Regular text
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

/**
 * Inline math shorthand component
 */
export function InlineMath({ children }: { children: string }) {
  return <MathRenderer math={children} block={false} />
}

/**
 * Block math shorthand component
 */
export function BlockMath({ children }: { children: string }) {
  return <MathRenderer math={children} block={true} />
}
