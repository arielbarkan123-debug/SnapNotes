'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DesmosExpression {
  id: string
  latex: string
  color?: string
  lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED'
  lineWidth?: number
  pointStyle?: 'POINT' | 'OPEN' | 'CROSS'
  hidden?: boolean
  label?: string
  showLabel?: boolean
}

export interface DesmosRendererProps {
  expressions: DesmosExpression[]
  xAxisLabel?: string
  yAxisLabel?: string
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  showGrid?: boolean
  title?: string
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Desmos Calculator API subset
// ---------------------------------------------------------------------------

interface DesmosCalculator {
  setExpression: (expr: {
    id: string
    latex: string
    color?: string
    lineStyle?: string
    lineWidth?: number
    pointStyle?: string
    hidden?: boolean
    label?: string
    showLabel?: boolean
  }) => void
  updateSettings: (settings: Record<string, unknown>) => void
  destroy: () => void
}

interface DesmosAPI {
  GraphingCalculator: (
    el: HTMLElement,
    options?: Record<string, unknown>
  ) => DesmosCalculator
}

// ---------------------------------------------------------------------------
// CDN Script Loader (singleton)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Desmos?: DesmosAPI
  }
}

let desmosLoadPromise: Promise<void> | null = null

function loadDesmosScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Desmos) {
    return Promise.resolve()
  }
  if (desmosLoadPromise) return desmosLoadPromise

  desmosLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Desmos API'))
    document.head.appendChild(script)
  })

  return desmosLoadPromise
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DesmosRenderer({
  expressions,
  xAxisLabel,
  yAxisLabel,
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  showGrid = true,
  title,
  darkMode = false,
}: DesmosRendererProps) {
  const t = useTranslations('diagram')
  const containerRef = useRef<HTMLDivElement>(null)
  const calculatorRef = useRef<DesmosCalculator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initCalculator = useCallback(() => {
    if (!containerRef.current || !window.Desmos) return

    // Destroy previous instance
    if (calculatorRef.current) {
      calculatorRef.current.destroy()
    }

    const calc = window.Desmos.GraphingCalculator(containerRef.current, {
      expressionsCollapsed: true,
      settingsMenu: false,
      zoomButtons: true,
      lockViewport: false,
      border: false,
      keypad: false,
      expressionsTopbar: false,
      backgroundColor: darkMode ? '#1a1a2e' : undefined,
    })

    calc.updateSettings({
      xAxisLabel: xAxisLabel || '',
      yAxisLabel: yAxisLabel || '',
      showGrid,
    })

    // Set viewport
    calc.updateSettings({
      xAxisMinorSubdivisions: 0,
      yAxisMinorSubdivisions: 0,
    })

    // Set bounds via a bounds expression
    calc.setExpression({
      id: '__viewport',
      latex: ``,
      hidden: true,
    })

    // Apply viewport by updating graph settings
    const viewportSettings: Record<string, unknown> = {}
    if (xMin !== undefined) viewportSettings['viewport.xmin'] = xMin
    if (xMax !== undefined) viewportSettings['viewport.xmax'] = xMax
    if (yMin !== undefined) viewportSettings['viewport.ymin'] = yMin
    if (yMax !== undefined) viewportSettings['viewport.ymax'] = yMax

    // Desmos uses updateSettings for viewport
    calc.updateSettings(viewportSettings)

    // Add each expression
    for (const expr of expressions) {
      calc.setExpression({
        id: expr.id,
        latex: expr.latex,
        color: expr.color || '#6366f1',
        lineStyle: expr.lineStyle,
        lineWidth: expr.lineWidth,
        pointStyle: expr.pointStyle,
        hidden: expr.hidden,
        label: expr.label,
        showLabel: expr.showLabel,
      })
    }

    calculatorRef.current = calc
    setLoading(false)
  }, [expressions, xAxisLabel, yAxisLabel, xMin, xMax, yMin, yMax, showGrid, darkMode])

  // Load Desmos and init
  useEffect(() => {
    let cancelled = false

    loadDesmosScript()
      .then(() => {
        if (!cancelled) initCalculator()
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (calculatorRef.current) {
        calculatorRef.current.destroy()
        calculatorRef.current = null
      }
    }
  }, [initCalculator])

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      // Desmos handles resize internally once mounted
    })
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

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
            {t('loadingDesmos')}
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-[400px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        role="img"
        aria-label={title || 'Desmos graph'}
      />
    </div>
  )
}
