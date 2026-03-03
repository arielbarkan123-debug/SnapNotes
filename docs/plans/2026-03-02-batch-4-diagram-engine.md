# Batch 4: Hybrid Diagram Rendering Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the diagram engine from TikZ/Recraft-only to a hybrid system that routes diagrams to the best rendering tool: Desmos (math graphs), GeoGebra (geometry), Recharts (statistics), Mermaid.js (flowcharts), with TikZ as fallback.

**Architecture:** Extend `lib/diagram-engine/router.ts` with new routing logic. Add 4 new renderer components. Modify `diagram-schemas.ts` to include engine metadata. Keep existing TikZ/Recraft pipelines as fallbacks.

**Tech Stack:** Next.js 14, Desmos API (CDN), GeoGebra API (CDN), Recharts (npm), Mermaid.js (npm), TypeScript, Tailwind CSS

---

## Context: Existing Architecture

The current diagram engine lives in `lib/diagram-engine/` with these key files:

- **`router.ts`** (216 lines) -- routes questions to 4 pipelines: `recraft`, `tikz`, `e2b-matplotlib`, `e2b-latex` using regex topic rules + fallback keyword scoring
- **`index.ts`** (483 lines) -- main orchestration: cache check -> pipeline run -> QA check -> fallback -> cache store
- **`integration.ts`** -- bridge between engine and NoteSnap frontend, exports `tryEngineDiagram()` and `shouldUseEngine()`
- **`lib/diagram-schemas.ts`** (2,424 lines) -- 102 diagram schemas with `{ type, subject, gradeRange, description, jsonExample }`
- **`components/homework/diagram/DiagramRenderer.tsx`** -- client-side renderer with error boundary
- **`components/homework/diagram/InlineDiagram.tsx`** -- inline diagram display in chat
- **`components/homework/diagram/EngineDiagramImage.tsx`** -- displays engine-generated PNG images

The Pipeline type is currently: `'e2b-latex' | 'e2b-matplotlib' | 'tikz' | 'recraft'`

---

## New Routing Logic

```typescript
// New hybrid pipeline types
type HybridPipeline = Pipeline | 'desmos' | 'geogebra' | 'recharts' | 'mermaid'

const DESMOS_TYPES = [
  'coordinate_plane', 'function_graph', 'linear_equation', 'quadratic_graph',
  'inequality_graph', 'system_of_equations', 'scatter_plot_regression',
  'trigonometric_graph', 'piecewise_function', 'parametric_curve', 'polar_graph'
]

const GEOGEBRA_TYPES = [
  'triangle', 'circle_geometry', 'angle_measurement', 'parallel_lines',
  'polygon', 'transformation', 'congruence', 'similarity',
  'pythagorean_theorem', 'circle_theorems', 'construction'
]

const RECHARTS_TYPES = [
  'box_plot', 'histogram', 'dot_plot', 'bar_chart', 'pie_chart',
  'line_chart', 'stem_leaf_plot', 'frequency_table'
]

const MERMAID_TYPES = [
  'tree_diagram', 'flowchart', 'sequence_diagram', 'factor_tree', 'probability_tree'
]
```

---

## Task 1: Install npm packages

**Files modified:** `package.json`

Run:
```bash
cd /Users/curvalux/NoteSnap && npm install recharts mermaid
```

Note: Desmos and GeoGebra are loaded via CDN `<script>` tags, not npm packages.

**Verify:**
```bash
cat package.json | grep -E "recharts|mermaid"
```

---

## Task 2: Extend Pipeline type

**File:** `/Users/curvalux/NoteSnap/lib/diagram-engine/router.ts`

Add new hybrid pipeline types alongside the existing `Pipeline` type.

**Changes:**

At the top of `router.ts`, update the `Pipeline` type:

```typescript
export type Pipeline = 'e2b-latex' | 'e2b-matplotlib' | 'tikz' | 'recraft';

// New hybrid pipelines for client-side rendering (no server image generation needed)
export type HybridPipeline = Pipeline | 'desmos' | 'geogebra' | 'recharts' | 'mermaid';
```

Add the type mapping arrays after the existing `TOPIC_RULES` array:

