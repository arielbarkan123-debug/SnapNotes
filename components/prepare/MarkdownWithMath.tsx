'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { MathText } from '@/components/ui/MathRenderer'

/**
 * Processes React children to replace text content containing
 * LaTeX math ($...$, $$...$$) with KaTeX-rendered output.
 * Non-string children (React elements) are passed through unchanged.
 */
function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string' && child.includes('$')) {
      return <MathText>{child}</MathText>
    }
    return child
  })
}

interface MarkdownWithMathProps {
  children: string
  className?: string
}

/**
 * Renders Markdown content with inline/block LaTeX math support.
 * Uses ReactMarkdown for markdown parsing and KaTeX (via MathText) for
 * $...$ (inline) and $$...$$ (block) math expressions.
 */
export default function MarkdownWithMath({ children, className }: MarkdownWithMathProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children: c }) => <p>{processChildren(c)}</p>,
          li: ({ children: c }) => <li>{processChildren(c)}</li>,
          td: ({ children: c }) => <td>{processChildren(c)}</td>,
          th: ({ children: c }) => <th>{processChildren(c)}</th>,
          // Don't process math inside code blocks
          code: ({ children: c, className: cn }) => {
            if (cn?.includes('language-')) {
              return <code className={cn}>{c}</code>
            }
            return <code>{c}</code>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
