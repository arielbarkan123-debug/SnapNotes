'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { MathRenderer } from '@/components/ui/MathRenderer'

/**
 * Extracts $...$ and $$...$$ math from raw text, replacing them with
 * placeholder tokens so ReactMarkdown won't mangle backslashes.
 */
function extractMath(text: string) {
  const mathMap = new Map<string, { latex: string; block: boolean }>()
  let counter = 0

  // Block math first: $$...$$
  let processed = text.replace(/\$\$[\s\S]+?\$\$/g, (match) => {
    const key = `%%MATH_${counter++}%%`
    mathMap.set(key, { latex: match.slice(2, -2).trim(), block: true })
    return key
  })

  // Inline math: $...$  (not inside words, not empty)
  processed = processed.replace(/\$([^$\n]+?)\$/g, (match, inner) => {
    if (!inner.trim()) return match
    const key = `%%MATH_${counter++}%%`
    mathMap.set(key, { latex: inner, block: false })
    return key
  })

  return { processed, mathMap }
}

/**
 * Walks React children and replaces %%MATH_N%% placeholders
 * with rendered KaTeX MathRenderer components.
 */
function processChildren(
  children: React.ReactNode,
  mathMap: Map<string, { latex: string; block: boolean }>
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child

    // Fast path: no placeholders in this string
    if (!child.includes('%%MATH_')) return child

    const parts = child.split(/(%%MATH_\d+%%)/g)
    return parts.map((part, i) => {
      const entry = mathMap.get(part)
      if (entry) {
        return entry.block ? (
          <span key={i} className="block my-2">
            <MathRenderer math={entry.latex} block />
          </span>
        ) : (
          <MathRenderer key={i} math={entry.latex} />
        )
      }
      return part || null
    })
  })
}

interface MarkdownWithMathProps {
  children: string
  className?: string
}

/**
 * Renders Markdown content with inline/block LaTeX math support.
 *
 * Strategy: extract $...$ math into placeholders BEFORE markdown parsing
 * so ReactMarkdown never strips LaTeX backslashes. After rendering,
 * placeholders in text nodes are replaced with KaTeX components.
 */
export default function MarkdownWithMath({ children, className }: MarkdownWithMathProps) {
  const { processed, mathMap } = useMemo(() => extractMath(children), [children])

  const proc = (c: React.ReactNode) => processChildren(c, mathMap)

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children: c }) => <p>{proc(c)}</p>,
          li: ({ children: c }) => <li>{proc(c)}</li>,
          td: ({ children: c }) => <td>{proc(c)}</td>,
          th: ({ children: c }) => <th>{proc(c)}</th>,
          h1: ({ children: c }) => <h1>{proc(c)}</h1>,
          h2: ({ children: c }) => <h2>{proc(c)}</h2>,
          h3: ({ children: c }) => <h3>{proc(c)}</h3>,
          h4: ({ children: c }) => <h4>{proc(c)}</h4>,
          strong: ({ children: c }) => <strong>{proc(c)}</strong>,
          em: ({ children: c }) => <em>{proc(c)}</em>,
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 underline hover:text-violet-800 dark:hover:text-violet-300"
            >
              {c}
            </a>
          ),
          code: ({ children: c, className: cn }) => {
            if (cn?.includes('language-')) {
              return <code className={cn}>{c}</code>
            }
            return <code>{c}</code>
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