```typescript
// --- Hybrid Pipeline Type Mappings ----------------------------------------
// These map diagram schema types to client-side renderers.
// When a question matches one of these types, the hybrid router
// returns a client-side pipeline instead of a server-side one.

export const DESMOS_TYPES = [
  'coordinate_plane', 'function_graph', 'linear_equation', 'quadratic_graph',
  'inequality_graph', 'system_of_equations', 'scatter_plot_regression',
  'trigonometric_graph', 'piecewise_function', 'parametric_curve', 'polar_graph',
] as const;

export const GEOGEBRA_TYPES = [
  'triangle', 'circle_geometry', 'angle_measurement', 'parallel_lines',
  'polygon', 'transformation', 'congruence', 'similarity',
  'pythagorean_theorem', 'circle_theorems', 'construction',
] as const;

export const RECHARTS_TYPES = [
  'box_plot', 'histogram', 'dot_plot', 'bar_chart', 'pie_chart',
  'line_chart', 'stem_leaf_plot', 'frequency_table',
] as const;

export const MERMAID_TYPES = [
  'tree_diagram', 'flowchart', 'sequence_diagram', 'factor_tree', 'probability_tree',
] as const;
```

Add a new export function:

```typescript
/**
 * Given a diagram schema type (e.g., 'coordinate_plane'), determine which
 * hybrid renderer should handle it. Returns null if no hybrid renderer matches
 * (meaning it should use the existing server-side pipelines).
 */
export function getHybridPipeline(diagramType: string): HybridPipeline | null {
  if ((DESMOS_TYPES as readonly string[]).includes(diagramType)) return 'desmos';
  if ((GEOGEBRA_TYPES as readonly string[]).includes(diagramType)) return 'geogebra';
  if ((RECHARTS_TYPES as readonly string[]).includes(diagramType)) return 'recharts';
  if ((MERMAID_TYPES as readonly string[]).includes(diagramType)) return 'mermaid';
  return null;
}
```

Update the `FALLBACKS` map to include hybrid pipelines:

```typescript
const FALLBACKS: Record<Pipeline, Pipeline | null> = {
  'tikz': 'e2b-matplotlib',
  'e2b-latex': 'tikz',
  'e2b-matplotlib': 'tikz',
  'recraft': 'tikz',
};

// Hybrid pipeline fallbacks -- fall back to server-side generation
export const HYBRID_FALLBACKS: Record<string, Pipeline> = {
  'desmos': 'e2b-matplotlib',    // Desmos fails -> matplotlib can graph
  'geogebra': 'tikz',            // GeoGebra fails -> TikZ can do geometry
  'recharts': 'e2b-matplotlib',  // Recharts fails -> matplotlib can chart
  'mermaid': 'tikz',             // Mermaid fails -> TikZ can do flowcharts
};
```

**Verify:** `npx tsc --noEmit`

---

## Task 3: Create DesmosRenderer component

**New file:** `/Users/curvalux/NoteSnap/components/diagrams/DesmosRenderer.tsx`

This component embeds the Desmos graphing calculator API, loads the CDN script once, and accepts expressions to plot.

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// --- Types ---

export interface DesmosExpression {
  id?: string
  latex: string
  color?: string
  lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED'
  lineWidth?: number
  hidden?: boolean
  label?: string
  showLabel?: boolean
}

export interface DesmosRendererProps {
  expressions: DesmosExpression[]
  xRange?: [number, number]
  yRange?: [number, number]
  showGrid?: boolean
  showAxisNumbers?: boolean
  title?: string
  height?: number
  interactive?: boolean
  darkMode?: boolean
}

// --- CDN Script Loader ---

let scriptLoaded = false
let scriptLoading = false
const loadCallbacks: Array<() => void> = []

function loadDesmosScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()

  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve)
      return
    }
    scriptLoading = true
    const script = document.createElement('script')
    script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      resolve()
      loadCallbacks.forEach((cb) => cb())
      loadCallbacks.length = 0
    }
    script.onerror = () => {
      scriptLoading = false
      console.error('[DesmosRenderer] Failed to load Desmos API script')
    }
    document.head.appendChild(script)
  })
}

// --- Desmos API types ---

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => DesmosCalculator
    }
  }
}

interface DesmosCalculator {
  setExpression: (expr: Record<string, unknown>) => void
  setMathBounds: (bounds: { left: number; right: number; top: number; bottom: number }) => void
  destroy: () => void
  resize: () => void
  updateSettings: (settings: Record<string, unknown>) => void
}

// --- Component ---

