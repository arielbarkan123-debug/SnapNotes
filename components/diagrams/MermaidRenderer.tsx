'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import DOMPurify from 'dompurify'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MermaidRendererProps {
  definition: string
  title?: string
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Safe SVG injection helper
// Uses DOMPurify to sanitize mermaid SVG output before DOM insertion
// ---------------------------------------------------------------------------

function injectSanitizedSvg(container: HTMLElement, rawSvg: string): void {
  // Sanitize with DOMPurify SVG profile to prevent XSS
  const cleanSvg = DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
  })
  // Safe: content is sanitized by DOMPurify before injection
  container.textContent = ''
  const template = document.createElement('template')
  template.innerHTML = cleanSvg
  const fragment = template.content
  container.appendChild(fragment)
}

// ---------------------------------------------------------------------------
// Module-level mermaid theme tracker (avoid re-initializing on every render)
// ---------------------------------------------------------------------------

let lastMermaidTheme: string | null = null

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MermaidRenderer({
  definition,
  title,
  darkMode = false,
}: MermaidRendererProps) {
  const t = useTranslations('diagram')
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    const signal = { cancelled: false }

    async function render() {
      try {
        // Dynamic import to keep bundle small and avoid SSR issues
        const mermaid = (await import('mermaid')).default
        if (signal.cancelled) return

        // Only re-initialize if theme changed (avoid global config fights)
        const theme = darkMode ? 'dark' : 'default'
        if (lastMermaidTheme !== theme) {
          mermaid.initialize({
            startOnLoad: false,
            theme,
            securityLevel: 'strict',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            themeVariables: darkMode
              ? {
                  primaryColor: '#6366f1',
                  primaryTextColor: '#e5e7eb',
                  primaryBorderColor: '#4f46e5',
                  lineColor: '#9ca3af',
                  secondaryColor: '#1e293b',
                  tertiaryColor: '#0f172a',
                  background: '#111827',
                  mainBkg: '#1e293b',
                  nodeBorder: '#4f46e5',
                  clusterBkg: '#1e293b',
                  clusterBorder: '#374151',
                  titleColor: '#e5e7eb',
                  edgeLabelBackground: '#1e293b',
                }
              : {
                  primaryColor: '#6366f1',
                  primaryTextColor: '#1f2937',
                  primaryBorderColor: '#4f46e5',
                  lineColor: '#6b7280',
                  secondaryColor: '#ede9fe',
                  tertiaryColor: '#f3f4f6',
                },
          })
          lastMermaidTheme = theme
        }

        const { svg } = await mermaid.render(idRef.current, definition)
        if (signal.cancelled) return

        if (containerRef.current) {
          injectSanitizedSvg(containerRef.current, svg)
        }

        setLoading(false)
      } catch (err) {
        if (signal.cancelled) return
        console.error('[MermaidRenderer] Render error:', err)
        setError(t('mermaidError'))
        setLoading(false)
      }
    }

    render()
    return () => { signal.cancelled = true }
  }, [definition, darkMode, t])

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {title && (
        <h3 className="mb-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      )}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 dark:bg-gray-900/80">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('loadingMermaid')}
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex w-full items-center justify-center overflow-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        role="img"
        aria-label={title || 'Diagram'}
      />
    </div>
  )
}
