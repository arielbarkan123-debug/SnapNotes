'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoGebraCommand {
  command: string
  label?: string
  color?: string
  showLabel?: boolean
}

export interface GeoGebraRendererProps {
  commands: GeoGebraCommand[]
  showGrid?: boolean
  showAxes?: boolean
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  title?: string
  darkMode?: boolean
  locale?: string
}

// ---------------------------------------------------------------------------
// GeoGebra API subset
// ---------------------------------------------------------------------------

interface GGBApi {
  evalCommand: (cmd: string) => boolean
  setColor: (objName: string, r: number, g: number, b: number) => void
  setLabelVisible: (objName: string, visible: boolean) => void
  setCoordSystem: (xMin: number, xMax: number, yMin: number, yMax: number) => void
  showGrid: (visible: boolean) => void
  setAxisVisible: (axis: number, visible: boolean) => void
}

interface GGBAppletConstructor {
  new (params: Record<string, unknown>, replaceElement: boolean): {
    inject: (containerId: string) => void
  }
}

declare global {
  interface Window {
    GGBApplet?: GGBAppletConstructor
    // GeoGebra injects api callbacks globally per container id
    [key: string]: unknown
  }
}

// ---------------------------------------------------------------------------
// CDN Script Loader (singleton)
// ---------------------------------------------------------------------------

let geogebraLoadPromise: Promise<void> | null = null

function loadGeoGebraScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.GGBApplet) {
    return Promise.resolve()
  }
  if (geogebraLoadPromise) return geogebraLoadPromise

  geogebraLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://www.geogebra.org/apps/deployggb.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      geogebraLoadPromise = null  // allow retry on next mount
      reject(new Error('Failed to load GeoGebra API'))
    }
    document.head.appendChild(script)
  })

  return geogebraLoadPromise
}

// ---------------------------------------------------------------------------
// Hex color to RGB helper
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0
  return [r, g, b]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeoGebraRenderer({
  commands,
  showGrid = true,
  showAxes = true,
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  title,
  darkMode = false,
  locale = 'en',
}: GeoGebraRendererProps) {
  const t = useTranslations('diagram')
  const containerIdRef = useRef<string>(`ggb_${Math.random().toString(36).slice(2, 10)}`)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<GGBApi | null>(null)

  const initApplet = useCallback(() => {
    if (!window.GGBApplet) return

    const containerId = containerIdRef.current

    // Define the appletOnLoad callback
    const callbackName = `${containerId}_onLoad`
    window[callbackName] = (api: GGBApi) => {
      apiRef.current = api

      // Configure viewport
      api.setCoordSystem(xMin, xMax, yMin, yMax)
      api.showGrid(showGrid)
      api.setAxisVisible(0, showAxes) // x-axis
      api.setAxisVisible(1, showAxes) // y-axis

      // Execute commands
      for (const cmd of commands) {
        api.evalCommand(cmd.command)

        if (cmd.label && cmd.color) {
          const [r, g, b] = hexToRgb(cmd.color)
          api.setColor(cmd.label, r, g, b)
        }

        if (cmd.label && cmd.showLabel !== undefined) {
          api.setLabelVisible(cmd.label, cmd.showLabel)
        }
      }

      setLoading(false)
    }

    const params: Record<string, unknown> = {
      appName: 'geometry',
      width: 600,
      height: 400,
      showToolBar: false,
      showAlgebraInput: false,
      showMenuBar: false,
      enableRightClick: false,
      enableShiftDragZoom: true,
      showResetIcon: false,
      language: locale || 'en',
      borderColor: darkMode ? '#374151' : '#e5e7eb',
      appletOnLoad: (api: GGBApi) => {
        const fn = window[callbackName] as ((api: GGBApi) => void) | undefined
        if (fn) fn(api)
      },
    }

    const applet = new window.GGBApplet(params, true)
    applet.inject(containerId)
  }, [commands, showGrid, showAxes, xMin, xMax, yMin, yMax, darkMode, locale])

  useEffect(() => {
    let cancelled = false

    loadGeoGebraScript()
      .then(() => {
        if (!cancelled) initApplet()
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    const capturedContainerId = containerIdRef.current
    return () => {
      cancelled = true
      // Clean up global callback
      const callbackName = `${capturedContainerId}_onLoad`
      delete window[callbackName]
      // Remove injected GeoGebra iframe to prevent stacking on re-render
      const container = document.getElementById(capturedContainerId)
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
      }
    }
  }, [initApplet])

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
            {t('loadingGeoGebra')}
          </div>
        </div>
      )}
      <div
        id={containerIdRef.current}
        className="mx-auto h-[400px] w-full max-w-[600px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        role="img"
        aria-label={title || 'GeoGebra geometry'}
      />
    </div>
  )
}