export default function DesmosRenderer({
  expressions,
  xRange = [-10, 10],
  yRange = [-10, 10],
  showGrid = true,
  showAxisNumbers = true,
  title,
  height = 400,
  interactive = true,
  darkMode = false,
}: DesmosRendererProps) {
  const t = useTranslations('diagram')
  const containerRef = useRef<HTMLDivElement>(null)
  const calculatorRef = useRef<DesmosCalculator | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initCalculator = useCallback(async () => {
    if (!containerRef.current) return
    try {
      await loadDesmosScript()
      if (!window.Desmos) {
        setError('Desmos API not available')
        return
      }
      if (calculatorRef.current) {
        calculatorRef.current.destroy()
      }
      const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
        expressionsCollapsed: true,
        settingsMenu: false,
        zoomButtons: interactive,
        expressions: false,
        lockViewport: !interactive,
        border: false,
        keypad: false,
        showGrid,
        xAxisNumbers: showAxisNumbers,
        yAxisNumbers: showAxisNumbers,
        trace: interactive,
        ...(darkMode ? { backgroundColor: '#1f2937', textColor: '#e5e7eb' } : {}),
      })
      calculator.setMathBounds({
        left: xRange[0], right: xRange[1],
        bottom: yRange[0], top: yRange[1],
      })
      expressions.forEach((expr, index) => {
        calculator.setExpression({
          id: expr.id || `expr-${index}`,
          latex: expr.latex,
          color: expr.color || '#6366f1',
          lineStyle: expr.lineStyle || 'SOLID',
          lineWidth: expr.lineWidth || 2.5,
          hidden: expr.hidden || false,
          label: expr.label,
          showLabel: expr.showLabel || false,
        })
      })
      calculatorRef.current = calculator
      setIsLoading(false)
    } catch (err) {
      console.error('[DesmosRenderer] Init failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize Desmos')
      setIsLoading(false)
    }
  }, [expressions, xRange, yRange, showGrid, showAxisNumbers, interactive, darkMode])

  useEffect(() => {
    initCalculator()
    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy()
        calculatorRef.current = null
      }
    }
  }, [initCalculator])

  useEffect(() => {
    const handleResize = () => { calculatorRef.current?.resize() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4" style={{ height }}>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {title && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">{title}</p>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('loadingDesmos')}</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ height }}
      />
    </div>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 4: Create GeoGebraRenderer component

**New file:** `/Users/curvalux/NoteSnap/components/diagrams/GeoGebraRenderer.tsx`

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// --- Types ---

export interface GeoGebraCommand {
  command: string
  label?: string
  showLabel?: boolean
  color?: string
}

export interface GeoGebraRendererProps {
  commands: GeoGebraCommand[]
  title?: string
  height?: number
  interactive?: boolean
  showToolbar?: boolean
  showInputBar?: boolean
  showMenuBar?: boolean
  enableRightClick?: boolean
  xRange?: [number, number]
  yRange?: [number, number]
  showGrid?: boolean
  showAxes?: boolean
}

// --- CDN Loader ---

let ggbScriptLoaded = false
let ggbScriptLoading = false
const ggbCallbacks: Array<() => void> = []

function loadGeoGebraScript(): Promise<void> {
  if (ggbScriptLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    if (ggbScriptLoading) {
      ggbCallbacks.push(resolve)
      return
    }
    ggbScriptLoading = true
    const script = document.createElement('script')
    script.src = 'https://www.geogebra.org/apps/deployggb.js'
    script.async = true
    script.onload = () => {
      ggbScriptLoaded = true
      ggbScriptLoading = false
      resolve()
      ggbCallbacks.forEach((cb) => cb())
      ggbCallbacks.length = 0
    }
    script.onerror = () => {
      ggbScriptLoading = false
      console.error('[GeoGebraRenderer] Failed to load GeoGebra script')
    }
    document.head.appendChild(script)
  })
}

// --- GeoGebra API types ---

declare global {
  interface Window {
    GGBApplet?: new (params: Record<string, unknown>, version?: string) => GGBAppletInstance
  }
}

interface GGBAppletInstance {
  inject: (containerId: string) => void
}

interface GGBApi {
  evalCommand: (cmd: string) => void
  setColor: (label: string, r: number, g: number, b: number) => void
  setLabelVisible: (label: string, visible: boolean) => void
  setCoordSystem: (xmin: number, xmax: number, ymin: number, ymax: number) => void
  showGrid: (show: boolean) => void
  setAxisVisible: (axis: number, visible: boolean) => void
}

// --- Component ---

export default function GeoGebraRenderer({
  commands,
  title,
  height = 400,
  interactive = true,
  showToolbar = false,
  showInputBar = false,
  showMenuBar = false,
  enableRightClick = false,
  xRange,
  yRange,
  showGrid = true,
  showAxes = true,
}: GeoGebraRendererProps) {
  const t = useTranslations('diagram')
  const containerId = useRef(`ggb-${Math.random().toString(36).slice(2, 9)}`)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<GGBApi | null>(null)

  const initGeoGebra = useCallback(async () => {
    try {
      await loadGeoGebraScript()
      if (!window.GGBApplet) {
        setError('GeoGebra API not available')
        return
      }
      const params: Record<string, unknown> = {
        appName: 'geometry',
        width: 700,
        height,
        showToolBar: showToolbar,
        showAlgebraInput: showInputBar,
        showMenuBar,
        enableRightClick,
        enableShiftDragZoom: interactive,
        showResetIcon: false,
        enableLabelDrags: false,
        showZoomButtons: interactive,
        capturingThreshold: null,
        showFullscreenButton: false,
        showSuggestionButtons: false,
        appletOnLoad: (api: GGBApi) => {
          apiRef.current = api
          if (xRange && yRange) {
            api.setCoordSystem(xRange[0], xRange[1], yRange[0], yRange[1])
          }
          api.showGrid(showGrid)
          api.setAxisVisible(0, showAxes)
          api.setAxisVisible(1, showAxes)
          commands.forEach((cmd) => {
            api.evalCommand(cmd.command)
            if (cmd.label && cmd.color) {
              const hex = cmd.color.replace('#', '')
              const r = parseInt(hex.substring(0, 2), 16)
              const g = parseInt(hex.substring(2, 4), 16)
              const b = parseInt(hex.substring(4, 6), 16)
              api.setColor(cmd.label, r, g, b)
            }
            if (cmd.label && cmd.showLabel !== undefined) {
              api.setLabelVisible(cmd.label, cmd.showLabel)
            }
          })
          setIsLoading(false)
        },
      }
      const applet = new window.GGBApplet(params, '5.0')
      applet.inject(containerId.current)
    } catch (err) {
      console.error('[GeoGebraRenderer] Init failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize GeoGebra')
      setIsLoading(false)
    }
  }, [commands, height, showToolbar, showInputBar, showMenuBar, enableRightClick, interactive, xRange, yRange, showGrid, showAxes])

  useEffect(() => {
    initGeoGebra()
  }, [initGeoGebra])

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4" style={{ height }}>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {title && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">{title}</p>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('loadingGeoGebra')}</span>
          </div>
        </div>
      )}
      <div
        id={containerId.current}
        className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ height }}
      />
    </div>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 5: Create RechartsRenderer component

**New file:** `/Users/curvalux/NoteSnap/components/diagrams/RechartsRenderer.tsx`

This component renders bar charts, histograms, pie charts, line charts, scatter plots, box plots, and dot plots using Recharts (bar/pie/line/scatter) and custom SVG (box plot/dot plot).

```typescript
'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  ScatterChart, Scatter,
} from 'recharts'

// --- Types ---

export type ChartType = 'bar' | 'histogram' | 'pie' | 'line' | 'scatter' | 'box_plot' | 'dot_plot'

export interface ChartDataPoint {
  name: string
  value: number
  value2?: number
  color?: string
}

export interface BoxPlotData {
  name: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
}

export interface RechartsRendererProps {
  chartType: ChartType
  data?: ChartDataPoint[]
  boxPlotData?: BoxPlotData[]
  title?: string
  xLabel?: string
  yLabel?: string
  colors?: string[]
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  darkMode?: boolean
}

const DEFAULT_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#64748b',
]

// --- Custom Box Plot (SVG) ---

function BoxPlotChart({
  data, height = 300, xLabel, yLabel, darkMode,
}: {
  data: BoxPlotData[]; height: number; xLabel?: string; yLabel?: string; darkMode?: boolean
}) {
  const textColor = darkMode ? '#9ca3af' : '#6b7280'
  const margin = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartWidth = 600
  const innerWidth = chartWidth - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const allValues = data.flatMap(d => [d.min, d.max, ...(d.outliers || [])])
  const yMin = Math.min(...allValues) * 0.9
  const yMax = Math.max(...allValues) * 1.1
  const yScale = (val: number) => innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight
  const boxWidth = Math.min(60, innerWidth / data.length * 0.6)

  return (
    <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full" style={{ maxHeight: height }}>
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {Array.from({ length: 5 }, (_, i) => {
          const val = yMin + (yMax - yMin) * (i / 4)
          const y = yScale(val)
          return (
            <g key={`grid-${i}`}>
              <line x1={0} y1={y} x2={innerWidth} y2={y} stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3,3" />
              <text x={-8} y={y + 4} textAnchor="end" fill={textColor} fontSize={11}>{Math.round(val * 10) / 10}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const x = (i + 0.5) * (innerWidth / data.length)
          const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length]
          return (
            <g key={d.name}>
              <line x1={x} y1={yScale(d.min)} x2={x} y2={yScale(d.max)} stroke={color} strokeWidth={1.5} />
              <line x1={x - boxWidth / 4} y1={yScale(d.min)} x2={x + boxWidth / 4} y2={yScale(d.min)} stroke={color} strokeWidth={1.5} />
              <line x1={x - boxWidth / 4} y1={yScale(d.max)} x2={x + boxWidth / 4} y2={yScale(d.max)} stroke={color} strokeWidth={1.5} />
              <rect x={x - boxWidth / 2} y={yScale(d.q3)} width={boxWidth} height={yScale(d.q1) - yScale(d.q3)} fill={`${color}33`} stroke={color} strokeWidth={1.5} rx={3} />
              <line x1={x - boxWidth / 2} y1={yScale(d.median)} x2={x + boxWidth / 2} y2={yScale(d.median)} stroke={color} strokeWidth={2.5} />
              {(d.outliers || []).map((o, oi) => (
                <circle key={oi} cx={x} cy={yScale(o)} r={3} fill={color} opacity={0.7} />
              ))}
              <text x={x} y={innerHeight + 20} textAnchor="middle" fill={textColor} fontSize={12}>{d.name}</text>
            </g>
          )
        })}
        {xLabel && <text x={innerWidth / 2} y={innerHeight + 35} textAnchor="middle" fill={textColor} fontSize={12}>{xLabel}</text>}
        {yLabel && <text transform={`rotate(-90) translate(${-innerHeight / 2}, ${-35})`} textAnchor="middle" fill={textColor} fontSize={12}>{yLabel}</text>}
      </g>
    </svg>
  )
}

// --- Main Component ---

export default function RechartsRenderer({
  chartType,
  data = [],
  boxPlotData,
  title,
  xLabel,
  yLabel,
  colors = DEFAULT_COLORS,
  height = 350,
  showLegend = true,
  showGrid = true,
  darkMode = false,
}: RechartsRendererProps) {
  const chartColors = useMemo(() => data.map((d, i) => d.color || colors[i % colors.length]), [data, colors])
  const textColor = darkMode ? '#9ca3af' : '#6b7280'
  const gridColor = darkMode ? '#374151' : '#e5e7eb'

  return (
    <div className="relative">
      {title && <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">{title}</p>}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">

        {chartType === 'box_plot' && boxPlotData && (
          <BoxPlotChart data={boxPlotData} height={height} xLabel={xLabel} yLabel={yLabel} darkMode={darkMode} />
        )}

        {(chartType === 'bar' || chartType === 'histogram') && (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 30 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, fill: textColor } : undefined} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} />
              {showLegend && <Legend />}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={height / 3} dataKey="value">
                {data.map((_entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 30 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, fill: textColor } : undefined} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} />
              {showLegend && <Legend />}
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} dot={{ r: 4, fill: colors[0] }} />
              {data.some((d) => d.value2 !== undefined) && (
                <Line type="monotone" dataKey="value2" stroke={colors[1]} strokeWidth={2.5} dot={{ r: 4, fill: colors[1] }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'scatter' && (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 5, right: 20, left: 20, bottom: 30 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis type="number" dataKey="value" name={xLabel || 'x'} tick={{ fill: textColor, fontSize: 12 }} />
              <YAxis type="number" dataKey="value2" name={yLabel || 'y'} tick={{ fill: textColor, fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {chartType === 'dot_plot' && (
          <svg viewBox="0 0 500 200" className="w-full max-w-lg mx-auto">
            {data.map((d, i) => {
              const dotCount = d.value
              return (
                <g key={d.name}>
                  <text x={50} y={30 + i * 30} textAnchor="end" fill={textColor} fontSize={12}>{d.name}</text>
                  {Array.from({ length: dotCount }, (_, j) => (
                    <circle key={j} cx={70 + j * 20} cy={25 + i * 30} r={6} fill={colors[i % colors.length]} opacity={0.8} />
                  ))}
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 6: Create MermaidRenderer component

**New file:** `/Users/curvalux/NoteSnap/components/diagrams/MermaidRenderer.tsx`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import DOMPurify from 'dompurify'

// --- Types ---

export interface MermaidRendererProps {
  definition: string
  title?: string
  height?: number
  darkMode?: boolean
}

// --- Component ---

export default function MermaidRenderer({
  definition,
  title,
  height = 400,
  darkMode = false,
}: MermaidRendererProps) {
  const t = useTranslations('diagram')
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    let cancelled = false

    async function renderMermaid() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: darkMode ? 'dark' : 'default',
          themeVariables: darkMode ? {
            primaryColor: '#6366f1',
            primaryTextColor: '#e5e7eb',
            primaryBorderColor: '#4f46e5',
            lineColor: '#6b7280',
            secondaryColor: '#1f2937',
            tertiaryColor: '#111827',
          } : {
            primaryColor: '#6366f1',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#4f46e5',
            lineColor: '#6b7280',
          },
          flowchart: { htmlLabels: true, curve: 'basis' },
          securityLevel: 'strict',
        })

        const { svg } = await mermaid.render(idRef.current, definition)
        if (!cancelled) {
          // Sanitize SVG output for safety
          const sanitized = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['foreignObject'],
          })
          setSvgContent(sanitized)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[MermaidRenderer] Render failed:', err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setIsLoading(false)
        }
      }
    }

    renderMermaid()
    return () => { cancelled = true }
  }, [definition, darkMode])

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4" style={{ minHeight: 200 }}>
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">{t('mermaidError')}</p>
          <p className="text-xs text-red-500 dark:text-red-500 font-mono">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {title && <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">{title}</p>}
      {isLoading && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl" style={{ height }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('loadingMermaid')}</span>
          </div>
        </div>
      )}
      {svgContent && (
        <div
          ref={containerRef}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center overflow-auto"
          style={{ maxHeight: height }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  )
}
```

Note: We use DOMPurify (already in `package.json`) to sanitize the SVG output from Mermaid before inserting it, even though Mermaid uses `securityLevel: 'strict'` internally.

**Verify:** `npx tsc --noEmit`

---

## Task 7: Create DiagramContainer routing component

**New file:** `/Users/curvalux/NoteSnap/components/diagrams/DiagramContainer.tsx`

This is the unified container that routes diagram data to the correct renderer based on the engine metadata.

```typescript
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { HybridPipeline } from '@/lib/diagram-engine/router'
import type { DesmosRendererProps } from './DesmosRenderer'
import type { GeoGebraRendererProps } from './GeoGebraRenderer'
import type { RechartsRendererProps } from './RechartsRenderer'
import type { MermaidRendererProps } from './MermaidRenderer'

// Lazy-load renderers -- these are heavy (Desmos CDN, GeoGebra CDN, Recharts, Mermaid)
const DesmosRenderer = dynamic(() => import('./DesmosRenderer'), {
  ssr: false,
  loading: () => <RendererLoadingFallback name="Desmos" />,
})
const GeoGebraRenderer = dynamic(() => import('./GeoGebraRenderer'), {
  ssr: false,
  loading: () => <RendererLoadingFallback name="GeoGebra" />,
})
const RechartsRenderer = dynamic(() => import('./RechartsRenderer'), {
  ssr: false,
  loading: () => <RendererLoadingFallback name="Charts" />,
})
const MermaidRenderer = dynamic(() => import('./MermaidRenderer'), {
  ssr: false,
  loading: () => <RendererLoadingFallback name="Diagram" />,
})

// --- Types ---

export interface DiagramContainerProps {
  engine: HybridPipeline
  desmosProps?: DesmosRendererProps
  geogebraProps?: GeoGebraRendererProps
  rechartsProps?: RechartsRendererProps
  mermaidProps?: MermaidRendererProps
  fallbackImageUrl?: string
  title?: string
  darkMode?: boolean
}

function RendererLoadingFallback({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl h-[300px]">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading {name}...</span>
      </div>
    </div>
  )
}

// --- Component ---

export default function DiagramContainer({
  engine,
  desmosProps,
  geogebraProps,
  rechartsProps,
  mermaidProps,
  fallbackImageUrl,
  title,
  darkMode = false,
}: DiagramContainerProps) {
  const renderedComponent = useMemo(() => {
    switch (engine) {
      case 'desmos':
        if (!desmosProps) return null
        return <DesmosRenderer {...desmosProps} darkMode={darkMode} />
      case 'geogebra':
        if (!geogebraProps) return null
        return <GeoGebraRenderer {...geogebraProps} />
      case 'recharts':
        if (!rechartsProps) return null
        return <RechartsRenderer {...rechartsProps} darkMode={darkMode} />
      case 'mermaid':
        if (!mermaidProps) return null
        return <MermaidRenderer {...mermaidProps} darkMode={darkMode} />
      default:
        if (fallbackImageUrl) {
          return (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fallbackImageUrl} alt={title || 'Diagram'} className="w-full h-auto" />
            </div>
          )
        }
        return null
    }
  }, [engine, desmosProps, geogebraProps, rechartsProps, mermaidProps, fallbackImageUrl, darkMode, title])

  if (!renderedComponent) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">No diagram data available for engine: {engine}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{title}</p>}
      {renderedComponent}
    </div>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 8: Create Desmos adapter module

**New file:** `/Users/curvalux/NoteSnap/lib/diagram-engine/desmos-adapter.ts`

Converts AI-generated diagram JSON (from `diagram-schemas.ts` format) to Desmos expressions. See full code in the implementation -- handles `coordinate_plane`, `function_graph`, `linear_equation`, `quadratic_graph`, `trigonometric_graph`, `piecewise_function`, `parametric_curve`, `polar_graph`, `scatter_plot_regression`, `system_of_equations`, and `inequality_graph`.

Key functions:
- `coordinatePlaneToDesmos(data)` -- converts curves/points/lines to expressions
- `systemOfEquationsToDesmos(data)` -- converts equation array + solution point
- `inequalityToDesmos(data)` -- converts inequality expressions
- `adaptToDesmosProps(diagramType, data)` -- generic dispatcher

**Verify:** `npx tsc --noEmit`

---

## Task 9: Create GeoGebra adapter module

**New file:** `/Users/curvalux/NoteSnap/lib/diagram-engine/geogebra-adapter.ts`

Converts AI-generated diagram JSON to GeoGebra commands. Handles `triangle`, `circle_geometry`, `polygon`, `transformation`, `congruence`, `similarity`, `pythagorean_theorem`, `circle_theorems`, `construction`, `angle_measurement`, `parallel_lines`.

Key functions:
- `triangleToGeoGebra(data)` -- creates vertices, polygon, optional angles/side lengths
- `circleToGeoGebra(data)` -- creates center, circle, additional points, lines
- `polygonToGeoGebra(data)` -- generic polygon with optional angles
- `transformationToGeoGebra(data)` -- reflection/rotation/translation/dilation
- `adaptToGeoGebraProps(diagramType, data)` -- generic dispatcher

**Verify:** `npx tsc --noEmit`

---

## Task 10: Update diagram-schemas.ts with engine metadata

**File:** `/Users/curvalux/NoteSnap/lib/diagram-schemas.ts`

Add an `engine` field to the `DiagramSchema` interface:

```typescript
export interface DiagramSchema {
  type: string
  subject: string
  gradeRange: string
  description: string
  jsonExample: string
  /** Which rendering engine is preferred for this schema type */
  engine?: 'desmos' | 'geogebra' | 'recharts' | 'mermaid' | 'svg' | 'tikz' | 'recraft'
}
```

Then add `engine` to every schema that maps to a hybrid renderer:

| engine | Schema types to tag |
|--------|---------------------|
| `desmos` | coordinate_plane, function_graph, linear_equation, quadratic_graph, inequality_graph, system_of_equations, scatter_plot_regression, trigonometric_graph, piecewise_function, parametric_curve, polar_graph |
| `geogebra` | triangle, circle_geometry, angle_measurement, parallel_lines, polygon, transformation, congruence, similarity, pythagorean_theorem, circle_theorems, construction |
| `recharts` | box_plot, histogram, dot_plot, bar_chart, pie_chart, line_chart, stem_leaf_plot, frequency_table |
| `mermaid` | tree_diagram, flowchart, sequence_diagram, factor_tree, probability_tree |
| `svg` | All remaining React SVG components (number_line, long_division, fraction_circle, bar_model, etc.) |

Leave schemas without a matching engine as `engine: undefined` (they'll use existing server-side pipeline routing).

**Verify:** `npx tsc --noEmit`

---

## Task 11: Update components/diagrams/index.ts barrel export

**File:** `/Users/curvalux/NoteSnap/components/diagrams/index.ts`

Add exports for all new components:

```typescript
export { default as DiagramExplanationPanel } from './DiagramExplanationPanel'
export { default as FullScreenDiagramView } from './FullScreenDiagramView'

// Hybrid renderers (Batch 4)
export { default as DesmosRenderer } from './DesmosRenderer'
export { default as GeoGebraRenderer } from './GeoGebraRenderer'
export { default as RechartsRenderer } from './RechartsRenderer'
export { default as MermaidRenderer } from './MermaidRenderer'
export { default as DiagramContainer } from './DiagramContainer'
```

**Verify:** `npx tsc --noEmit`

---

## Task 12: Add i18n keys for diagram renderers

**File:** `/Users/curvalux/NoteSnap/messages/en/diagram.json`

Merge these keys into the existing file:

```json
{
  "loadingDesmos": "Loading graph...",
  "loadingGeoGebra": "Loading geometry tool...",
  "loadingMermaid": "Loading diagram...",
  "mermaidError": "Failed to render diagram",
  "dotPlotLabel": "Dot Plot",
  "hybridEngine": "Interactive",
  "switchToImage": "Switch to image",
  "switchToInteractive": "Switch to interactive"
}
```

**File:** `/Users/curvalux/NoteSnap/messages/he/diagram.json`

Merge these keys into the existing file:

```json
{
  "loadingDesmos": "...טוען גרף",
  "loadingGeoGebra": "...טוען כלי גיאומטריה",
  "loadingMermaid": "...טוען תרשים",
  "mermaidError": "נכשל בטעינת התרשים",
  "dotPlotLabel": "דיאגרמת נקודות",
  "hybridEngine": "אינטראקטיבי",
  "switchToImage": "עבור לתמונה",
  "switchToInteractive": "עבור לאינטראקטיבי"
}
```

**Verify:** Check that both files are valid JSON.

---

## Task 13: Type check + build verification

```bash
cd /Users/curvalux/NoteSnap && npx tsc --noEmit
```

Fix any type errors. Common issues:
1. `HybridPipeline` imported in DiagramContainer but router.ts may not export it yet -- ensure it is exported
2. Recharts ships its own TypeScript types (no `@types/recharts` needed)
3. Mermaid ships its own TypeScript types

After type check passes:

```bash
cd /Users/curvalux/NoteSnap && npm run build
```

---

## Task 14: Commit

```bash
cd /Users/curvalux/NoteSnap && git add -A && git commit -m "feat: hybrid diagram engine -- Desmos, GeoGebra, Recharts, Mermaid renderers

- Add DesmosRenderer with CDN script loading for math graphs
- Add GeoGebraRenderer with CDN script loading for geometry
- Add RechartsRenderer for statistical charts (bar, pie, line, scatter, box plot)
- Add MermaidRenderer for flowcharts and tree diagrams (DOMPurify sanitized)
- Add DiagramContainer unified routing component
- Add desmos-adapter.ts and geogebra-adapter.ts conversion modules
- Extend Pipeline type with HybridPipeline variants
- Add engine metadata to DiagramSchema interface
- Add i18n keys for EN and HE"
```

---

## Summary

| # | Task | Files | Est. |
|---|------|-------|------|
| 1 | Install recharts + mermaid | `package.json` | 2 min |
| 2 | Extend Pipeline type + routing | `lib/diagram-engine/router.ts` | 4 min |
| 3 | DesmosRenderer | `components/diagrams/DesmosRenderer.tsx` (NEW) | 5 min |
| 4 | GeoGebraRenderer | `components/diagrams/GeoGebraRenderer.tsx` (NEW) | 5 min |
| 5 | RechartsRenderer | `components/diagrams/RechartsRenderer.tsx` (NEW) | 5 min |
| 6 | MermaidRenderer | `components/diagrams/MermaidRenderer.tsx` (NEW) | 4 min |
| 7 | DiagramContainer | `components/diagrams/DiagramContainer.tsx` (NEW) | 4 min |
| 8 | Desmos adapter | `lib/diagram-engine/desmos-adapter.ts` (NEW) | 4 min |
| 9 | GeoGebra adapter | `lib/diagram-engine/geogebra-adapter.ts` (NEW) | 4 min |
| 10 | Schema engine metadata | `lib/diagram-schemas.ts` | 5 min |
| 11 | Barrel exports | `components/diagrams/index.ts` | 1 min |
| 12 | i18n keys | `messages/{en,he}/diagram.json` | 2 min |
| 13 | Type check + build | -- | 3 min |
| 14 | Commit | -- | 1 min |
| **Total** | | **10 new + 3 modified** | **~49 min** |
